import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../components/Screen";
import { dayLabel } from "../diary/calendar";
import { diaryNumber, macroFields, mealLabels, type Entry } from "../diary/nutrition";
import { createDiaryRecordId } from "../diary/recordId";
import { createEntry, searchFoods } from "../services/ApiService";
import { useSession } from "../session";

type Food = {
  fdcId: number;
  name: string;
  brand: string | null;
  referenceUnit: "g" | "ml";
  referenceQuantity: number;
  referenceCaloriesKcal: number;
  referenceProteinG: number | null;
  referenceCarbsG: number | null;
  referenceFatG: number | null;
  servingQuantity: number | null;
  servingLabel: string | null;
};

/** The default portion a food is saved with: one named serving, or 100 g/ml. */
function defaultPortion(food: Food) {
  const quantity = food.servingQuantity ? 1 : food.referenceQuantity;
  const unit: Entry["unit"] = food.servingQuantity ? "serving" : food.referenceUnit;
  const amount = food.servingQuantity ?? food.referenceQuantity;
  const caloriesKcal = amount / food.referenceQuantity * food.referenceCaloriesKcal;
  const label = food.servingQuantity
    ? `${food.servingLabel} · ${diaryNumber.format(amount)} ${food.referenceUnit}`
    : `${diaryNumber.format(amount)} ${food.referenceUnit}`;
  return { quantity, unit, caloriesKcal, label };
}

export default function FoodSearchScreen() {
  const { day, meal } = useLocalSearchParams<{ day: string; meal: keyof typeof mealLabels }>();
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[] | null>(null);
  const [selected, setSelected] = useState<Map<number, Food>>(new Map());
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const recordIds = useRef(new Map<number, string>());
  const token = session?.token;
  const owner = session?.record.id;
  const validMeal = meal in mealLabels;

  async function search() {
    const text = query.trim();
    if (!token || searching || saving) return;
    if (text.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setResults(await searchFoods(token, text));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not search foods. Try again.");
    } finally {
      setSearching(false);
    }
  }

  function toggle(food: Food) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(food.fdcId)) next.delete(food.fdcId);
      else next.set(food.fdcId, food);
      return next;
    });
  }

  async function addSelected() {
    if (!token || !owner || !validMeal || saving || selected.size === 0) return;
    setSaving(true);
    setError("");
    try {
      for (const food of selected.values()) {
        // Reuse the record ID on retry so a save that reached the server isn't logged twice.
        const id = recordIds.current.get(food.fdcId) ?? createDiaryRecordId();
        recordIds.current.set(food.fdcId, id);
        const portion = defaultPortion(food);
        const macros = Object.fromEntries(macroFields.flatMap(({ id: field }) =>
          food[field] === null ? [] : [[field, food[field]]]));
        await createEntry(token, {
          id, owner, loggedOn: day, meal, name: food.name, fdcId: food.fdcId,
          quantity: portion.quantity, unit: portion.unit, caloriesKcal: portion.caloriesKcal,
          referenceUnit: food.referenceUnit, referenceQuantity: food.referenceQuantity,
          referenceCaloriesKcal: food.referenceCaloriesKcal,
          ...(food.servingQuantity && { servingQuantity: food.servingQuantity, servingLabel: food.servingLabel ?? "" }),
          ...macros,
        });
        setSelected((current) => {
          const next = new Map(current);
          next.delete(food.fdcId);
          return next;
        });
      }
      if (router.canGoBack()) router.back();
      else router.replace("/diary");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const busy = searching || saving;
  return (
    <Screen title="Search Foods">
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => router.back()} className="min-h-11 self-start justify-center">
        <Text className="font-semibold text-forest">‹ Back to Diary</Text>
      </Pressable>
      {validMeal ? (
        <Text className="text-forest-deep">Adding to {mealLabels[meal]} · {dayLabel(day)}</Text>
      ) : (
        <Text accessibilityRole="alert" className="text-red-700">Open this screen from a Diary meal.</Text>
      )}
      <View className="flex-row gap-2">
        <TextInput accessibilityLabel="Food search" placeholder="Search foods, e.g. rice cooked"
          value={query} onChangeText={setQuery} onSubmitEditing={() => { void search(); }}
          returnKeyType="search" autoCorrect={false} maxLength={100} editable={!saving}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-forest/30 bg-white px-4 text-base text-forest-deep" />
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void search(); }}
          className="min-h-12 items-center justify-center rounded-xl bg-forest px-4 disabled:opacity-65">
          <Text className="font-semibold text-white">{searching ? "Searching…" : "Search"}</Text>
        </Pressable>
      </View>
      <Text className="text-xs text-forest-deep/80">Nutrition data from USDA FoodData Central. Search in English for the best results.</Text>
      {error ? <Text accessibilityRole="alert" className="text-red-700">{error}</Text> : null}
      {selected.size > 0 && (
        <Pressable accessibilityRole="button" disabled={saving || !validMeal} onPress={() => { void addSelected(); }}
          className="min-h-12 items-center justify-center rounded-xl bg-forest p-4 disabled:opacity-65">
          <Text className="font-semibold text-white">
            {saving ? "Saving…" : `Add ${selected.size} ${selected.size === 1 ? "food" : "foods"} to ${validMeal ? mealLabels[meal] : "Diary"}`}
          </Text>
        </Pressable>
      )}
      {results && results.length === 0 && (
        <Text className="text-forest-deep">No foods found. Try another name, or add the food manually in Diary.</Text>
      )}
      {results && results.length > 0 && (
        <View className="rounded-2xl border border-forest/15 bg-[#FFFCF7] px-3">
          {results.map((food, index) => {
            const checked = selected.has(food.fdcId);
            const portion = defaultPortion(food);
            return (
              <Pressable key={food.fdcId} accessibilityRole="checkbox" accessibilityState={{ checked, disabled: saving }}
                disabled={saving} onPress={() => toggle(food)}
                className={`min-h-16 flex-row items-center gap-3 py-3 ${index ? "border-t border-forest/15" : ""}`}>
                <SymbolView
                  name={checked
                    ? { android: "check_box", ios: "checkmark.square.fill", web: "check_box" }
                    : { android: "check_box_outline_blank", ios: "square", web: "check_box_outline_blank" }}
                  size={24} tintColor="#176B50"
                />
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-[#102127]">{food.name}</Text>
                  {food.brand ? <Text className="text-xs text-forest-deep/80">{food.brand}</Text> : null}
                  <Text className="text-sm text-forest-deep">{portion.label}</Text>
                </View>
                <Text className="font-semibold text-forest-deep">{diaryNumber.format(portion.caloriesKcal)} kcal</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
