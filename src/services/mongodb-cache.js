import mongoose from "mongoose";

const mongoDBURIClientsCache = [];

export const getMongoDBURIClient = (mongoDBURIName, mongoDBURIDatabase) =>
{
    try
    {
        let mongoDBURIClient = mongoDBURIClientsCache.find((mongoDBURIClient) => mongoDBURIName === mongoDBURIClient["key"] && mongoDBURIDatabase === mongoDBURIClient["database"]);

        if (!mongoDBURIClient || (mongoDBURIClient["client"] && mongoDBURIClient["client"].readyState !== 1))
        {
            const mongoDBURIClientRecord =
            {
                key: mongoDBURIName,
                database: mongoDBURIDatabase
            };

            mongoDBURIClientRecord["client"] = mongoose.createConnection(process.env[mongoDBURIName].replace("{database-placeholder}", mongoDBURIDatabase));

            mongoDBURIClientsCache.push(mongoDBURIClientRecord);

            mongoDBURIClient = mongoDBURIClientRecord;
        }

        return mongoDBURIClient["client"];
    }
    catch
    {
        return null;
    }
};
