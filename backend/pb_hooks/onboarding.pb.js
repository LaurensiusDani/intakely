routerAdd("GET", "/api/intakely/onboarding", (e) => {
    const targets = e.app.findRecordsByFilter("nutrition_targets", "owner = {:owner}", "", 1, 0, { owner: e.auth.id });
    return e.json(200, { completed: targets.length > 0 });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/intakely/onboarding/estimate", (e) => {
    const { validBody, estimateCalories } = require(__hooks + "/onboarding.js");
    const body = e.requestInfo().body;
    if (!validBody(body)) {
        throw new BadRequestError("Check your age, body details, activity, and goal.");
    }
    const caloriesKcal = estimateCalories(body);
    if (caloriesKcal < 1200 || caloriesKcal > 10000) {
        throw new BadRequestError("This estimate is outside the supported range. Enter your own targets.");
    }
    return e.json(200, { caloriesKcal, proteinPct: 30, carbsPct: 45, fatPct: 25 });
}, $apis.requireAuth("users"));

routerAdd("POST", "/api/intakely/onboarding", (e) => {
    const { validTargets } = require(__hooks + "/onboarding.js");
    const data = e.requestInfo().body;
    if (!validTargets(data)) {
        throw new BadRequestError("Check your targets. Macro percentages must add up to 100%.");
    }

    const owner = e.auth.id;
    // Match Diary's WIB calendar for the initial targets and weigh-in.
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    e.app.runInTransaction((tx) => {
        const targets = tx.findRecordsByFilter("nutrition_targets", "owner = {:owner}", "", 1, 0, { owner });
        if (targets.length > 0) return;

        const target = new Record(tx.findCollectionByNameOrId("nutrition_targets"));
        target.set("owner", owner);
        target.set("effectiveOn", today);
        for (const field of ["caloriesKcal", "proteinPct", "carbsPct", "fatPct", "waterMl", "goalWeightKg"]) {
            if (data[field] != null) target.set(field, data[field]);
        }
        tx.save(target);

        if (data.body != null) {
            const profile = new Record(tx.findCollectionByNameOrId("body_profiles"));
            profile.set("owner", owner);
            for (const field of ["age", "heightCm", "sex", "activity", "goal"]) {
                profile.set(field, data.body[field]);
            }
            tx.save(profile);

            const weighIn = new Record(tx.findCollectionByNameOrId("weight_entries"));
            weighIn.set("owner", owner);
            weighIn.set("loggedOn", today);
            weighIn.set("weightKg", data.body.weightKg);
            tx.save(weighIn);
        }
    });

    return e.json(200, { completed: true });
}, $apis.requireAuth("users"));
