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
        
        // Qwen API Configuration - OpenAI Compatible
        this.qwenConfig = {
            apiKey: CONFIG.QWEN_API_KEY,
            // Try different OpenAI-compatible endpoints
            apiUrl: CONFIG.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            model: 'qwen-max'
        };
        
        // User credentials
        this.validUsers = {
            "fgsuser": "fgs2025",
            "admin": "admin123",
            "user": "password123"
        };
        
        // Relevant phrases for text rewriting
        this.relevantPhrases = "佛性,釋迦牟尼佛,般若波羅蜜多心經,戒定慧,空性,南無,眾生";
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkLoginStatus();
        this.loadCustomModelPreference();
        this.loadRewritePreference();
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
        this.enableRewriteCheckbox = document.getElementById('enableRewrite');
        this.relevantPhrasesInput = document.getElementById('relevantPhrases');
        
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
        this.rewrittenTranscript = '';
    }
    
    setupEventListeners() {
        // Login events - FIXED: Add proper event listeners
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
        
        // Allow login on Enter key
        if (this.passwordInput) {
            this.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }

        if (this.usernameInput) {
            this.usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleLogin();
                }
            });
        }
        
        // Custom model checkbox event
        if (this.useCustomModelCheckbox) {
            this.useCustomModelCheckbox.addEventListener('change', () => this.saveCustomModelPreference());
        }
        if (this.enableRewriteCheckbox) {
            this.enableRewriteCheckbox.addEventListener('change', () => this.saveRewritePreference());
        }
        if (this.relevantPhrasesInput) {
            this.relevantPhrasesInput.addEventListener('change', () => this.saveRelevantPhrases());
        }
        
        // Transcription events
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startTranscription());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopTranscription());
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearTranscript());
        }
        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadTranscript());
        }
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
        console.log('Login button clicked');
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        
        console.log('Username:', username, 'Password:', password ? '***' : 'empty');
        
        if (this.authenticateUser(username, password)) {
            this.currentUser = username;
            this.isLoggedIn = true;
            sessionStorage.setItem('currentUser', username);
            this.showApplication();
            this.hideLoginError();
            console.log('Login successful for user:', username);
        } else {
            this.showLoginError();
            console.log('Login failed for user:', username);
        }
    }
    
    handleLogout() {
        console.log('Logout clicked');
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
        console.log('Showing login modal');
        if (this.loginModal) this.loginModal.style.display = 'flex';
        if (this.appContainer) this.appContainer.style.display = 'none';
        if (this.userInfo) this.userInfo.style.display = 'none';
        if (this.usernameInput) {
            this.usernameInput.value = '';
            this.usernameInput.focus();
        }
        if (this.passwordInput) this.passwordInput.value = '';
    }
    
    showApplication() {
        console.log('Showing application for user:', this.currentUser);
        if (this.loginModal) this.loginModal.style.display = 'none';
        if (this.appContainer) this.appContainer.style.display = 'block';
        if (this.userInfo) this.userInfo.style.display = 'block';
        if (this.userDisplayName) this.userDisplayName.textContent = this.currentUser;
        this.updateUI();
    }
    
    showLoginError() {
        console.log('Showing login error');
        if (this.loginError) {
            this.loginError.style.display = 'block';
            this.loginError.textContent = 'Invalid username or password 用戶名或密碼錯誤';
        }
    }
    
    hideLoginError() {
        if (this.loginError) this.loginError.style.display = 'none';
    }
    
    loadCustomModelPreference() {
        const useCustomModel = localStorage.getItem('useCustomModel');
        if (useCustomModel === 'true' && this.useCustomModelCheckbox) {
            this.useCustomModelCheckbox.checked = true;
            this.azureConfig.useCustomModel = true;
        }
    }
    
    saveCustomModelPreference() {
        this.azureConfig.useCustomModel = this.useCustomModelCheckbox.checked;
        localStorage.setItem('useCustomModel', this.azureConfig.useCustomModel);
    }
    
    loadRewritePreference() {
        const enableRewrite = localStorage.getItem('enableRewrite');
        if (enableRewrite === 'true' && this.enableRewriteCheckbox) {
            this.enableRewriteCheckbox.checked = true;
        }
        
        const savedPhrases = localStorage.getItem('relevantPhrases');
        if (savedPhrases && this.relevantPhrasesInput) {
            this.relevantPhrases = savedPhrases;
            this.relevantPhrasesInput.value = savedPhrases;
        }
    }
    
    saveRewritePreference() {
        localStorage.setItem('enableRewrite', this.enableRewriteCheckbox.checked);
    }
    
    saveRelevantPhrases() {
        this.relevantPhrases = this.relevantPhrasesInput.value;
        localStorage.setItem('relevantPhrases', this.relevantPhrases);
    }
    
    async rewriteContent(inputText) {
        if (!inputText.trim()) return inputText;
        
        const systemPrompt = `你是一个佛经文本编辑助手。按照以下规则重写中文句子：
        1.不要回答任何问题
        2.修正语法错误
        3.使用以下参考资料修正佛教术语: ${this.relevantPhrases}
        4.保持原意和语气
        5.只做微小调整
        6.不要添加新内容
        示例:
            用户输入: 眾生潔舉佛性但要修解定慧才能顯明
            响应: 眾生皆具佛性，但需修行戒定慧方能顯發
            用户输入: 拉摩本是釋迦牟尼佛
            响应: 南無本師釋迦牟尼佛
            用户输入: 波熱波囉密多心經講的是空性的道理   
            响应: 般若波羅蜜多心經詮釋空性深義`;
        
        // OpenAI-compatible payload
        const payload = {
            "model": this.qwenConfig.model,
            "messages": [
                {"role": "system", "content": systemPrompt},
                {"role": "user", "content": inputText}
            ],
            "temperature": 0.1,
            "max_tokens": 1000
        };
        
        try {
            console.log('Calling Qwen API with payload:', payload);
            
            const response = await fetch(this.qwenConfig.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.qwenConfig.apiKey}`,
                    // Some OpenAI-compatible APIs may require different headers
                    'X-DashScope-SSE': 'disable'
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Qwen API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Qwen API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Qwen API success response:', result);
            
            // Extract response content from OpenAI-compatible response
            if (result.choices && result.choices.length > 0 && result.choices[0].message) {
                return result.choices[0].message.content;
            } else {
                console.log('Unexpected API response format:', result);
                return inputText; // Return original text if response format is unexpected
            }
            
        } catch (error) {
            console.error('Error occurred while calling Qwen API:', error);
            return inputText; // Return original text on error
        }
    }
    
    async startTranscription() {
        try {
            const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
                this.azureConfig.subscriptionKey, 
                this.azureConfig.serviceRegion
            );
            
            speechConfig.speechRecognitionLanguage = this.languageSelect.value;
            
            // 修复自定义模型配置
            if (this.azureConfig.useCustomModel && this.azureConfig.customEndpointId) {
                // 方法1: 使用自定义端点ID
                speechConfig.endpointId = this.azureConfig.customEndpointId;
                console.log('Using custom speech model with endpoint ID:', this.azureConfig.customEndpointId);
            }
            
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
            this.recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
            
            this.recognizer.recognizing = (s, e) => {
                this.updateTranscript(e.result.text, false, false);
            };
            
            this.recognizer.recognized = async (s, e) => {
                if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                    const originalText = e.result.text;
                    
                    // Display original text immediately
                    this.updateTranscript(originalText, true, false);
                    
                    // If rewrite is enabled, process with Qwen API
                    if (this.enableRewriteCheckbox && this.enableRewriteCheckbox.checked) {
                        try {
                            const rewrittenText = await this.rewriteContent(originalText);
                            this.updateTranscript(rewrittenText, true, true);
                        } catch (error) {
                            console.error('Error in text rewriting:', error);
                            // Continue with original text if rewriting fails
                        }
                    }
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
            
            this.recognizer.sessionStarted = (s, e) => {
                console.log('Session started');
                const modelType = this.azureConfig.useCustomModel ? 'Custom Model' : 'Standard Model';
                console.log(`Using ${modelType}`);
            };
            
            this.recognizer.startContinuousRecognitionAsync(
                () => {
                    this.isListening = true;
                    this.updateUI();
                    const modelType = this.azureConfig.useCustomModel ? 'Custom Model' : 'Standard Model';
                    const rewriteStatus = this.enableRewriteCheckbox.checked ? ' + Text Rewriting' : '';
                    this.updateStatus(`Listening... Speak now! (${modelType}${rewriteStatus})`, 'listening');
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
    
    updateTranscript(text, isFinal, isRewritten) {
        if (!text || !this.transcriptElement) return;
        
        const existingInterim = this.transcriptElement.querySelector('.interim');
        if (existingInterim && !isRewritten) {
            existingInterim.remove();
        }
        
        if (isFinal) {
            if (!isRewritten) {
                // Original text
                this.fullTranscript += text + ' ';
                
                const finalElement = document.createElement('div');
                finalElement.textContent = `RAW RECO: ${text}`;
                finalElement.className = 'final original';
                this.transcriptElement.appendChild(finalElement);
            } else {
                // Rewritten text
                this.rewrittenTranscript += text + ' ';
                
                const rewrittenElement = document.createElement('div');
                rewrittenElement.textContent = `REWRITE: ${text}`;
                rewrittenElement.className = 'final rewritten';
                rewrittenElement.style.color = '#107c10'; // Green color for rewritten text
                rewrittenElement.style.fontWeight = 'bold';
                this.transcriptElement.appendChild(rewrittenElement);
                
                // Add separator
                const separator = document.createElement('div');
                separator.innerHTML = '---';
                separator.style.textAlign = 'center';
                separator.style.color = '#ccc';
                separator.style.margin = '5px 0';
                this.transcriptElement.appendChild(separator);
            }
        } else {
            // Interim results
            const interimElement = document.createElement('div');
            interimElement.textContent = text;
            interimElement.className = 'interim';
            this.transcriptElement.appendChild(interimElement);
        }
        
        this.transcriptElement.scrollTop = this.transcriptElement.scrollHeight;
        this.updateWordCount();
    }
    
    updateWordCount() {
        if (!this.wordCountElement) return;
        const wordCount = this.fullTranscript.trim() ? this.fullTranscript.trim().split(/\s+/).length : 0;
        this.wordCountElement.textContent = `${wordCount} words`;
    }
    
    clearTranscript() {
        if (!this.transcriptElement) return;
        this.transcriptElement.innerHTML = '';
        this.fullTranscript = '';
        this.rewrittenTranscript = '';
        this.updateWordCount();
        this.updateStatus('Transcript cleared 文稿已清除', 'success');
    }
    
    downloadTranscript() {
        if (!this.fullTranscript.trim() && !this.rewrittenTranscript.trim()) {
            this.updateStatus('No transcript to download 沒有可下載的文字稿', 'error');
            return;
        }
        
        let content = '';
        if (this.fullTranscript.trim()) {
            content += 'RAW TRANSCRIPT:\n' + this.fullTranscript + '\n\n';
        }
        if (this.rewrittenTranscript.trim()) {
            content += 'REWRITTEN TRANSCRIPT:\n' + this.rewrittenTranscript;
        }
        
        const blob = new Blob([content], { type: 'text/plain' });
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
        if (!this.statusElement) return;
        
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
        if (this.startBtn) this.startBtn.disabled = this.isListening || !this.isLoggedIn;
        if (this.stopBtn) this.stopBtn.disabled = !this.isListening;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing MicrosoftSpeechTranscriber');
    try {
        new MicrosoftSpeechTranscriber();
        console.log('MicrosoftSpeechTranscriber initialized successfully');
    } catch (error) {
        console.error('Error initializing MicrosoftSpeechTranscriber:', error);
    }
});