const units = ["serving", "g", "ml"];

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

// Converts an amount logged in `unit` to the unit the reference nutrition is stated in.
// A named serving converts to grams or milliliters when the food defines its size.
function amountInReferenceUnit(quantity, unit, referenceUnit, servingQuantity) {
    if (unit === referenceUnit) return quantity;
    if (unit === "serving" && referenceUnit !== "serving" && servingQuantity > 0) return quantity * servingQuantity;
    return null;
}

function referenceForEntry(data) {
    if (!validQuantity(data.quantity)) return null;
    const hasReference = data.referenceQuantity !== undefined || data.referenceCaloriesKcal !== undefined;
    const quantity = hasReference ? data.referenceQuantity : data.quantity;
    const calories = hasReference ? data.referenceCaloriesKcal : data.caloriesKcal;
    if (!validQuantity(quantity) || !Number.isFinite(calories) || calories < 0 || calories > 100000) return null;

    const unit = data.referenceUnit ?? data.unit;
    const servingQuantity = data.servingQuantity ?? 0;
    if (!units.includes(unit) || (servingQuantity !== 0 && (!validQuantity(servingQuantity) || unit === "serving"))) {
        return null;
    }
    const consumed = amountInReferenceUnit(data.quantity, data.unit, unit, servingQuantity);
    if (consumed === null) return null;
    const consumedCalories = scaledCalories(consumed, quantity, calories);
    if (consumedCalories > 100000) return null;
    return { quantity, calories, consumedCalories, unit, servingQuantity };
}

module.exports = { validDiaryDate, validQuantity, scaledCalories, amountInReferenceUnit, referenceForEntry };
