onRecordCreateRequest((e) => {
    const calories = e.requestInfo().body.caloriesKcal;
    if (typeof calories !== "number" || !isFinite(calories)) {
        throw new BadRequestError("Enter calories as a number.");
    }
    return e.next();
}, "diary_entries");

onRecordValidate((e) => {
    const loggedOn = e.record.getString("loggedOn");
    const parsed = new Date(loggedOn + "T00:00:00Z");
    // shortcut: WIB is the course deployment's calendar, upgrade when supporting other time zones.
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== loggedOn || loggedOn > today) {
        throw new BadRequestError("Choose a valid date through today (WIB).");
    }

    e.record.set("name", e.record.getString("name").trim());
    return e.next();
}, "diary_entries");
