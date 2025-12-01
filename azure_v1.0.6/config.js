// Configuration for Azure Speech and Qwen APIs.
// IMPORTANT: Do NOT commit real keys to source control.
// In Azure Static Web Apps, generate this file at build time from secrets
// (see suggested GitHub Actions snippet in the README or deployment instructions).

const CONFIG = {
    AZURE_SUBSCRIPTION_KEY: '<YOUR_AZURE_SUBSCRIPTION_KEY>',
    AZURE_SERVICE_REGION: 'eastus',
    AZURE_CUSTOM_ENDPOINT_ID: '<YOUR_AZURE_CUSTOM_ENDPOINT_ID>',
    QWEN_API_KEY: '<YOUR_QWEN_API_KEY>',
    QWEN_API_URL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
};
