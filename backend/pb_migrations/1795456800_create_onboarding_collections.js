migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    const owner = { name: "owner", type: "relation", collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true };
    const day = { type: "text", required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" };

    app.save(new Collection({
        type: "base",
        name: "body_profiles",
        fields: [
            owner,
            { name: "age", type: "number", onlyInt: true, min: 18, max: 120, required: true },
            { name: "heightCm", type: "number", min: 100, max: 250, required: true },
            { name: "sex", type: "select", maxSelect: 1, values: ["male", "female"], required: true },
            { name: "activity", type: "select", maxSelect: 1, values: ["sedentary", "light", "moderate", "high"], required: true },
            { name: "goal", type: "select", maxSelect: 1, values: ["bulking", "cutting", "maintenance"], required: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_body_profiles_owner ON body_profiles (owner)"],
    }));

    app.save(new Collection({
        type: "base",
        name: "nutrition_targets",
        fields: [
            owner,
            { ...day, name: "effectiveOn" },
            { name: "caloriesKcal", type: "number", onlyInt: true, min: 1, max: 10000, required: true },
            { name: "proteinPct", type: "number", onlyInt: true, min: 0, max: 100 },
            { name: "carbsPct", type: "number", onlyInt: true, min: 0, max: 100 },
            { name: "fatPct", type: "number", onlyInt: true, min: 0, max: 100 },
            { name: "waterMl", type: "number", onlyInt: true, min: 0, max: 10000 },
            { name: "goalWeightKg", type: "number", min: 0, max: 350 },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_nutrition_targets_owner_date ON nutrition_targets (owner, effectiveOn)"],
    }));

    app.save(new Collection({
        type: "base",
        name: "weight_entries",
        fields: [
            owner,
            { ...day, name: "loggedOn" },
            { name: "weightKg", type: "number", min: 30, max: 350, required: true },
        ],
        indexes: ["CREATE UNIQUE INDEX idx_weight_entries_owner_date ON weight_entries (owner, loggedOn)"],
    }));
}, (app) => {
    for (const name of ["weight_entries", "nutrition_targets", "body_profiles"]) {
        app.delete(app.findCollectionByNameOrId(name));
    }
});
