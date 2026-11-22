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

module.exports = { validDiaryDate, validQuantity, scaledCalories };
