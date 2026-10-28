import APIClient from "./api-client.js";
import { loadAPIData as loadAlternativeNamesAPIData } from "../services/igdb-api-alternative-name-logic.js"; 
import { getWebhookRegistrations } from "../services/igdb-api-webhook-registration-logic.js";

const formatAggregateProject = (fields) =>
{
    const project =
    {
        _id: 0,
        igdb_id: 1,
        active: 1
    };

    for (const currentField of fields)
        project[currentField] = 1;

    return project;
};

export const formatAggregateCurrentActiveByIGDBID = (first, last, fields) =>
[
    {
        $match:
        {
            igdb_id:
            {
                $lte: last,
                $gte: first
            }
        }
    },
    {
        $setWindowFields:
        {
            partitionBy: "$igdb_id",
            sortBy: { create_date: -1 },
            output:
            {
                document_number: { $documentNumber: {} }
            }
        }
    },
    {
        $match:
        {
            document_number: 1,
            active: true
        }
    },
    {
        $project: formatAggregateProject(fields)
    }
];

export const formatResponseData = (id, active) =>
(
    {
        igdb_id: id,
        active: active
    }
);

export const registerWebhooks = async () =>
{
    try
    {
        const webhookRegistrationsResponse = await APIClient
        (
            `${APIRequestMetadata["baseURL"]}/webhooks`,
            {
                method: "GET",
                headers: APIRequestMetadata["headerProperties"]
            }
        );

        const responseWebhookRegistrations = webhookRegistrationsResponse.map((webhookSubscription) =>
        {
            const webhookSubscriptionURLTokenized = webhookSubscription["url"].split("/");

            return {
                id: webhookSubscription["id"],
                endpoint: webhookSubscriptionURLTokenized[webhookSubscriptionURLTokenized.length - 2],
                method: webhookSubscriptionURLTokenized[webhookSubscriptionURLTokenized.length - 1],
                secret: webhookSubscription["secret"],
                active: webhookSubscription["active"]
            };
        });

        const storedWebhookRegistrations = await getWebhookRegistrations({ active: true });

        const storedWebhookRegistrationsActiveJSON = new Set(storedWebhookRegistrations.map((webhookRegistration) => JSON.stringify
        (
            {
                endpoint: webhookRegistration["endpoint"],
                method: webhookRegistration["method"],
                active: webhookRegistration["active"]
            }
        )));

        const deletedWebhookRegistrations = responseWebhookRegistrations.filter((webhookRegistration) => !storedWebhookRegistrationsActiveJSON.has(JSON.stringify
        (
            {
                endpoint: webhookRegistration["endpoint"],
                method: webhookRegistration["method"],
                active: webhookRegistration["active"]
            }
        )));

        for (const currentDeletedWebhookRegistration of deletedWebhookRegistrations)
            try
            {
                await APIClient
                (
                    `${APIRequestMetadata["baseURL"]}/webhooks/${currentDeletedWebhookRegistration["id"]}`,
                    {
                        method: "DELETE",
                        headers: APIRequestMetadata["headerProperties"]
                    }
                );

                console.log(`Deleted webhook registration for IGDB API: ${currentDeletedWebhookRegistration["endpoint"]} ${currentDeletedWebhookRegistration["method"]}`);
            }
            catch (err)
            {
                console.warn(`Could not delete webhook registration for IGDB API: ${currentDeletedWebhookRegistration["endpoint"]} ${currentDeletedWebhookRegistration["method"]}: ${err.message}`);
            }

        const responseWebhookRegistrationsJSON = new Set(responseWebhookRegistrations.map((webhookRegistration) => JSON.stringify
        (
            {
                endpoint: webhookRegistration["endpoint"],
                method: webhookRegistration["method"],
                secret: webhookRegistration["secret"],
                active: webhookRegistration["active"]
            }
        )));

        const newWebhookRegistrations = storedWebhookRegistrations.filter((webhookRegistration) => !responseWebhookRegistrationsJSON.has(JSON.stringify
        (
            {
                endpoint: webhookRegistration["endpoint"],
                method: webhookRegistration["method"],
                secret: webhookRegistration["secret"],
                active: webhookRegistration["active"]
            }
        )));

        for (const currentNewWebhookRegistration of newWebhookRegistrations)
            try
            {
                await APIClient
                (
                    `${APIRequestMetadata["baseURL"]}/${currentNewWebhookRegistration["endpoint"]}/webhooks`,
                    {
                        method: "POST",
                        headers:
                        {
                            ...APIRequestMetadata["headerProperties"],
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: new URLSearchParams
                        (
                            {
                                url: `${process.env.WEBHOOK_CALLBACK_URL}/igdbapi/${currentNewWebhookRegistration["endpoint"]}/${currentNewWebhookRegistration["method"]}`,
                                method: currentNewWebhookRegistration["method"],
                                secret: currentNewWebhookRegistration["secret"]
                            }
                        )
                    }
                );
            }
            catch (err)
            {
                console.warn(`Could not create new webhook registration for IGDB API: ${currentNewWebhookRegistration["endpoint"]} ${currentNewWebhookRegistration["method"]}: ${err.message}`);
            }
    }
    catch (err)
    {
        console.error(`Could not register webhooks for IGDB API: ${err.message}`);
    }
};

export const APIRequestMetadata =
{
    baseURL: "https://api.igdb.com/v4",
    headerProperties:
    {
        "Client-ID": process.env.IGDB_API_CLIENT_ID,
        "Authorization": `Bearer ${process.env.IGDB_API_ACCESS_TOKEN}`
    },
    bodyProperties:
    {
        fields: "*",
        limit: 500,
        offset: 0,
        sort: "id"
    }
};

export const executeAPIRequest = async (requestMetadata, endpoint) => await APIClient
(
    `${requestMetadata["baseURL"]}/${endpoint}`,
    {
        method: "POST",
        headers:
        {
            ...requestMetadata["headerProperties"],
            "Content-Type": "text/plain"
        },
        body: Object.entries(requestMetadata["bodyProperties"]).map(([ key, value ]) => `${key} ${value};`).join("\n")
    }
);

export const loadAPI = async () =>
{
    await loadAlternativeNamesAPIData();
};
