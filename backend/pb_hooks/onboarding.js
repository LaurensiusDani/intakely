const activityFactors = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725 };
const goalOffsets = { bulking: 200, cutting: -200, maintenance: 0 };

function bounded(value, low, high) {
    return Number.isFinite(value) && value >= low && value <= high;
}

function validBody(body) {
    return !!body && Number.isInteger(body.age) && bounded(body.age, 18, 120)
        && bounded(body.heightCm, 100, 250) && bounded(body.weightKg, 30, 350)
        && ["male", "female"].includes(body.sex)
        && Object.prototype.hasOwnProperty.call(activityFactors, body.activity)
        && Object.prototype.hasOwnProperty.call(goalOffsets, body.goal);
}

function estimateCalories(body) {
    // Mifflin–St Jeor estimates resting expenditure. Activity factors and goal offsets are app defaults.
    const resting = 10 * body.weightKg + 6.25 * body.heightCm - 5 * body.age
        + (body.sex === "male" ? 5 : -161);
    const daily = resting * activityFactors[body.activity] + goalOffsets[body.goal];
    return Math.round(Math.max(resting, daily) / 10) * 10;
}

function validTargets(data) {
    const percentages = [data.proteinPct, data.carbsPct, data.fatPct];
    return Number.isInteger(data.caloriesKcal) && bounded(data.caloriesKcal, 1, 10000)
        && percentages.every((value) => Number.isInteger(value) && bounded(value, 0, 100))
        && percentages.reduce((sum, value) => sum + value, 0) === 100
        && (data.waterMl == null || (Number.isInteger(data.waterMl) && bounded(data.waterMl, 1, 10000)))
        && (data.goalWeightKg == null || bounded(data.goalWeightKg, 30, 350))
        && (data.body == null || validBody(data.body));
}

module.exports = { validBody, estimateCalories, validTargets };
