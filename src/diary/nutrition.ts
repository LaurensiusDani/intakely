export const mealLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks / Other",
};

export const macroFields = [
  { id: "referenceProteinG", label: "Protein" },
  { id: "referenceCarbsG", label: "Carbs" },
  { id: "referenceFatG", label: "Fat" },
] as const;

export type Entry = {
  id: string;
  loggedOn: string;
  meal: keyof typeof mealLabels;
  name: string;
  quantity: number;
  unit: "serving" | "g" | "ml";
  caloriesKcal: number;
  referenceQuantity?: number;
  referenceCaloriesKcal?: number;
} & Partial<Record<(typeof macroFields)[number]["id"], number>>;

export type DiaryTarget = { caloriesKcal: number; proteinGrams: number; waterMl: number | null };

export const diaryNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function portionUnit(unit: Entry["unit"], quantity: number) {
  return unit === "serving" && quantity !== 1 ? "servings" : unit;
}

export function nutritionAtQuantity(entry: Entry, quantity = entry.quantity) {
  const factor = quantity / (entry.referenceQuantity || entry.quantity);
  const macro = (field: (typeof macroFields)[number]["id"]) => {
    const value = entry[field];
    return value !== undefined && value >= 0 ? value * factor : null;
  };
  return {
    caloriesKcal: (entry.referenceCaloriesKcal ?? entry.caloriesKcal) * factor,
    proteinGrams: macro("referenceProteinG"),
    carbsGrams: macro("referenceCarbsG"),
    fatGrams: macro("referenceFatG"),
  };
}

export function dailyProtein(entries: Entry[], targetGrams: number | null) {
  let recordedGrams = 0;
  let partial = false;
  for (const entry of entries) {
    const protein = nutritionAtQuantity(entry).proteinGrams;
    if (protein === null) partial = true;
    else recordedGrams += protein;
  }
  return { recordedGrams, partial, leftGrams: targetGrams === null || partial ? null : Math.max(0, targetGrams - recordedGrams) };
}
