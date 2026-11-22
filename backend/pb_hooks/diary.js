function validDiaryDate(day, now = Date.now()) {
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const parsed = new Date(day + "T00:00:00Z");
    const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day && day <= today;
}

function validQuantity(quantity) {
    return Number.isFinite(quantity) && quantity >= 0.001 && quantity <= 100000;
}

function scaledCalories(quantity, referenceQuantity, referenceCalories) {
    return quantity / referenceQuantity * referenceCalories;
}

function referenceForEntry(data) {
    if (!validQuantity(data.quantity)) return null;
    const hasReference = data.referenceQuantity !== undefined || data.referenceCaloriesKcal !== undefined;
    const quantity = hasReference ? data.referenceQuantity : data.quantity;
    const calories = hasReference ? data.referenceCaloriesKcal : data.caloriesKcal;
    if (!validQuantity(quantity) || !Number.isFinite(calories) || calories < 0 || calories > 100000) return null;
    const consumedCalories = scaledCalories(data.quantity, quantity, calories);
    if (consumedCalories > 100000) return null;
    return { quantity, calories, consumedCalories };
}

module.exports = { validDiaryDate, validQuantity, scaledCalories, referenceForEntry };
