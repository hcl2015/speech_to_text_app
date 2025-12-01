module.exports = async function (context, req) {
    context.res = {
        status: 200,
        body: {
            azureSubscriptionKey: process.env.AZURE_SUBSCRIPTION_KEY,
            azureServiceRegion: process.env.AZURE_SERVICE_REGION,
            azureCustomEndpointId: process.env.AZURE_CUSTOM_ENDPOINT_ID,
            qwenApiKey: process.env.QWEN_API_KEY,
            qwenApiUrl: process.env.QWEN_API_URL
        },
        headers: {
            'Content-Type': 'application/json'
        }
    };
};
