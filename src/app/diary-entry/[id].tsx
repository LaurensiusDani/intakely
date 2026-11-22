import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Screen } from "../../components/Screen";
import { dayLabel } from "../../diary/calendar";
import { diaryNumber, mealLabels, nutritionAtQuantity, portionUnit, type Entry } from "../../diary/nutrition";
import { deleteDiaryEntry, getDiaryEntry, updateDiaryServing } from "../../services/ApiService";
import { useSession } from "../../session";

export default function DiaryEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [quantityInput, setQuantityInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const token = session?.token;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void getDiaryEntry(token, id)
      .then((result) => {
        if (!active) return;
        setEntry(result);
        setQuantityInput(String(result.quantity));
      })
      .catch((problem) => { if (active) setError(problem instanceof Error ? problem.message : "Could not open this entry."); });
    return () => { active = false; };
  }, [id, token, attempt]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/diary");
  }

  const quantity = Number(quantityInput.trim().replace(",", "."));
  const valid = Number.isFinite(quantity) && quantity >= 0.001 && quantity <= 100000;
  const preview = entry ? nutritionAtQuantity(entry, valid ? quantity : entry.quantity) : null;

  async function save() {
    if (!entry || !token || busy) return;
    if (!entry.referenceQuantity) {
      setError("Serving edits require the latest Diary API.");
      return;
    }
    if (!valid || !preview || preview.caloriesKcal > 100000) {
      setError("Enter a valid serving amount.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await updateDiaryServing(token, id, quantity);
      close();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not update this entry.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!token || busy) return;
    setError("");
    setBusy(true);
    try {
      await deleteDiaryEntry(token, id);
      close();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not delete this entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Food Details">
      <Pressable accessibilityRole="button" disabled={busy} onPress={close} className="min-h-11 self-start justify-center">
        <Text className="font-semibold text-forest">‹ Back to Diary</Text>
      </Pressable>
      {entry && preview ? (
        <>
          <View className="gap-1">
            <Text className="text-2xl font-bold text-[#102127]">{entry.name}</Text>
            <Text className="text-forest-deep">{mealLabels[entry.meal]} · {dayLabel(entry.loggedOn)}</Text>
          </View>
          <View className="gap-2 rounded-2xl bg-forest-soft p-4">
            <Text className="text-base font-bold text-forest-deep">Serving amount</Text>
            <View className="flex-row items-center gap-3 rounded-xl border border-forest/25 bg-white px-3">
              <TextInput accessibilityLabel="Serving amount" keyboardType="decimal-pad" value={quantityInput}
                onChangeText={setQuantityInput} editable={!busy} className="min-h-12 flex-1 text-lg text-forest-deep" />
              <Text className="font-semibold text-forest-deep">{portionUnit(entry.unit, valid ? quantity : entry.quantity)}</Text>
            </View>
          </View>
          <View className="gap-2 rounded-2xl border border-forest/15 bg-[#FFFCF7] p-4">
            <Text accessibilityRole="header" className="text-lg font-bold text-[#102127]">Nutritional Information</Text>
            {[
              { label: "Calories", value: preview.caloriesKcal, unit: "kcal" },
              { label: "Protein", value: preview.proteinGrams, unit: "g" },
              { label: "Carbs", value: preview.carbsGrams, unit: "g" },
              { label: "Fat", value: preview.fatGrams, unit: "g" },
            ].map(({ label, value, unit }) => (
              <View key={label} className="flex-row justify-between gap-2 py-1">
                <Text className="text-forest-deep">{label}</Text>
                <Text className="font-semibold text-forest-deep">{value === null ? "Unavailable" : `${diaryNumber.format(value)} ${unit}`}</Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void save(); }}
            className="min-h-12 items-center justify-center rounded-xl bg-forest disabled:opacity-50">
            <Text className="font-bold text-white">{busy ? "Please wait…" : "Save serving"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy}
            onPress={() => Alert.alert("Delete food?", `Remove ${entry.name} from ${mealLabels[entry.meal]}?`, [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => { void remove(); } },
            ])}
            className="min-h-11 items-center justify-center">
            <Text className="font-semibold text-red-700">Delete from {mealLabels[entry.meal]}</Text>
          </Pressable>
        </>
      ) : error ? (
        <Pressable accessibilityRole="button" onPress={() => { setError(""); setAttempt(attempt + 1); }}>
          <Text className="py-2 font-semibold text-forest">Retry</Text>
        </Pressable>
      ) : <Text className="text-forest-deep">Loading entry…</Text>}
      {error ? <Text accessibilityRole="alert" className="text-red-700">{error}</Text> : null}
    </Screen>
  );
}
