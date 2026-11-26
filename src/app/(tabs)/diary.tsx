import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { DiaryCalendar } from "../../components/DiaryCalendar";
import { Screen } from "../../components/Screen";
import { WaterTracker } from "../../components/WaterTracker";
import { dayLabel, shiftMonth, startOfMonth, todayInJakarta } from "../../diary/calendar";
import { dailyProtein, diaryNumber, macroFields, parseDiaryDecimal, portionText, validPortionQuantity, type DiaryTarget, type Entry } from "../../diary/nutrition";
import { createDiaryRecordId } from "../../diary/recordId";
import { createEntry, getDiaryTarget, listDiaryMonth } from "../../services/ApiService";
import { useSession } from "../../session";

const meals = [
  { id: "breakfast", label: "Breakfast", icon: require("../../../Design/Diary_Asset/Diary_Breakfast_YellowSun-Icon.png") },
  { id: "lunch", label: "Lunch", icon: require("../../../Design/Diary_Asset/Diary_Lunch_BlueSun-Icon.png") },
  { id: "dinner", label: "Dinner", icon: require("../../../Design/Diary_Asset/Diary_Dinner_PurpleMoon-Icon.png") },
  { id: "snacks", label: "Snacks / Other", icon: require("../../../Design/Diary_Asset/Diary_Snack_Apple-Icon.png") },
] as const;

type Meal = (typeof meals)[number];
type MacroField = (typeof macroFields)[number]["id"];
const portionUnits = [
  { id: "serving", label: "Servings" },
  { id: "g", label: "Grams (g)" },
  { id: "ml", label: "Milliliters (ml)" },
] as const;
const calorieIcon = require("../../../Design/Diary_Asset/Diary_YellowFire-Icon.png");
const proteinIcon = require("../../../Design/Diary_Asset/Diary_StrongArm-Icon.png");

