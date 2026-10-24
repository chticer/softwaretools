import mongoose from "mongoose";
import { removeUnnecessaryFieldsPlugin } from "../plugins/fields-manipulation.js";

const webhookRegistrationSchema = new mongoose.Schema
(
    {
        endpoint: String,
        method: String,
        secret: String,
        active: Boolean,
        create_date:
        {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "webhook-registrations"
    }
);

webhookRegistrationSchema.index
(
    {
        endpoint: 1,
        method: 1
    },
    {
        unique: true,
        background: true
    }
);

webhookRegistrationSchema.index({ active: 1 });

webhookRegistrationSchema.plugin(removeUnnecessaryFieldsPlugin);

export const getWebhookRegistrationModel = (mongoDBURIClient) =>
{
    try
    {
        return mongoDBURIClient.models.WebhookRegistration || mongoDBURIClient.model("WebhookRegistration", webhookRegistrationSchema);
    }
    catch (err)
    {
        console.error(`Could not get webhook registration model: ${err.message}`);

        return null;
    }
};
