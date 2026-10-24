import { DefaultAzureCredential } from "@azure/identity";
import { ServiceBusClient } from "@azure/service-bus";

const credential = new DefaultAzureCredential();

const serviceBusClientsCache = [];

export const getServiceBusClient = (serviceBusNamespace) =>
{
    try
    {
        let serviceBusClient = serviceBusClientsCache.find((serviceBusClient) => serviceBusNamespace === serviceBusClient["key"]);

        if (!serviceBusClient)
        {
            const serviceBusClientRecord = { key: serviceBusNamespace };

            serviceBusClientRecord["client"] = new ServiceBusClient(`${serviceBusNamespace}.servicebus.windows.net`, credential);

            serviceBusClientsCache.push(serviceBusClientRecord);

            serviceBusClient = serviceBusClientRecord;
        }

        return serviceBusClient["client"];
    }
    catch
    {
        return null;
    }
};
