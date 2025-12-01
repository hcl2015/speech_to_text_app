module.exports = async function (context, req) {
    context.res = {
        status: 200,
        body: {
            azureSubscriptionKey: process.env.SPEECH_SUBSCRIPTION_KEY,
            azureServiceRegion: process.env.SPEECH_SERVICE_REGION,
            azureCustomEndpointId: process.env.CUSTOM_ENDPOINT_ID,
            qwenApiKey: process.env.QWEN_API_KEY,
            qwenApiUrl: process.env.QWEN_API_URL
        },
        headers: {
            'Content-Type': 'application/json'
        }
    };
};
