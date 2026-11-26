onRecordCreateRequest((e) => {
    const { referenceForEntry } = require(__hooks + "/diary.js");
    const data = e.requestInfo().body;
    const reference = referenceForEntry(data);
    if (!reference) {
        throw new BadRequestError("Enter valid reference calories and portion amounts.");
    }

    e.record.set("referenceQuantity", reference.quantity);
    e.record.set("referenceCaloriesKcal", reference.calories);
    e.record.set("referenceUnit", reference.unit);
    e.record.set("servingQuantity", reference.servingQuantity);
    const servingLabel = typeof data.servingLabel === "string" ? data.servingLabel.trim() : "";
    if (servingLabel.length > 100) throw new BadRequestError("Serving labels can have up to 100 characters.");
    e.record.set("servingLabel", reference.servingQuantity ? servingLabel : "");
    if (data.fdcId != null && !(Number.isInteger(data.fdcId) && data.fdcId > 0)) {
        throw new BadRequestError("Choose a food from the search results.");
    }
    e.record.set("fdcId", data.fdcId ?? 0);
    for (const field of ["referenceProteinG", "referenceCarbsG", "referenceFatG"]) {
        const amount = data[field];
        if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 100000)) {
            throw new BadRequestError("Enter valid macro amounts or leave them blank.");
        }
        // PocketBase number fields default to zero, so -1 represents an unavailable macro.
        e.record.set(field, amount == null ? -1 : amount);
    }
    e.record.set("caloriesKcal", reference.consumedCalories);
    return e.next();
}, "diary_entries");

onRecordUpdateRequest((e) => {
    const { validQuantity, scaledCalories, amountInReferenceUnit } = require(__hooks + "/diary.js");
    const data = e.requestInfo().body;
    const keys = Object.keys(data);
    if (!keys.includes("quantity") || keys.some((key) => key !== "quantity" && key !== "unit") || !validQuantity(data.quantity)) {
        throw new BadRequestError("Enter a valid serving amount.");
    }
    const unit = data.unit ?? e.record.getString("unit");
    const amount = amountInReferenceUnit(
        data.quantity, unit, e.record.getString("referenceUnit"), e.record.getFloat("servingQuantity"),
    );
    if (amount === null) throw new BadRequestError("This food can't be logged in that unit.");
    const calories = scaledCalories(amount, e.record.getFloat("referenceQuantity"), e.record.getFloat("referenceCaloriesKcal"));
    if (!Number.isFinite(calories) || calories > 100000) {
        throw new BadRequestError("This serving is outside the supported calorie range.");
    }
    e.record.set("unit", unit);
    e.record.set("caloriesKcal", calories);
    return e.next();
}, "diary_entries");

onRecordValidate((e) => {
    const { validDiaryDate } = require(__hooks + "/diary.js");
    if (!validDiaryDate(e.record.getString("loggedOn"))) {
        throw new BadRequestError("Choose a valid date through today (WIB).");
    }
    return e.next();
}, "diary_entries", "water_entries");

onRecordValidate((e) => {
    e.record.set("name", e.record.getString("name").trim());
    return e.next();
}, "diary_entries");

routerAdd("GET", "/api/intakely/diary-targets", (e) => {
    const { validDiaryDate } = require(__hooks + "/diary.js");
    const day = e.request.url.query().get("day");
    if (!validDiaryDate(day)) throw new BadRequestError("Choose a valid date through today (WIB).");

    const targets = e.app.findRecordsByFilter(
        "nutrition_targets", "owner = {:owner} && effectiveOn <= {:day}", "-effectiveOn", 1, 0, { owner: e.auth.id, day },
    );
    const target = targets[0];
    if (!target) return e.json(200, { target: null });
    const caloriesKcal = target.getFloat("caloriesKcal");
    return e.json(200, {
        target: {
            caloriesKcal,
            proteinGrams: caloriesKcal * target.getFloat("proteinPct") / 400,
            waterMl: target.getInt("waterMl") || null,
        },
    });
}, $apis.requireAuth("users"));
