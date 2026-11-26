import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFood, searchUrl } from "../backend/pb_hooks/foods.js";

const nutrients = (values) => Object.entries(values).map(([nutrientNumber, [value, unitName]]) => ({ nutrientNumber, value, unitName }));

test("survey foods use their first named measure as the default serving", () => {
  assert.deepEqual(normalizeFood({
    fdcId: 2708402, dataType: "Survey (FNDDS)", description: "Rice, cooked, NFS",
    foodNutrients: nutrients({ 203: [2.67, "G"], 204: [0.28, "G"], 205: [27.99, "G"], 208: [129, "KCAL"] }),
    foodMeasures: [
      { disseminationText: "1 oz, dry, yields", gramWeight: 100 },
      { disseminationText: "Quantity not specified", gramWeight: 118 },
      { disseminationText: "1 cup, cooked", gramWeight: 158 },
    ],
  }), {
    fdcId: 2708402, name: "Rice, cooked, NFS", brand: null, referenceUnit: "g", referenceQuantity: 100,
    referenceCaloriesKcal: 129, referenceProteinG: 2.67, referenceCarbsG: 27.99, referenceFatG: 0.28,
    servingQuantity: 158, servingLabel: "1 cup, cooked",
  });
});

test("branded foods use the label serving and keep missing macros unavailable", () => {
  const food = normalizeFood({
    fdcId: 2032401, dataType: "Branded", description: "INDOFOOD, SAMBAL GORENG INSTANT SEASONING MIX",
    brandOwner: "Pt Indofood Sukses Makmur Tbk", servingSize: 9, servingSizeUnit: "g", householdServingFullText: "9 GRM",
    foodNutrients: nutrients({ 203: [11.1, "G"], 208: [222, "KCAL"] }),
  });
  assert.equal(food.name, "Indofood, sambal goreng instant seasoning mix");
  assert.equal(food.brand, "Pt Indofood Sukses Makmur Tbk");
  assert.deepEqual([food.servingQuantity, food.servingLabel], [9, "9 GRM"]);
  assert.deepEqual([food.referenceCarbsG, food.referenceFatG], [null, null]);
});

test("branded drinks are stated per 100 ml", () => {
  const food = normalizeFood({
    fdcId: 1, dataType: "Branded", description: "Tea", servingSize: 250, servingSizeUnit: "MLT",
    foodNutrients: nutrients({ 208: [30, "KCAL"] }),
  });
  assert.deepEqual([food.referenceUnit, food.servingQuantity, food.servingLabel], ["ml", 250, "250 ml"]);
});

test("foods without energy in kcal are left out, and Atwater energy is a fallback", () => {
  assert.equal(normalizeFood({ fdcId: 2, dataType: "SR Legacy", description: "X", foodNutrients: nutrients({ 268: [500, "kJ"] }) }), null);
  const food = normalizeFood({ fdcId: 3, dataType: "Foundation", description: "Y", foodNutrients: nutrients({ 958: [120, "KCAL"] }) });
  assert.equal(food.referenceCaloriesKcal, 120);
  assert.equal(food.servingQuantity, null);
});

test("search queries are encoded and data types stay comma separated", () => {
  const url = searchUrl("nasi & ayam", "KEY");
  assert.match(url, /query=nasi%20%26%20ayam&/);
  assert.match(url, /dataType=Survey%20\(FNDDS\),Foundation,SR%20Legacy,Branded&/);
});
