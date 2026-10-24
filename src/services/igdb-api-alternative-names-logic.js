import { getMongoDBURIClient } from "./mongodb-cache.js";
import { delaySeconds } from "../utils/delay-helper.js";
import { APIRequestMetadata, executeAPIRequest } from "../utils/igdb-api-helper.js";
import { getAlternativeNameModel } from "../models/igdbapi/AlternativeName.js";

const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

const AlternativeNameModel = getAlternativeNameModel(MONGODB_URI_CLIENT);

const getCurrentActiveAlternativeNamesByIGDBID = async (first, last) =>
{
    try
    {
        return await AlternativeNameModel.aggregate
        (
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
                            row_number: { $documentNumber: {} }
                        }
                    }
                },
                {
                    $match:
                    {
                        row_number: 1,
                        active: true
                    }
                },
                {
                    $project:
                    {
                        _id: 0,
                        igdb_id: 1,
                        checksum: 1,
                        comment: 1,
                        game: 1,
                        name: 1,
                        active: 1
                    }
                }
            ]
        );
    }
    catch
    {
        return [];
    }
};

export const processWebhookData = async (method, data) =>
{
    const alternativeName =
    {
        igdb_id: data["id"],
        active: method !== "delete"
    };

    try
    {
        if (alternativeName["active"])
        {
            alternativeName["checksum"] = data["checksum"];
            alternativeName["comment"] = data["comment"];
            alternativeName["game"] = data["game"];
            alternativeName["name"] = data["name"];
        }
        else
        {
            const currentActiveAlternativeNames = await getCurrentActiveAlternativeNamesByIGDBID(data["id"], data["id"]);

            if (currentActiveAlternativeNames.length === 0)
            {
                console.log(`No active record was found to process alternative name data: ${method} ${alternativeName["igdb_id"]}`);

                return;
            }

            alternativeName["checksum"] = currentActiveAlternativeNames[0]["checksum"];
            alternativeName["comment"] = currentActiveAlternativeNames[0]["comment"];
            alternativeName["game"] = currentActiveAlternativeNames[0]["game"];
            alternativeName["name"] = currentActiveAlternativeNames[0]["name"];
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
            (
                {
                    igdb_id: res["id"],
                    checksum: res["checksum"],
                    comment: res["comment"],
                    game: res["game"],
                    name: res["name"],
                    active: true
                }
            ));

            const maximumIGDBID = responseAlternativeNames[responseAlternativeNames.length - 1]["igdb_id"];

            const storedAlternativeNames = await getCurrentActiveAlternativeNamesByIGDBID(minimumIGDBID + 1, maximumIGDBID);

            const responseAlternativeNamesJSON = new Set(responseAlternativeNames.map((alternativeName) => JSON.stringify(alternativeName)));

            const outdatedAlternativeNames = storedAlternativeNames.filter((alternativeName) => !responseAlternativeNamesJSON.has(JSON.stringify(alternativeName)));

            await AlternativeNameModel.insertMany(outdatedAlternativeNames.map((alternativeName) =>
            (
                {
                    ...alternativeName,
                    active: false
                }
            )));

            const storedAlternativeNamesJSON = new Set(storedAlternativeNames.map((alternativeName) => JSON.stringify(alternativeName)));

            const newAlternativeNames = responseAlternativeNames.filter((alternativeName) => !storedAlternativeNamesJSON.has(JSON.stringify(alternativeName)));

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
