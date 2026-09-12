# Overview

This repository helps provide software solutions for other programs and applications used for personal and streaming projects. This includes the interaction of Microsoft Azure resources, such as Function Apps and Service Buses, and MongoDB clusters. This project hosts serverless consumption flex function apps using Azure Functions Core Tools v4 and uses the Node 24 LTS stack.

All code and files in this repository are open sourced and can be distributed, cloned, and modified for private use.

## Build Instructions

This project requires binaries and IDEs that can be used with Azure Functions Core Tools and Node.js and the supported versions mentioned above.

```
git clone https://github.com/chticer/softwaretools.git
```

The root directory handles all code and files for running function triggers. The start script within Azure Functions Core Tools handles starting the server.

```
npm install
npm start
```

## Environment Variables

Follow the instructions provided within `src/environmentfiles/dev/local.settings.json` to use environment variables. Any environment variable marked as optional may be deleted.

## References

[Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
