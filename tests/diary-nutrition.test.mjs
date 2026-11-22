import assert from "node:assert/strict";
import test from "node:test";
import { dailyProtein, nutritionAtQuantity, parseDiaryDecimal, validPortionQuantity } from "../src/diary/nutrition.ts";
import { createDiaryRecordId } from "../src/diary/recordId.ts";
import { referenceForEntry, scaledCalories } from "../backend/pb_hooks/diary.js";

const chicken = { name: "Dada Ayam", quantity: 1, caloriesKcal: 20 };

test("client-generated retry IDs satisfy the PocketBase and gateway record ID format", () => {
  assert.match(createDiaryRecordId(), /^[a-z0-9]{15}$/);
});

test("new entries preserve the food label while older clients can post total calories", () => {
  assert.deepEqual(referenceForEntry(chicken), { quantity: 1, calories: 20, consumedCalories: 20 });
  assert.deepEqual(referenceForEntry({
    quantity: 300, referenceQuantity: 200, referenceCaloriesKcal: 120, caloriesKcal: 1,
  }), { quantity: 200, calories: 120, consumedCalories: 180 });
  assert.equal(referenceForEntry({ quantity: 300, referenceQuantity: 200, caloriesKcal: 180 }), null);
  assert.equal(referenceForEntry({ quantity: 1, referenceQuantity: 0, referenceCaloriesKcal: 0 }), null);
  assert.equal(referenceForEntry({ quantity: 300, referenceQuantity: 1, referenceCaloriesKcal: 1000 }), null);
});

test("portion inputs accept decimal commas and refuse zero and invalid notation", () => {
  assert.equal(parseDiaryDecimal(" 1,5 "), 1.5);
  assert.equal(parseDiaryDecimal("0"), 0);
  assert.equal(validPortionQuantity(parseDiaryDecimal("0")), false);
  assert.equal(validPortionQuantity(parseDiaryDecimal("")), false);
  assert.equal(validPortionQuantity(parseDiaryDecimal("0x10")), false);
});

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
