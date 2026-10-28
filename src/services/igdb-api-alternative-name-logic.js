import { getMongoDBURIClient } from "./mongodb-cache.js";
import { delaySeconds } from "../utils/delay-helper.js";
import { formatAggregateCurrentActiveByIGDBID, formatResponseData, APIRequestMetadata, executeAPIRequest } from "../utils/igdb-api-helper.js";
import { getAlternativeNameModel } from "../models/igdbapi/AlternativeName.js";

const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

const AlternativeNameModel = getAlternativeNameModel(MONGODB_URI_CLIENT);

const ALTERNATIVE_NAME_FIELDS = [ "checksum", "comment", "game", "name" ];

const getAlternativeNamesCurrentActiveByIGDBID = async (first, last) =>
{
    try
    {
        return await AlternativeNameModel.aggregate(formatAggregateCurrentActiveByIGDBID(first, last, ALTERNATIVE_NAME_FIELDS));
    }
    catch
    {
        return [];
    }
};

export const processWebhookData = async (method, data) =>
{
    const alternativeName = formatResponseData(data["id"], method !== "delete");

    try
    {
        if (alternativeName["active"])
            for (const currentAlternativeNameField of ALTERNATIVE_NAME_FIELDS)
                alternativeName[currentAlternativeNameField] = data[currentAlternativeNameField];
        else
        {
            const alternativeNamesCurrentActive = await getAlternativeNamesCurrentActiveByIGDBID(alternativeName["igdb_id"], alternativeName["igdb_id"]);

            if (alternativeNamesCurrentActive.length === 0)
            {
                console.log(`No active record was found to process alternative name data: ${method} ${alternativeName["igdb_id"]}`);

                return;
            }

            for (const currentAlternativeNameField of ALTERNATIVE_NAME_FIELDS)
                alternativeName[currentAlternativeNameField] = alternativeNamesCurrentActive[0][currentAlternativeNameField];
        }

        await AlternativeNameModel.create(alternativeName);

        console.log(`Successfully processed alternative name data: ${method} ${alternativeName["igdb_id"]}`);
    }
    catch (err)
    {
        console.error(`Could not process alternative name data: ${method} ${alternativeName["igdb_id"]}: ${err.message}`);
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
            response = await executeAPIRequest(requestMetadata, "alternative_names");

            if (response.length === 0)
                continue;

            const responseAlternativeNames = response.map((res) =>
            {
                const currentAlternativeName = formatResponseData(res["id"], true);

                for (const currentAlternativeNameField of ALTERNATIVE_NAME_FIELDS)
                    currentAlternativeName[currentAlternativeNameField] = res[currentAlternativeNameField];

                return currentAlternativeName;
            });

            const maximumIGDBID = responseAlternativeNames[responseAlternativeNames.length - 1]["igdb_id"];

            const storedAlternativeNames = await getAlternativeNamesCurrentActiveByIGDBID(minimumIGDBID + 1, maximumIGDBID);

            const responseAlternativeNamesChecksums = new Set(responseAlternativeNames.map((alternativeName) => alternativeName["checksum"]));

            const outdatedAlternativeNames = storedAlternativeNames.filter((alternativeName) => !responseAlternativeNamesChecksums.has(alternativeName["checksum"]));

            await AlternativeNameModel.insertMany(outdatedAlternativeNames.map((alternativeName) =>
            (
                {
                    ...alternativeName,
                    active: false
                }
            )));

            const storedAlternativeNamesChecksums = new Set(storedAlternativeNames.map((alternativeName) => alternativeName["checksum"]));

            const newAlternativeNames = responseAlternativeNames.filter((alternativeName) => !storedAlternativeNamesChecksums.has(alternativeName["checksum"]));

            await AlternativeNameModel.insertMany(newAlternativeNames);

            requestMetadata["bodyProperties"]["offset"] += response.length;

            minimumIGDBID = maximumIGDBID;

            await delaySeconds(0.5);
        }
        catch (err)
        {
            console.error(`Could not load /alternative_names API data: ${err.message}`);

            response.length = 0;
        }
    } while (response.length === requestMetadata["bodyProperties"]["limit"]);
};
