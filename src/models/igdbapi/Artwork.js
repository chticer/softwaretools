import mongoose from "mongoose";
import { removeUnnecessaryFieldsPlugin } from "../plugins/fields-manipulation.js";

const artworkSchema = new mongoose.Schema
(
    {
        igdb_id: Number,
        alpha_channel: Boolean,
        animated: Boolean,
        checksum: String,
        game: Number,
        height: Number,
        image_id: String,
        image_type: Number,
        url: String,
        width: Number,
        active: Boolean,
        create_date:
        {
            type: Date,
            default: Date.now
        }
    },
    {
        collection: "artworks"
    }
);

artworkSchema.index
(
    {
        igdb_id: 1,
        create_date: -1,
        active: 1
    }
);

artworkSchema.plugin(removeUnnecessaryFieldsPlugin);

export const getArtworkModel = (mongoDBURIClient) =>
{
    try
    {
        return mongoDBURIClient.models.Artwork || mongoDBURIClient.model("Artwork", artworkSchema);
    }
    catch (err)
    {
        console.error(`Could not get artwork model: ${err.message}`);

        return null;
    }
};
