migrate((app) => {
    const diary = app.findCollectionByNameOrId("diary_entries");
    diary.fields.add(new SelectField({ name: "referenceUnit", maxSelect: 1, values: ["serving", "g", "ml"] }));
    // Zero means the food has no named serving, so it can only be logged in referenceUnit.
    diary.fields.add(new NumberField({ name: "servingQuantity", min: 0, max: 100000 }));
    diary.fields.add(new TextField({ name: "servingLabel", max: 100 }));
    diary.fields.add(new NumberField({ name: "fdcId", onlyInt: true, min: 0 }));
    app.save(diary);
    app.db().newQuery("UPDATE diary_entries SET referenceUnit = unit").execute();
}, (app) => {
    const diary = app.findCollectionByNameOrId("diary_entries");
    for (const name of ["referenceUnit", "servingQuantity", "servingLabel", "fdcId"]) {
        diary.fields.removeByName(name);
    }
    app.save(diary);
});
