import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { diaryNumber } from "../diary/nutrition";
import { createWaterEntry, deleteWaterEntry, listWaterEntries, updateWaterEntry } from "../services/ApiService";

const drop = require("../../Design/Diary_Asset/Diary_Water_BlueWaterDroplet-Icon.png");
type WaterEntry = { id: string; amountMl: number };

export function WaterTracker({ day, token, owner, targetMl }: { day: string; token: string; owner: string; targetMl: number | null }) {
  const [entries, setEntries] = useState<WaterEntry[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [custom, setCustom] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [editing, setEditing] = useState<WaterEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const draft = useRef<{ id: string; amountMl: number } | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    void listWaterEntries(token, day)
      .then((result) => { if (active) setEntries(result); })
      .catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load water entries."); });
    return () => { active = false; };
  }, [day, token, attempt]);

  async function save(amountMl: number, existing?: WaterEntry) {
    if (!entries || saving.current) return;
    if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 10000) {
      setSaveError("Enter a whole amount from 1 to 10,000 ml.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setSaveError("");
    try {
      if (existing) {
        const updated = await updateWaterEntry(token, existing.id, amountMl);
        setEntries((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
        setEditing(null);
      } else {
        if (draft.current?.amountMl !== amountMl) {
          draft.current = { id: randomUUID().replace(/-/g, "").slice(0, 15), amountMl };
        }
        const saved = await createWaterEntry(token, { ...draft.current, owner, loggedOn: day });
        setEntries((current) => [...(current ?? []).filter((item) => item.id !== saved.id), saved]);
        draft.current = null;
        setAddingCustom(false);
      }
      setCustom("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save water. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  async function remove(entry: WaterEntry) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setSaveError("");
    try {
      await deleteWaterEntry(token, entry.id);
      setEntries((current) => current?.filter((item) => item.id !== entry.id) ?? null);
      setEditing(null);
      setCustom("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not delete water entry.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const total = entries?.reduce((sum, entry) => sum + entry.amountMl, 0) ?? 0;
  return (
    <View className="gap-3 rounded-2xl border border-forest/15 bg-[#FFFCF7] p-4">
      <View className="flex-row items-center gap-2">
        <Image source={drop} accessible={false} resizeMode="contain" className="h-7 w-7" />
        <Text accessibilityRole="header" className="flex-1 text-lg font-bold text-[#102127]">Water</Text>
        {entries && (
          <Text className="font-semibold text-forest-deep">
            {diaryNumber.format(total)}{targetMl ? ` / ${diaryNumber.format(targetMl)}` : ""} ml
          </Text>
        )}
      </View>
      {entries && targetMl ? (
        <>
          <View className="h-2 overflow-hidden rounded-full bg-forest-soft">
            <View className="h-full rounded-full bg-forest" style={{ width: `${Math.min(100, total / targetMl * 100)}%` }} />
          </View>
          <Text className="text-xs text-forest-deep">{diaryNumber.format(Math.max(0, targetMl - total))} ml left</Text>
        </>
      ) : null}
      {!entries && (
        loadError ? <>
          <Text accessibilityRole="alert" className="text-red-700">{loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => { setLoadError(""); setAttempt(attempt + 1); }}>
            <Text className="py-2 font-semibold text-forest">Retry water</Text>
          </Pressable>
        </> : <Text className="text-forest-deep">Loading water…</Text>
      )}
      {entries && (
        <>
          <View className="flex-row gap-2">
            {[100, 250, 500].map((amountMl) => (
              <Pressable key={amountMl} accessibilityRole="button" disabled={busy} onPress={() => { void save(amountMl); }}
                className="min-h-11 flex-1 items-center justify-center rounded-full bg-forest-soft px-1 disabled:opacity-50">
                <Text className="text-center font-semibold text-forest">+{amountMl} ml</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row justify-between gap-3">
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setEditing(null); setCustom(""); setAddingCustom(!addingCustom); }}>
              <Text className="py-2 font-semibold text-forest">Add custom</Text>
            </Pressable>
            {entries.length ? (
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: showLog }} onPress={() => setShowLog(!showLog)}>
                <Text className="py-2 font-semibold text-forest">{showLog ? "Hide entries" : "View entries"}</Text>
              </Pressable>
            ) : null}
          </View>
          {showLog && entries.map((entry) => (
            <Pressable key={entry.id} accessibilityRole="button" disabled={busy}
              onPress={() => { setEditing(entry); setAddingCustom(false); setCustom(String(entry.amountMl)); }}
              accessibilityLabel={`Edit water entry of ${entry.amountMl} milliliters`}
              className="flex-row justify-between gap-2 border-t border-forest/15 py-3">
              <Text className="text-forest-deep">{diaryNumber.format(entry.amountMl)} ml</Text>
              <Text className="font-semibold text-forest">Edit</Text>
            </Pressable>
          ))}
          {(addingCustom || editing) && (
            <View className="gap-2">
              <TextInput accessibilityLabel="Water amount in milliliters" placeholder="Water amount (ml)"
                keyboardType="number-pad" value={custom} onChangeText={setCustom} editable={!busy}
                className="min-h-12 rounded-xl border border-forest/25 bg-white px-3 text-base text-forest-deep" />
              <View className="flex-row flex-wrap gap-3">
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void save(Number(custom), editing ?? undefined); }}>
                  <Text className="py-2 font-semibold text-forest">{editing ? "Save changes" : "Add water"}</Text>
                </Pressable>
                {editing && (
                  <Pressable accessibilityRole="button" disabled={busy}
                    onPress={() => Alert.alert("Delete water entry?", `Remove ${editing.amountMl} ml from this day?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => { void remove(editing); } },
                    ])}>
                    <Text className="py-2 font-semibold text-red-700">Delete</Text>
                  </Pressable>
                )}
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setAddingCustom(false); setEditing(null); setCustom(""); }}>
                  <Text className="py-2 font-semibold text-forest">Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
      {busy ? <Text accessibilityLiveRegion="polite" className="text-forest-deep">Saving water…</Text> : null}
      {saveError ? <Text accessibilityRole="alert" className="text-red-700">{saveError}</Text> : null}
    </View>
  );
}
