migrate((app) => {
    const diary = app.findCollectionByNameOrId("diary_entries");
    diary.fields.add(new NumberField({ name: "referenceQuantity", min: 0.001, max: 100000, required: true }));
    diary.fields.add(new NumberField({ name: "referenceCaloriesKcal", min: 0, max: 100000 }));
    for (const name of ["referenceProteinG", "referenceCarbsG", "referenceFatG"]) {
        diary.fields.add(new NumberField({ name, min: -1, max: 100000 }));
    }
    app.save(diary);
    app.db().newQuery(
        "UPDATE diary_entries SET referenceQuantity = quantity, referenceCaloriesKcal = caloriesKcal, referenceProteinG = -1, referenceCarbsG = -1, referenceFatG = -1",
    ).execute();

    const users = app.findCollectionByNameOrId("users");
    const owns = "@request.auth.id != '' && owner = @request.auth.id";
    app.save(new Collection({
        type: "base",
        name: "water_entries",
        listRule: owns,
        viewRule: owns,
        createRule: "@request.auth.id != '' && @request.body.owner = @request.auth.id",
        updateRule: owns + " && @request.body.owner:changed = false && @request.body.loggedOn:changed = false",
        deleteRule: owns,
        fields: [
            { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
            { name: "loggedOn", type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            { name: "amountMl", type: "number", onlyInt: true, min: 1, max: 10000, required: true },
        ],
        indexes: ["CREATE INDEX idx_water_entries_owner_date ON water_entries (owner, loggedOn)"],
    }));
}, (app) => {
    app.delete(app.findCollectionByNameOrId("water_entries"));
    const diary = app.findCollectionByNameOrId("diary_entries");
    for (const name of ["referenceQuantity", "referenceCaloriesKcal", "referenceProteinG", "referenceCarbsG", "referenceFatG"]) {
        diary.fields.removeByName(name);
    }
    app.save(diary);
});
