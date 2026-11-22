migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    const ownsEntry = "@request.auth.id != '' && owner = @request.auth.id";

    const entries = new Collection({
        type: "base",
        name: "diary_entries",
        listRule: ownsEntry,
        viewRule: ownsEntry,
        createRule: "@request.auth.id != '' && @request.body.owner = @request.auth.id && @request.body.caloriesKcal:isset = true",
        updateRule: ownsEntry + " && @request.body.owner:changed = false",
        deleteRule: ownsEntry,
        fields: [
            { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
            { name: "loggedOn", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            { name: "meal", type: "select", required: true, maxSelect: 1, values: ["breakfast", "lunch", "dinner", "snacks"] },
            { name: "name", type: "text", required: true, max: 100 },
            { name: "quantity", type: "number", min: 0.001, max: 100000, required: true },
            { name: "unit", type: "select", required: true, maxSelect: 1, values: ["serving", "g", "ml"] },
            { name: "caloriesKcal", type: "number", min: 0, max: 100000 },
        ],
        indexes: ["CREATE INDEX idx_diary_entries_owner_date ON diary_entries (owner, loggedOn)"],
    });

    app.save(entries);
}, (app) => {
    app.delete(app.findCollectionByNameOrId("diary_entries"));
});
