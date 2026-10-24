export const removeUnnecessaryFieldsPlugin = (schema) =>
{
    const fieldsToExclude = [ "_id", "__v", "create_date" ].map((field) => `-${field}`).join(" ");

    schema.pre([ "find", "findOne", "findOneAndUpdate" ], function ()
    {
        this.select(fieldsToExclude);
    });
};
