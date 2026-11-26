const dataTypes = ["Survey (FNDDS)", "Foundation", "SR Legacy", "Branded"];

function nutrient(food, numbers, unitName) {
    for (const number of numbers) {
        const match = (food.foodNutrients || []).find((item) => item.nutrientNumber === number && item.unitName === unitName);
        if (match && Number.isFinite(match.value) && match.value >= 0) return match.value;
    }
    return null;
}

function displayName(description) {
    const name = String(description || "").trim();
    // Branded descriptions arrive in capitals; show them in sentence case.
    return name === name.toUpperCase() ? name.charAt(0) + name.slice(1).toLowerCase() : name;
}

function defaultServing(food, unit) {
    if (food.dataType === "Branded") {
        const servingUnit = String(food.servingSizeUnit || "").toLowerCase();
        const matches = unit === "ml" ? ["ml", "mlt"] : ["g", "grm"];
        if (!(food.servingSize > 0) || !matches.includes(servingUnit)) return null;
        const label = String(food.householdServingFullText || "").trim();
        return { quantity: food.servingSize, label: label || `${food.servingSize} ${unit}` };
    }
    // Skip FNDDS placeholders and "1 oz, dry, yields" measures, which describe the raw ingredient.
    const measure = (food.foodMeasures || []).find((item) => item.gramWeight > 0 && item.disseminationText
        && item.disseminationText !== "Quantity not specified" && !/\byields\b/.test(item.disseminationText));
    return measure ? { quantity: measure.gramWeight, label: measure.disseminationText } : null;
}

// USDA states nutrients per 100 g, or per 100 ml for branded foods served in milliliters.
function normalizeFood(food) {
    const caloriesKcal = nutrient(food, ["208", "958", "957"], "KCAL");
    if (!Number.isInteger(food.fdcId) || caloriesKcal === null) return null;
    const servingUnit = String(food.servingSizeUnit || "").toLowerCase();
    const unit = food.dataType === "Branded" && (servingUnit === "ml" || servingUnit === "mlt") ? "ml" : "g";
    const serving = defaultServing(food, unit);
    return {
        fdcId: food.fdcId,
        name: displayName(food.description).slice(0, 100),
        brand: food.dataType === "Branded" ? displayName(food.brandName || food.brandOwner) || null : null,
        referenceUnit: unit,
        referenceQuantity: 100,
        referenceCaloriesKcal: caloriesKcal,
        referenceProteinG: nutrient(food, ["203"], "G"),
        referenceCarbsG: nutrient(food, ["205"], "G"),
        referenceFatG: nutrient(food, ["204"], "G"),
        servingQuantity: serving ? serving.quantity : null,
        servingLabel: serving ? serving.label.slice(0, 100) : null,
    };
}

function searchUrl(query, apiKey) {
    return "https://api.nal.usda.gov/fdc/v1/foods/search?pageSize=25"
        + "&query=" + encodeURIComponent(query)
        // USDA splits dataType on literal commas, so only the names are encoded.
        + "&dataType=" + dataTypes.map(encodeURIComponent).join(",")
        + "&api_key=" + encodeURIComponent(apiKey);
}

module.exports = { normalizeFood, searchUrl };