export default function DiaryScreen() {
  const { session } = useSession();
  const [day, setDay] = useState(todayInJakarta);
  const [expandedMeal, setExpandedMeal] = useState<Meal["id"] | null>(null);
  const [meal, setMeal] = useState<Meal>(meals[0]);
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [unit, setUnit] = useState<Entry["unit"]>("serving");
  const [referenceAmount, setReferenceAmount] = useState("1");
  const [consumedAmount, setConsumedAmount] = useState("1");
  const [macros, setMacros] = useState<Partial<Record<MacroField, string>>>({});
  const [targetResult, setTargetResult] = useState<{ day: string; target: DiaryTarget | null; failed?: boolean }>();
  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const draftIds = useRef(new Map<string, string>());
  const saveInFlight = useRef(false);
  const reloadOnReturn = useRef(false);
  const token = session?.token;
  const owner = session?.record.id;
  const monthStart = startOfMonth(day);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void listDiaryMonth(token, monthStart, shiftMonth(monthStart, 1))
      .then((results) => {
        if (active) setItems(results);
      })
      .catch((problem) => {
        if (active) setLoadError(problem instanceof Error ? problem.message : "Could not load Diary.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [monthStart, token, refresh]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void getDiaryTarget(token, day)
      .then((target) => { if (active) setTargetResult({ day, target }); })
      .catch(() => { if (active) setTargetResult({ day, target: null, failed: true }); });
    return () => { active = false; };
  }, [day, token, refresh]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError("");
    setRefresh((count) => count + 1);
  }, []);

  useFocusEffect(useCallback(() => {
    if (reloadOnReturn.current) {
      reloadOnReturn.current = false;
      reload();
    }
  }, [reload]));

  function selectDay(date: string) {
    if (saveInFlight.current || date > todayInJakarta() || date === day) return;
    if (startOfMonth(date) !== monthStart) {
      setItems([]);
      setLoading(true);
      setLoadError("");
    }
    setSaveError("");
    setDay(date);
  }

  const referenceQuantity = parseDiaryDecimal(referenceAmount);
  const quantity = parseDiaryDecimal(consumedAmount);
  const referenceCaloriesKcal = parseDiaryDecimal(calories);
  const validPortions = validPortionQuantity(referenceQuantity) && validPortionQuantity(quantity);
  const validCalories = Number.isFinite(referenceCaloriesKcal) && referenceCaloriesKcal >= 0 && referenceCaloriesKcal <= 100000;
  const caloriesKcal = quantity / referenceQuantity * referenceCaloriesKcal;

  async function addFood() {
    if (!token || !owner || saveInFlight.current || loading || day > todayInJakarta()) return;
    if (!name.trim() || !validCalories) {
      setSaveError("Enter a food name and a calorie amount from 0 to 100,000.");
      return;
    }
    if (!validPortions || caloriesKcal > 100000) {
      setSaveError("Use amounts from 0.001 to 100,000, with no more than 100,000 kcal consumed.");
      return;
    }
    const nutrition: Partial<Record<MacroField, number>> = {};
    for (const { id, label } of macroFields) {
      const raw = macros[id]?.trim();
      if (!raw) continue;
      const grams = parseDiaryDecimal(raw);
      if (!Number.isFinite(grams) || grams < 0 || grams > 100000) {
        setSaveError(`Enter ${label.toLowerCase()} from 0 to 100,000 g, or leave it blank.`);
        return;
      }
      nutrition[id] = grams;
    }
    saveInFlight.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const id = draftIds.current.get(day) ?? createDiaryRecordId();
      draftIds.current.set(day, id);
      const saved = await createEntry(token, {
        id, owner, loggedOn: day, meal: meal.id, name: name.trim(),
        quantity, unit, caloriesKcal, referenceQuantity, referenceCaloriesKcal, ...nutrition,
      });
      draftIds.current.clear();
      setName("");
      setCalories("");
      setUnit("serving");
      setReferenceAmount("1");
      setConsumedAmount("1");
      setMacros({});
      setExpandedMeal(meal.id);
      setItems((current) => [...current.filter((item) => item.id !== saved.id), saved]);
      if (loadError) reload();
    } catch (problem) {
      setSaveError(problem instanceof Error ? problem.message : "Could not save. Try again.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  const input = "rounded-xl border border-forest/30 bg-white px-4 py-3 text-base text-forest-deep";
  const dayItems = items.filter((item) => item.loggedOn === day);
  const recorded = new Set(items.map((item) => item.loggedOn));
  const total = dayItems.reduce((sum, item) => sum + item.caloriesKcal, 0);
  const selectedTarget = targetResult?.day === day ? targetResult : undefined;
  const target = selectedTarget?.target;
  const protein = dailyProtein(dayItems, target?.proteinGrams ?? null);
  const proteinRecorded = diaryNumber.format(protein.recordedGrams);
  let proteinValue = `${proteinRecorded} g recorded`;
  let proteinNote = selectedTarget?.failed ? "Target unavailable" : !selectedTarget ? "Loading target…" : "No target set for this date";
  if (protein.leftGrams !== null && target) {
    proteinValue = `${diaryNumber.format(protein.leftGrams)} g protein left`;
    proteinNote = `${proteinRecorded} of ${diaryNumber.format(target.proteinGrams)} g recorded`;
  }
  if (protein.partial) {
    proteinValue = `${proteinRecorded} g known protein`;
    proteinNote = "Some foods have no protein data";
  }
  return (
    <Screen title="Diary">
      <DiaryCalendar selected={day} today={todayInJakarta()} recorded={recorded} disabled={saving} onSelect={selectDay} />
      <View className="flex-row items-center gap-3 rounded-2xl bg-forest-soft p-4">
        <Image source={calorieIcon} accessible={false} resizeMode="contain" className="h-8 w-8" />
        <View className="flex-1">
          <Text className="text-sm text-forest-deep">{dayLabel(day)}</Text>
          <Text className="text-xl font-bold text-forest-deep">
            {loading ? "Loading…" : loadError ? "Diary unavailable" : `${diaryNumber.format(total)} kcal recorded`}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-3 rounded-2xl bg-forest-soft p-4">
        <Image source={proteinIcon} accessible={false} resizeMode="contain" className="h-8 w-8" />
        <View className="flex-1">
          <Text className="text-lg font-bold text-forest-deep">
            {loading ? "Loading protein…" : loadError ? "Protein unavailable" : proteinValue}
          </Text>
          {!loading && !loadError && <Text className="text-sm text-forest-deep">{proteinNote}</Text>}
        </View>
      </View>
      {loadError ? <Text accessibilityRole="alert" className="text-red-700">{loadError}</Text> : null}
      <Pressable accessibilityRole="button" onPress={reload} disabled={loading || saving}>
        <Text className="py-2 font-semibold text-forest">{loadError ? "Retry" : "Refresh entries"}</Text>
      </Pressable>
      {meals.map((group) => {
        const expanded = expandedMeal === group.id;
        const groupItems = dayItems.filter((item) => item.meal === group.id);
        return (
          <View key={group.id} className="rounded-2xl border border-forest/15 bg-[#FFFCF7]">
            <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
              onPress={() => setExpandedMeal(expanded ? null : group.id)}
              className="min-h-16 flex-row items-center gap-3 p-3">
              <Image source={group.icon} accessible={false} resizeMode="contain" className="h-9 w-9" />
              <View className="flex-1">
                <Text className="text-lg font-bold text-[#102127]">{group.label}</Text>
                {!loading && !loadError && (
                  <Text className="text-sm text-forest-deep">
                    {groupItems.length ? `${diaryNumber.format(groupItems.reduce((sum, item) => sum + item.caloriesKcal, 0))} kcal` : "No food recorded"}
                  </Text>
                )}
              </View>
              <SymbolView
                name={expanded ? { android: "expand_more", ios: "chevron.down", web: "expand_more" }
                  : { android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
                size={22} tintColor="#102127"
              />
            </Pressable>
            {expanded && (
              <View className="border-t border-forest/15 px-4">
                {groupItems.map((item) => (
                  <Pressable key={item.id} accessibilityRole="button" accessibilityHint="Opens food details"
                    disabled={saving} onPress={() => {
                      reloadOnReturn.current = true;
                      router.push({ pathname: "/diary-entry/[id]", params: { id: item.id } });
                    }}
                    className="min-h-12 flex-row items-center justify-between gap-2 border-b border-forest/10 py-2">
                    <Text className="flex-1 text-forest-deep">{item.name} · {portionText(item)}</Text>
                    <Text className="text-forest-deep">{diaryNumber.format(item.caloriesKcal)} kcal</Text>
                    <SymbolView name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }} size={18} tintColor="#0F4D39" />
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" disabled={saving || loading || !!loadError}
                  onPress={() => {
                    reloadOnReturn.current = true;
                    router.push({ pathname: "/food-search", params: { day, meal: group.id } });
                  }}
                  className="min-h-12 flex-row items-center gap-2 py-2 disabled:opacity-50">
                  <SymbolView name={{ android: "search", ios: "magnifyingglass", web: "search" }} size={18} tintColor="#176B50" />
                  <Text className="font-semibold text-forest">Search foods to add</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
      {token && owner && <WaterTracker key={day} day={day} token={token} owner={owner} targetMl={target?.waterMl ?? null} />}
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl font-semibold text-forest-deep">Add food manually</Text>
        <View className="flex-row flex-wrap gap-2">
          {meals.map((option) => (
            <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: meal.id === option.id }}
              onPress={() => { if (meal.id !== option.id) draftIds.current.clear(); setMeal(option); }} disabled={saving}
              className={meal.id === option.id ? "rounded-full bg-forest px-3 py-2" : "rounded-full bg-forest-soft px-3 py-2"}>
              <Text className={meal.id === option.id ? "text-white" : "text-forest-deep"}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput accessibilityLabel="Food name" className={input} placeholder="Food name"
          value={name} onChangeText={(value) => { draftIds.current.clear(); setName(value); }}
          maxLength={100} editable={!saving} />
        <Text className="font-semibold text-forest-deep">Portion unit</Text>
        <View className="flex-row flex-wrap gap-2">
          {portionUnits.map((option) => (
            <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: unit === option.id }}
              disabled={saving} onPress={() => {
                if (unit === option.id) return;
                draftIds.current.clear();
                setUnit(option.id);
                const amount = option.id === "serving" ? "1" : "100";
                setReferenceAmount(amount);
                setConsumedAmount(amount);
              }}
              className={unit === option.id ? "rounded-full bg-forest px-3 py-2" : "rounded-full bg-forest-soft px-3 py-2"}>
              <Text className={unit === option.id ? "text-white" : "text-forest-deep"}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-row gap-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-semibold text-forest-deep">Reference ({unit})</Text>
            <TextInput accessibilityLabel={`Reference amount in ${unit}`} className={input}
              value={referenceAmount} onChangeText={(value) => { draftIds.current.clear(); setReferenceAmount(value); }}
              keyboardType="decimal-pad" editable={!saving} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-semibold text-forest-deep">Consumed ({unit})</Text>
            <TextInput accessibilityLabel={`Consumed amount in ${unit}`} className={input}
              value={consumedAmount} onChangeText={(value) => { draftIds.current.clear(); setConsumedAmount(value); }}
              keyboardType="decimal-pad" editable={!saving} />
          </View>
        </View>
        <TextInput accessibilityLabel="Calories per reference amount" className={input} placeholder="Calories per reference amount"
          value={calories} onChangeText={(value) => { draftIds.current.clear(); setCalories(value); }}
          keyboardType="decimal-pad" editable={!saving} />
        <Text className="text-sm text-forest-deep">Optional nutrition per reference amount</Text>
        <View className="flex-row gap-2">
          {macroFields.map(({ id, label }) => (
            <TextInput key={id} accessibilityLabel={`${label} in grams per reference amount`}
              className="min-w-0 flex-1 rounded-xl border border-forest/30 bg-white px-2 py-3 text-forest-deep"
              placeholder={`${label} (g)`} value={macros[id] ?? ""} keyboardType="decimal-pad" editable={!saving}
              onChangeText={(value) => { draftIds.current.clear(); setMacros((current) => ({ ...current, [id]: value })); }} />
          ))}
        </View>
        {validPortions && validCalories && caloriesKcal <= 100000 && (
          <Text className="font-semibold text-forest-deep">{diaryNumber.format(caloriesKcal)} kcal to log</Text>
        )}
        {saveError ? <Text accessibilityRole="alert" className="text-red-700">{saveError}</Text> : null}
        <Pressable accessibilityRole="button" onPress={addFood} disabled={saving || loading}
          className="items-center rounded-xl bg-forest p-4 disabled:opacity-65">
          <Text className="font-semibold text-white">{saving ? "Saving…" : "Save food"}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
