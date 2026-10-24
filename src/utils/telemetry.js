import appInsights from "applicationinsights";

appInsights.setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
    .setAutoCollectConsole(true, true)
    .start();

const defaultClient = appInsights.defaultClient;

export const trackEvent = (name, properties) =>
{
    if (!defaultClient)
        return;

    defaultClient.trackEvent({ name, properties });
};
