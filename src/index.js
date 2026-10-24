import "./utils/telemetry.js";

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { app } from "@azure/functions";
import { registerWebhooks as registerIGDBAPIWebhooks, loadAPI as loadIGDBAPIAPI } from "./utils/igdb-api-helper.js";
import { getMongoDBURIClient } from "./services/mongodb-cache.js";

app.setup({ enableHttpStream: true });

const functionTriggerFilePaths = [];

const loadFunctionTriggerFilePath = (directory) =>
{
    const fullPath = path.resolve(directory);

    if (!fs.existsSync(fullPath))
        return;

    const directoryContents = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const currentDirectoryContent of directoryContents)
    {
        const currentDirectoryContentPath = path.join(fullPath, currentDirectoryContent.name);

        if (currentDirectoryContent.isDirectory())
        {
            loadFunctionTriggerFilePath(currentDirectoryContentPath);

            continue;
        }

        if (!currentDirectoryContent.isFile())
            continue;

        functionTriggerFilePaths.push(pathToFileURL(currentDirectoryContentPath).href);
    }
};

const startup = async () =>
{
    try
    {
        const MONGODB_URI_CLIENT = getMongoDBURIClient("MONGODB_URI", "igdbapi");

        await new Promise((resolve, reject) =>
        {
            MONGODB_URI_CLIENT.once("open", resolve);

            MONGODB_URI_CLIENT.once("error", reject);
        });

        console.log(`Connected to MongoDB host ${MONGODB_URI_CLIENT.host}`);

        registerIGDBAPIWebhooks();
        loadIGDBAPIAPI();

        console.log("Executed IGDB API startup methods");

        loadFunctionTriggerFilePath(path.join(import.meta.dirname, "functions"));

        await Promise.all(functionTriggerFilePaths.map(async (functionTriggerFilePath) => await import(functionTriggerFilePath)));

        console.log("Attached function triggers");
    }
    catch (err)
    {
        console.error(`Could not start serverless function: ${err.message}`);

        process.exit(1);
    }
};

startup();
