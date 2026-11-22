import assert from "node:assert/strict";
import test from "node:test";
import { dailyProtein, nutritionAtQuantity } from "../src/diary/nutrition.ts";
import { scaledCalories } from "../backend/pb_hooks/diary.js";

const chicken = { name: "Dada Ayam", quantity: 1, caloriesKcal: 20 };

test("old diary entries can scale calories with unavailable macros", () => {
  assert.deepEqual(nutritionAtQuantity(chicken, 2), {
    caloriesKcal: 40, proteinGrams: null, carbsGrams: null, fatGrams: null,
  });
});

test("changing a portion uses the reference nutrition after prior edits", () => {
  const drink = {
    quantity: 300, caloriesKcal: 180, referenceQuantity: 200, referenceCaloriesKcal: 120,
    referenceProteinG: 10, referenceCarbsG: 0, referenceFatG: -1,
  };
  const expected = scaledCalories(250, drink.referenceQuantity, drink.referenceCaloriesKcal);
  assert.equal(expected, 150);
  assert.deepEqual(nutritionAtQuantity(drink, 250), {
    caloriesKcal: expected, proteinGrams: 12.5, carbsGrams: 0, fatGrams: null,
  });
});

test("protein remaining uses complete data and clamps at zero", () => {
  const measured = { ...chicken, referenceProteinG: 10 };
  const trackedZero = { ...chicken, referenceProteinG: 0 };
  assert.deepEqual(dailyProtein([measured, trackedZero], 35), {
    recordedGrams: 10, partial: false, leftGrams: 25,
  });
  assert.equal(dailyProtein([measured], 4).leftGrams, 0);
  assert.equal(dailyProtein([measured], null).leftGrams, null);
  assert.deepEqual(dailyProtein([measured, chicken], 35), {
    recordedGrams: 10, partial: true, leftGrams: null,
  });
});
