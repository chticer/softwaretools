import { app } from "@azure/functions";
import { getServiceBusClient } from "../services/azure-cache.js";
import { processWebhookData as processAlternativeNameWebhookData } from "../services/igdb-api-alternative-names-logic.js";
import { getWebhookRegistrationEndpointMethod } from "../services/igdb-api-webhook-registration-logic.js";
import { getMongoDBURIClient } from "../services/mongodb-cache.js";
import { getWebhookNotificationModel } from "../models/igdbapi/WebhookNotification.js";

const SERVICE_BUS_CLIENT = getServiceBusClient(process.env.SERVICE_BUS_NAMESPACE);

const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

const WebhookNotificationModel = getWebhookNotificationModel(MONGODB_URI_CLIENT);

const verifyWebhook = async (request, context) =>
{
    const requestHeaders = {};

    try
    {
        const requestHeaderKeys = [ "X-Endpoint", "X-Operation", "X-Secret", "User-Agent" ];

        for (const currentRequestHeaderKey of requestHeaderKeys)
            requestHeaders[currentRequestHeaderKey] = request.headers[currentRequestHeaderKey];

        if (requestHeaders["User-Agent"] !== "IGDB-Webhook-Bot")
        {
            context.error(`Could not verify webhook for IGDB API: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}: Webhook does not come from IGDB API`);

            return { status: 401 };
        }

        const webhookRegistrationEndpointMethod = await getWebhookRegistrationEndpointMethod
        (
            {
                endpoint: requestHeaders["X-Endpoint"],
                method: requestHeaders["X-Operation"],
                active: true
            }
        );

        if (!webhookRegistrationEndpointMethod)
        {
            context.error(`Could not verify webhook for IGDB API: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}: Webhook is not registered or is inactive`);

            return { status: 400 };
        }

        if (webhookRegistrationEndpointMethod["secret"] !== requestHeaders["X-Secret"])
        {
            context.error(`Could not verify webhook for IGDB API: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}: Webhook secret does not match`);

            return { status: 403 };
        }
    }
    catch (err)
    {
        context.error(`Could not verify webhook for IGDB API: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}: ${err.message}`);

        return { status: 500 };
    }

    let serviceBusSenderIGDBAPIWebhook = null;

    try
    {
        serviceBusSenderIGDBAPIWebhook = SERVICE_BUS_CLIENT.createSender(process.env.SERVICE_BUS_QUEUE_NAME_IGDB_API_WEBHOOK);

        await serviceBusSenderIGDBAPIWebhook.sendMessages
        (
            {
                body:
                {
                    endpoint: requestHeaders["X-Endpoint"],
                    method: requestHeaders["X-Operation"],
                    data: request.body
                }
            }
        );

        context.log(`Queued IGDB API webhook notification: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}`);

        return { status: 200 };
    }
    catch (err)
    {
        context.error(`Could not queue IGDB API webhook notification: ${requestHeaders["X-Endpoint"]} ${requestHeaders["X-Operation"]}: ${err.message}`);

        return { status: 500 };
    }
    finally
    {
        if (serviceBusSenderIGDBAPIWebhook)
            serviceBusSenderIGDBAPIWebhook.close();
    }
};

const processWebhook = async (message, context) =>
{
    context.log(`Received IGDB API webhook notification: ${message["endpoint"]} ${message["method"]} ${message["data"]["id"]}`);

    try
    {
        await WebhookNotificationModel.create(message);

        if (message["endpoint"] === "alternative_names")
            processAlternativeNameWebhookData(message["method"], message["data"]);

        context.log(`Successfully processed IGDB API webhook notification: ${message["endpoint"]} ${message["method"]} ${message["data"]["id"]}`);
    }
    catch (err)
    {
        context.error(`Could not process IGDB API webhook notification: ${message["endpoint"]} ${message["method"]} ${message["data"]["id"]}: ${err.message}`);

        throw err;
    }
};

app.http
(
    "igdb_api_verify_webhook_receiver",
    {
        route: "igdbapi/{endpoint}/{method}",
        methods: [ "POST" ],
        authLevel: "anonymous",
        handler: verifyWebhook
    }
);

app.serviceBusQueue
(
    "igdb_api_process_webhook_queue_receiver",
    {
        connection: "ServiceBusConnection",
        queueName: process.env.SERVICE_BUS_QUEUE_NAME_IGDB_API_WEBHOOK,
        handler: processWebhook
    }
);
