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
  referenceUnit?: "serving" | "g" | "ml";
  servingQuantity?: number;
  servingLabel?: string;
  fdcId?: number;
} & Partial<Record<(typeof macroFields)[number]["id"], number>>;

export type DiaryTarget = { caloriesKcal: number; proteinGrams: number; waterMl: number | null };

export const diaryNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function parseDiaryDecimal(raw: string) {
  const value = raw.trim();
  return /^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value) ? Number(value.replace(",", ".")) : NaN;
}

export function validPortionQuantity(value: number) {
  return Number.isFinite(value) && value >= 0.001 && value <= 100000;
}

export function portionUnit(unit: Entry["unit"], quantity: number) {
  return unit === "serving" && quantity !== 1 ? "servings" : unit;
}

/** Units an entry can be logged in: its reference unit, plus a named serving when the food defines one. */
export function entryUnits(entry: Entry): Entry["unit"][] {
  const referenceUnit = entry.referenceUnit || entry.unit;
  return entry.servingQuantity && referenceUnit !== "serving" ? ["serving", referenceUnit] : [referenceUnit];
}

function amountInReferenceUnit(entry: Entry, quantity: number, unit: Entry["unit"]) {
  return unit === "serving" && (entry.referenceUnit || entry.unit) !== "serving" ? quantity * (entry.servingQuantity ?? 0) : quantity;
}

export function quantityInUnit(entry: Entry, quantity: number, from: Entry["unit"], to: Entry["unit"]) {
  if (from === to) return quantity;
  const amount = amountInReferenceUnit(entry, quantity, from);
  return to === "serving" ? amount / (entry.servingQuantity ?? 1) : amount;
}

export function portionText(entry: Entry, quantity = entry.quantity, unit = entry.unit) {
  const text = `${diaryNumber.format(quantity)} ${portionUnit(unit, quantity)}`;
  return unit === "serving" && entry.servingLabel ? `${text} (${entry.servingLabel})` : text;
}

export function nutritionAtQuantity(entry: Entry, quantity = entry.quantity, unit = entry.unit) {
  const factor = amountInReferenceUnit(entry, quantity, unit) / (entry.referenceQuantity || entry.quantity);
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
