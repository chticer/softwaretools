import { getMongoDBURIClient } from "./mongodb-cache.js";
import { delaySeconds } from "../utils/delay-helper.js";
import { formatAggregateCurrentActiveByIGDBID, formatResponseData, APIRequestMetadata, executeAPIRequest } from "../utils/igdb-api-helper.js";
import { getArtworkModel } from "../models/igdbapi/Artwork.js";

const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

const ArtworkModel = getArtworkModel(MONGODB_URI_CLIENT);

const ARTWORK_FIELDS = [ "alpha_channel", "animated", "checksum", "game", "height", "image_id", "image_type", "url", "width" ];

const getArtworksCurrentActiveByIGDBID = async (first, last) =>
{
    try
    {
        return await ArtworkModel.aggregate(formatAggregateCurrentActiveByIGDBID(first, last, ARTWORK_FIELDS));
    }
    catch
    {
        return [];
    }
};

export const processWebhookData = async (method, data) =>
{
    const artwork = formatResponseData(data["id"], method !== "delete");

    try
    {
        if (artwork["active"])
            for (const currentArtworkField of ARTWORK_FIELDS)
                artwork[currentArtworkField] = data[currentArtworkField];
        else
        {
            const artworksCurrentActive = await getArtworksCurrentActiveByIGDBID(artwork["igdb_id"], artwork["igdb_id"]);

            if (artworksCurrentActive.length === 0)
            {
                console.log(`No active record was found to process artwork data: ${method} ${artwork["igdb_id"]}`);

                return;
            }

            for (const currentArtworkField of ARTWORK_FIELDS)
                artwork[currentArtworkField] = artworksCurrentActive[0][currentArtworkField];
        }

        await ArtworkModel.create(artwork);

        console.log(`Successfully processed artwork data: ${method} ${artwork["igdb_id"]}`);
    }
    catch (err)
    {
        console.error(`Could not process artwork data: ${method} ${artwork["igdb_id"]}: ${err.message}`);
    }
};

export const loadAPIData = async () =>
{
    const requestMetadata = { ...APIRequestMetadata };

    let response = [];

    let minimumIGDBID = 0;

    do
    {
        try
        {
            response = await executeAPIRequest(requestMetadata, "artworks");

            if (response.length === 0)
                continue;

            const responseArtworks = response.map((res) =>
            {
                const currentArtwork = formatResponseData(res["id"], true);

                for (const currentArtworkField of ARTWORK_FIELDS)
                    currentArtwork[currentArtworkField] = res[currentArtworkField];

                return currentArtwork;
            });

            const maximumIGDBID = responseArtworks[responseArtworks.length - 1]["igdb_id"];

            const storedArtworks = await getArtworksCurrentActiveByIGDBID(minimumIGDBID + 1, maximumIGDBID);

            const responseArtworksChecksums = new Set(responseArtworks.map((artwork) => artwork["checksum"]));

            const outdatedArtworks = storedArtworks.filter((artwork) => !responseArtworksChecksums.has(artwork["checksum"]));

            await ArtworkModel.insertMany(outdatedArtworks.map((artwork) =>
            (
                {
                    ...artwork,
                    active: false
                }
            )));

            const storedArtworksChecksums = new Set(storedArtworks.map((artwork) => artwork["checksum"]));

            const newArtworks = responseArtworks.filter((artwork) => !storedArtworksChecksums.has(artwork["checksum"]));

            await ArtworkModel.insertMany(newArtworks);

            requestMetadata["bodyProperties"]["offset"] += response.length;

            minimumIGDBID = maximumIGDBID;

            await delaySeconds(0.5);
        }
        catch (err)
        {
            console.error(`Could not load /artworks API data: ${err.message}`);

            response.length = 0;
        }
    } while (response.length === requestMetadata["bodyProperties"]["limit"]);
};
