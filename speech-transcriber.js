// Add at the very top of speech-transcriber.js
console.log('Speech Transcriber JS loaded successfully!');

// speech-transcriber.js
class MicrosoftSpeechTranscriber {
    constructor() {
        this.recognizer = null;
        this.isListening = false;
        this.isLoggedIn = false;
        this.currentUser = null;
        
        // Hardcoded Azure API Configuration
        this.azureConfig = {
                subscriptionKey: CONFIG.AZURE_SUBSCRIPTION_KEY,
                serviceRegion: CONFIG.AZURE_SERVICE_REGION,
                useCustomModel: false,
                customEndpointId: CONFIG.AZURE_CUSTOM_ENDPOINT_ID
        };
        
        // User credentials
        this.validUsers = {
            "fgsuser": "fgs2025",
            "admin": "admin123",
            "user": "password123"
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkLoginStatus();
        this.loadCustomModelPreference();
    }
    
    initializeElements() {
        // DOM elements
        this.loginModal = document.getElementById('loginModal');
        this.appContainer = document.getElementById('appContainer');
        this.userInfo = document.getElementById('userInfo');
        this.userDisplayName = document.getElementById('userDisplayName');
        this.loginBtn = document.getElementById('loginBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.loginError = document.getElementById('loginError');
         // Debug: Check if elements are found
        console.log('Login button found:', this.loginBtn);
        console.log('Username input found:', this.usernameInput);   
        // Custom model checkbox
        this.useCustomModelCheckbox = document.getElementById('useCustomModel');
        
        // Transcription elements
        this.transcriptElement = document.getElementById('transcript');
        this.statusElement = document.getElementById('status');
        this.wordCountElement = document.getElementById('wordCount');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.languageSelect = document.getElementById('language');
        
        // Transcript storage
        this.fullTranscript = '';
    }
    
    setupEventListeners() {
        // Login events
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
        
        // Allow login on Enter key
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
        
        // Custom model checkbox event
        this.useCustomModelCheckbox.addEventListener('change', () => this.saveCustomModelPreference());
        
        // Transcription events
        this.startBtn.addEventListener('click', () => this.startTranscription());
        this.stopBtn.addEventListener('click', () => this.stopTranscription());
        this.clearBtn.addEventListener('click', () => this.clearTranscript());
        this.downloadBtn.addEventListener('click', () => this.downloadTranscript());
    }
    
    checkLoginStatus() {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = savedUser;
            this.isLoggedIn = true;
            this.showApplication();
        } else {
            this.showLogin();
        }
    }
    
    handleLogin() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        
        if (this.authenticateUser(username, password)) {
            this.currentUser = username;
            this.isLoggedIn = true;
            sessionStorage.setItem('currentUser', username);
            this.showApplication();
            this.hideLoginError();
        } else {
            this.showLoginError();
        }
    }
    
