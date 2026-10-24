import { getMongoDBURIClient } from "./mongodb-cache.js";
import { getWebhookRegistrationModel } from "../models/igdbapi/WebhookRegistration.js";

const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

const WebhookRegistrationModel = getWebhookRegistrationModel(MONGODB_URI_CLIENT);

export const getWebhookRegistrations = async (documentFilters) => await WebhookRegistrationModel.find(documentFilters).lean();
export const getWebhookRegistrationEndpointMethod = async (documentFilters) => await WebhookRegistrationModel.findOne(documentFilters).lean();
