import mongoose from "mongoose";
import { removeUnnecessaryFieldsPlugin } from "../plugins/fields-manipulation.js";

const alternativeNameSchema = new mongoose.Schema
(
    {
        igdb_id: Number,
        checksum: String,
        comment: String,
        game: Number,
        name: String,
        active: Boolean,
        create_date:
        {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "alternative-names"
    }
);

alternativeNameSchema.index
(
    {
        igdb_id: 1,
        create_date: -1,
        active: 1
    }
);

alternativeNameSchema.plugin(removeUnnecessaryFieldsPlugin);

export const getAlternativeNameModel = (mongoDBURIClient) =>
{
    try
    {
        return mongoDBURIClient.models.AlternativeName || mongoDBURIClient.model("AlternativeName", alternativeNameSchema);
    }
    catch (err)
    {
        console.error(`Could not get alternative name model: ${err.message}`);

        return null;
    }
};