    handleLogout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        sessionStorage.removeItem('currentUser');
        this.stopTranscription();
        this.showLogin();
    }
    
    authenticateUser(username, password) {
        return this.validUsers[username] === password;
    }
    
    showLogin() {
        this.loginModal.style.display = 'flex';
        this.appContainer.style.display = 'none';
        this.userInfo.style.display = 'none';
        this.usernameInput.value = '';
        this.passwordInput.value = '';
        this.usernameInput.focus();
    }
    
    showApplication() {
        this.loginModal.style.display = 'none';
        this.appContainer.style.display = 'block';
        this.userInfo.style.display = 'block';
        this.userDisplayName.textContent = this.currentUser;
        this.updateUI();
    }
    
    showLoginError() {
        this.loginError.style.display = 'block';
    }
    
    hideLoginError() {
        this.loginError.style.display = 'none';
    }
    
    loadCustomModelPreference() {
        const useCustomModel = localStorage.getItem('useCustomModel');
        if (useCustomModel === 'true') {
            this.useCustomModelCheckbox.checked = true;
            this.azureConfig.useCustomModel = true;
        }
    }
    
    saveCustomModelPreference() {
        this.azureConfig.useCustomModel = this.useCustomModelCheckbox.checked;
        localStorage.setItem('useCustomModel', this.azureConfig.useCustomModel);
    }
    
    async startTranscription() {
        try {
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.serviceRegion
            );
            
            speechConfig.speechRecognitionLanguage = this.languageSelect.value;
            
            if (this.azureConfig.useCustomModel) {
                speechConfig.endpointId = this.azureConfig.customEndpointId;
                console.log('Using custom speech model with endpoint:', this.azureConfig.customEndpointId);
            }
            
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            
            this.recognizer.recognizing = (s, e) => {
                this.updateTranscript(e.result.text, false);
            };
            
            this.recognizer.recognized = (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    this.updateTranscript(e.result.text, true);
                }
            };
            
            this.recognizer.canceled = (s, e) => {
                console.log(`CANCELED: Reason=${e.reason}`);
                
                if (e.reason === SpeechSDK.CancellationReason.Error) {
                    console.log(`CANCELED: ErrorCode=${e.errorCode}, ErrorDetails=${e.errorDetails}`);
                    this.updateStatus(`Recognition error: ${e.errorDetails}`, 'error');
                }
                
                this.stopTranscription();
            };
            
            this.recognizer.startContinuousRecognitionAsync(
                () => {
                    this.isListening = true;
                    this.updateUI();
                    const modelType = this.azureConfig.useCustomModel ? 'Custom Model' : 'Standard Model';
                    this.updateStatus(`Listening... Speak now! (${modelType})`, 'listening');
                },
                (err) => {
                    console.error('Error starting recognition:', err);
                    this.updateStatus('Error starting speech recognition', 'error');
                }
            );
            
        } catch (error) {
            console.error('Error initializing speech recognition:', error);
            this.updateStatus('Error initializing speech recognition. Please check console for details.', 'error');
        }
    }
    
    stopTranscription() {
        if (this.recognizer) {
            this.recognizer.stopContinuousRecognitionAsync(
                () => {
                    this.isListening = false;
                    this.updateUI();
                    this.updateStatus('Transcription stopped', 'stopped');
                    this.recognizer.close();
                    this.recognizer = null;
                },
                (err) => {
                    console.error('Error stopping recognition:', err);
                    this.updateStatus('Error stopping recognition', 'error');
                }
            );
        } else {
            this.isListening = false;
            this.updateUI();
            this.updateStatus('Transcription stopped 轉錄已停止', 'stopped');
        }
    }
    
    updateTranscript(text, isFinal) {
        if (!text) return;
        
        const existingInterim = this.transcriptElement.querySelector('.interim');
        if (existingInterim) {
            existingInterim.remove();
        }
        
        if (isFinal) {
            this.fullTranscript += text + ' ';
            
            const finalElement = document.createElement('div');
            finalElement.textContent = text;
            finalElement.className = 'final';
            this.transcriptElement.appendChild(finalElement);
        } else {
            const interimElement = document.createElement('div');
            interimElement.textContent = text;
            interimElement.className = 'interim';
            this.transcriptElement.appendChild(interimElement);
        }
        
        this.transcriptElement.scrollTop = this.transcriptElement.scrollHeight;
        this.updateWordCount();
    }
    
    updateWordCount() {
        const wordCount = this.fullTranscript.trim() ? this.fullTranscript.trim().split(/\s+/).length : 0;
        this.wordCountElement.textContent = `${wordCount} words`;
    }
    
    clearTranscript() {
        this.transcriptElement.innerHTML = '';
        this.fullTranscript = '';
        this.updateWordCount();
        this.updateStatus('Transcript cleared 文稿已清除', 'success');
    }
    
    downloadTranscript() {
        if (!this.fullTranscript.trim()) {
            this.updateStatus('No transcript to download 沒有可下載的文字稿', 'error');
            return;
        }
        
        const blob = new Blob([this.fullTranscript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.updateStatus('Transcript downloaded', 'success');
    }
    
    updateStatus(message, type) {
        this.statusElement.textContent = message;
        
        this.statusElement.classList.remove('status-listening');
        
        if (type === 'listening') {
            this.statusElement.classList.add('status-listening');
        } else if (type === 'error') {
            this.statusElement.style.background = '#fde7e9';
            this.statusElement.style.color = '#a4262c';
        } else if (type === 'success') {
            this.statusElement.style.background = '#dff6dd';
            this.statusElement.style.color = '#107c10';
        } else {
            this.statusElement.style.background = '#f3f2f1';
            this.statusElement.style.color = '#323130';
        }
    }
    
    updateUI() {
        this.startBtn.disabled = this.isListening || !this.isLoggedIn;
        this.stopBtn.disabled = !this.isListening;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MicrosoftSpeechTranscriber();
});