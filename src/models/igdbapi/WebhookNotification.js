import mongoose from "mongoose";
import { removeUnnecessaryFieldsPlugin } from "../plugins/fields-manipulation.js";

const webhookNotificationSchema = new mongoose.Schema
(
    {
        endpoint: String,
        method: String,
        data: String,
        create_date:
        {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "webhook-notifications"
    }
);

webhookNotificationSchema.plugin(removeUnnecessaryFieldsPlugin);

export const getWebhookNotificationModel = (mongoDBURIClient) =>
{
    try
    {
        return mongoDBURIClient.models.WebhookNotification || mongoDBURIClient.model("WebhookNotification", webhookNotificationSchema);
    }
    catch (err)
    {
        console.error(`Could not get webhook notification model: ${err.message}`);

        return null;
    }
};
