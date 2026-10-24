const APIClient = async (url, options) =>
{
    const response = await fetch(url, options);

    if (!response.ok)
    {
        const errorMessage = await response.text();

        console.error(`${options["method"]} ${url}: ${response.status} ${errorMessage}`);

        throw new Error(`Could not complete API request call successfully: ${options["method"]} ${url}: ${response.status} ${errorMessage}`);
    }

    return await response.json();
};

export default APIClient;
