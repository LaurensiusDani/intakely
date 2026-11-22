import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { BackHandler, Image, Pressable, ScrollView, Text, TextInput, View, type ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { estimateTargets, finishOnboarding } from "../services/ApiService";
import { useSession } from "../session";

const goals = [
  { id: "bulking", label: "Bulking", detail: "Build muscle and gain weight.", icon: require("../../Design/Onboarding1_Asset/Onboarding1_Barbell-Icon.png") },
  { id: "cutting", label: "Cutting", detail: "Reduce body fat and maintain muscle.", icon: require("../../Design/Onboarding1_Asset/Onboarding1_Flame-Icon.png") },
  { id: "maintenance", label: "Maintenance", detail: "Keep your current weight.", icon: require("../../Design/Onboarding1_Asset/Onboarding1_BalanceScale-Icon.png") },
] as const;
const activities = [
  { id: "sedentary", label: "Sedentary" },
  { id: "light", label: "Lightly Active" },
  { id: "moderate", label: "Moderately Active" },
  { id: "high", label: "Very Active" },
] as const;
const flame = require("../../Design/Onboarding3_Asset/Onboarding3_Flame-Icon.png");
const water = require("../../Design/Onboarding3_Asset/Onboarding3_WaterDroplet-Icon.png");
const weight = require("../../Design/Onboarding3_Asset/Onboarding3_GreenCalendarCheck-Icon.png");
const macros = [
  { field: "proteinPct", label: "Protein", kcalPerGram: 4, color: "bg-[#E8F3D8]" },
  { field: "carbsPct", label: "Carbs", kcalPerGram: 4, color: "bg-[#EDF1E4]" },
  { field: "fatPct", label: "Fat", kcalPerGram: 9, color: "bg-[#FFF0D9]" },
] as const;

type Step = "method" | "goal" | "body" | "targets";
type Goal = (typeof goals)[number]["id"];
type Activity = (typeof activities)[number]["id"];
type Sex = "male" | "female";
type Body = { age: number; heightCm: number; weightKg: number; sex: Sex; activity: Activity; goal: Goal };
const emptyTargets = { caloriesKcal: "", proteinPct: "", carbsPct: "", fatPct: "" };

function Choice({ label, detail, icon, selected, onPress }: {
  label: string; detail?: string; icon?: ImageSourcePropType; selected?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? "button" : "radio"}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={onPress}
      className={"min-h-14 flex-row items-center gap-3 rounded-2xl border p-4 " + (selected ? "border-forest bg-forest-soft" : "border-forest/20")}
    >
      {icon && <Image source={icon} accessible={false} resizeMode="contain" className="h-10 w-10" />}
      <View className="flex-1">
        <Text className="text-lg font-bold text-[#102127]">{label}</Text>
        {detail && <Text className="mt-1 text-base text-[#102127]">{detail}</Text>}
      </View>
      {selected !== undefined && (
        <View className={"h-5 w-5 items-center justify-center rounded-full border-2 " + (selected ? "border-forest bg-forest" : "border-[#102127]")}>
          {selected && <View className="h-2 w-2 rounded-full bg-white" />}
        </View>
      )}
    </Pressable>
  );
}

function NumberBox({ label, value, onChange, unit, decimal, tinted, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; unit?: string; decimal?: boolean; tinted?: boolean; placeholder?: string;
}) {
  return (
    <View className={"min-h-12 flex-row items-center rounded-xl px-3 " + (tinted ? "bg-forest-soft" : "border border-forest/25")}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? "decimal-pad" : "number-pad"}
        placeholder={placeholder ?? "—"}
        placeholderTextColor="#53635D"
        underlineColorAndroid="transparent"
        className="min-w-0 flex-1 py-2 text-lg font-semibold text-[#102127]"
      />
      {unit && <Text className="ml-1 text-sm text-forest-deep">{unit}</Text>}
    </View>
  );
}

function numberFrom(value: string) {
  return value.trim() ? Number(value.trim().replace(",", ".")) : NaN;
}

export default function OnboardingScreen() {
  const { session, setSession } = useSession();
  const [step, setStep] = useState<Step>("method");
  const [manual, setManual] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [startingWeight, setStartingWeight] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [choosingActivity, setChoosingActivity] = useState(false);
  const [estimatedBody, setEstimatedBody] = useState<Body | null>(null);
  const [estimatedDraft, setEstimatedDraft] = useState(emptyTargets);
  const [manualDraft, setManualDraft] = useState(emptyTargets);
  const [waterTarget, setWaterTarget] = useState("");
  const [goalWeight, setGoalWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const draft = manual ? manualDraft : estimatedDraft;
  const setDraft = manual ? setManualDraft : setEstimatedDraft;
  const years = numberFrom(age);
  const under18 = Number.isInteger(years) && years > 0 && years < 18;
  const calories = numberFrom(draft.caloriesKcal);
  const macroTotal = macros.reduce((sum, item) => sum + (numberFrom(draft[item.field]) || 0), 0);

  const goBack = useCallback(() => {
    if (busy || step === "method") return busy;
    setStep(step === "targets" && !manual ? "body" : step === "body" ? "goal" : "method");
    setError("");
    setNotice("");
    return true;
  }, [busy, manual, step]);

  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", goBack);
    return () => back.remove();
  }, [goBack]);

  async function next() {
    if (!session || busy) return;
    setError("");

    if (step === "goal") {
      if (!goal) return setError("Choose a goal to continue.");
      setStep("body");
      return;
    }

    if (step === "body") {
      if (!Number.isInteger(years) || years < 1 || years > 120) {
        return setError("Enter a valid age in years.");
      }
      if (under18) {
        setManual(true);
        setNotice("Enter daily targets you already have.");
        setStep("targets");
        return;
      }
      const heightCm = numberFrom(height);
      const weightKg = numberFrom(startingWeight);
      if (!(heightCm >= 100 && heightCm <= 250 && weightKg >= 30 && weightKg <= 350) || !sex || !activity || !goal) {
        return setError("Enter your height (100–250 cm), weight (30–350 kg), sex, and activity level.");
      }
      const body = { age: years, heightCm, weightKg, sex, activity, goal };
      if (JSON.stringify(body) === JSON.stringify(estimatedBody)) {
        setStep("targets");
        return;
      }
      setBusy(true);
      try {
        const estimate = await estimateTargets(session.token, body);
        setEstimatedBody(body);
        setEstimatedDraft({
          caloriesKcal: String(estimate.caloriesKcal),
          proteinPct: String(estimate.proteinPct),
          carbsPct: String(estimate.carbsPct),
          fatPct: String(estimate.fatPct),
        });
        setStep("targets");
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : "Could not estimate targets. Try again.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const proteinPct = numberFrom(draft.proteinPct);
    const carbsPct = numberFrom(draft.carbsPct);
    const fatPct = numberFrom(draft.fatPct);
    const waterMl = waterTarget.trim() ? numberFrom(waterTarget) : null;
    const goalWeightKg = goalWeight.trim() ? numberFrom(goalWeight) : null;
    if (!Number.isInteger(calories) || calories < 1 || calories > 10000) {
      return setError("Enter a daily calorie target from 1 to 10,000 kcal.");
    }
    if (![proteinPct, carbsPct, fatPct].every((value) => Number.isInteger(value) && value >= 0 && value <= 100) || macroTotal !== 100) {
      return setError("Enter three whole macro percentages that add up to 100%.");
    }
    if ((waterMl !== null && (!Number.isInteger(waterMl) || waterMl < 1 || waterMl > 10000))
        || (goalWeightKg !== null && !(goalWeightKg >= 30 && goalWeightKg <= 350))) {
      return setError("Enter water in ml (1–10,000) and goal weight in kg (30–350), or leave either blank.");
    }

    setBusy(true);
    try {
      await finishOnboarding(session.token, { caloriesKcal: calories, proteinPct, carbsPct, fatPct, waterMl, goalWeightKg, body: manual ? null : estimatedBody });
      setSession({ ...session, onboardingComplete: true });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save setup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    method: ["Set Up Your Targets", "Choose how you want to set your daily nutrition targets."],
    goal: ["What’s Your Goal?", "Choose a plan that fits your current focus."],
    body: ["Your Body Details", "We’ll use this to estimate your daily targets."],
    targets: ["Set Your Targets", manual ? "Enter your daily calorie and macro targets." : "Review and adjust your estimated daily targets."],
  }[step];
  const progress = { method: 0, goal: 1, body: 2, targets: 3 }[step];

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="mx-auto w-full max-w-[460px] flex-1 px-5 pb-6 pt-3">
          {step !== "method" && (
            <View className="flex-row items-center">
              <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} disabled={busy}
                className="h-12 w-12 justify-center">
                <SymbolView name={{ android: "arrow_back", ios: "arrow.left", web: "arrow_back" }} tintColor="#102127" size={25} />
              </Pressable>
              <View className="mr-12 flex-1 flex-row justify-center gap-2" accessibilityLabel={manual ? "Daily targets" : `Step ${progress} of 3`}>
                {(manual ? [3] : [1, 2, 3]).map((index) => (
                  <View key={index} className={"h-2 w-10 rounded-full " + (index <= progress ? "bg-[#006A3C]" : "bg-[#CAE2C7]")} />
                ))}
              </View>
            </View>
          )}
          <Text accessibilityRole="header" className="mt-5 text-center text-[32px] font-extrabold text-[#102127]">{heading[0]}</Text>
          <Text className="mt-3 text-center text-lg leading-6 text-[#203842]">{heading[1]}</Text>

          {step === "method" && (
            <View className="mt-8 gap-4">
              <Choice label="Estimate my targets" detail="Use my body details, activity, and goal."
                onPress={() => { setManual(false); setStep("goal"); }} />
              <Choice label="Enter my own targets" detail="Use calorie and macro targets I already have."
                onPress={() => { setManual(true); setStep("targets"); }} />
              <Pressable onPress={() => setSession(null)} accessibilityRole="button" className="self-center p-3">
                <Text className="font-semibold text-forest">Sign out</Text>
              </Pressable>
            </View>
          )}

          {step === "goal" && (
            <View className="mt-8 gap-4">
              {goals.map((option) => (
                <Choice key={option.id} label={option.label} detail={option.detail} icon={option.icon}
                  selected={goal === option.id} onPress={() => setGoal(option.id)} />
              ))}
            </View>
          )}

          {step === "body" && (
            <View className="mt-6 gap-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-lg font-bold text-[#102127]">Age</Text>
                <View className="w-28"><NumberBox label="Age" value={age} onChange={setAge} unit="years" /></View>
              </View>
              {under18 ? (
                <Text className="text-base text-forest-deep">Continue to enter the daily targets you already have.</Text>
              ) : (
                <>
                  <Text className="text-lg font-bold text-[#102127]">Sex used in calculation</Text>
                  <View className="flex-row gap-2">
                    {(["male", "female"] as const).map((option) => (
                      <View key={option} className="flex-1">
                        <Choice label={option === "male" ? "Male" : "Female"} selected={sex === option} onPress={() => setSex(option)} />
                      </View>
                    ))}
                  </View>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-lg font-bold text-[#102127]">Height</Text>
                    <View className="w-32"><NumberBox label="Height" value={height} onChange={setHeight} unit="cm" decimal /></View>
                  </View>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-lg font-bold text-[#102127]">Starting Weight</Text>
                    <View className="w-32"><NumberBox label="Starting weight" value={startingWeight} onChange={setStartingWeight} unit="kg" decimal /></View>
                  </View>
                  <Text className="text-lg font-bold text-[#102127]">Activity Level</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: choosingActivity }}
                    accessibilityLabel="Activity level"
                    onPress={() => setChoosingActivity(!choosingActivity)}
                    className="min-h-12 flex-row items-center justify-between rounded-xl border border-forest/25 px-4"
                  >
                    <Text className="text-lg font-semibold text-[#102127]">
                      {activities.find((option) => option.id === activity)?.label ?? "Choose activity level"}
                    </Text>
                    <SymbolView name={{ android: "expand_more", ios: "chevron.down", web: "expand_more" }} size={23} tintColor="#102127" />
                  </Pressable>
                  {choosingActivity && (
                    <View className="gap-2">
                      {activities.map((option) => (
                        <Choice key={option.id} label={option.label} selected={activity === option.id}
                          onPress={() => { setActivity(option.id); setChoosingActivity(false); }} />
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {step === "targets" && (
            <View className="mt-6 gap-5">
              {notice ? <Text className="text-forest-deep">{notice}</Text> : null}
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <Image source={flame} accessible={false} resizeMode="contain" className="h-7 w-7" />
                  <Text className="text-lg font-bold text-[#102127]">Calorie Target</Text>
                </View>
                <NumberBox label="Daily calorie target" value={draft.caloriesKcal}
                  onChange={(caloriesKcal) => setDraft({ ...draft, caloriesKcal })} unit="kcal/day" tinted />
              </View>
              <View className="gap-2">
                <Text className="text-lg font-bold text-[#102127]">Macro Ratio · {macroTotal}% of 100%</Text>
                <View className="flex-row gap-2">
                  {macros.map(({ field, label, kcalPerGram, color }) => {
                    const percent = numberFrom(draft[field]);
                    const grams = Math.round(calories * percent / (100 * kcalPerGram));
                    return (
                      <View key={field} className={`flex-1 gap-1 rounded-2xl p-2 ${color}`}>
                        <Text className="text-center font-bold text-[#102127]">{label}</Text>
                        <NumberBox label={`${label} percentage`} value={draft[field]}
                          onChange={(value) => setDraft({ ...draft, [field]: value })} unit="%" />
                        <Text className="text-center text-xs text-forest-deep">{Number.isFinite(grams) && grams >= 0 ? `${grams} g/day` : "—"}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              {[
                { label: "Water Target", icon: water, value: waterTarget, onChange: setWaterTarget, unit: "ml/day" },
                { label: "Goal Weight", icon: weight, value: goalWeight, onChange: setGoalWeight, unit: "kg" },
              ].map((field) => (
                <View key={field.label} className="gap-2">
                  <View className="flex-row items-center gap-2">
                    <Image source={field.icon} accessible={false} resizeMode="contain" className="h-7 w-7" />
                    <Text className="text-lg font-bold text-[#102127]">{field.label} (optional)</Text>
                  </View>
                  <NumberBox label={field.label} value={field.value} onChange={field.onChange}
                    unit={field.unit} decimal={field.unit === "kg"} placeholder="Optional" tinted />
                </View>
              ))}
              {!manual && <Text className="text-sm text-forest-deep">Starting estimate based on Mifflin–St Jeor and your activity and goal.</Text>}
            </View>
          )}

          {error ? <Text accessibilityRole="alert" className="mt-4 text-red-700">{error}</Text> : null}
          {step !== "method" && (
            <View className="flex-1 justify-end pt-8">
              <Pressable accessibilityRole="button" disabled={busy} onPress={next}
                className="min-h-14 items-center justify-center rounded-2xl bg-[#006A3C] px-4 py-3 disabled:opacity-65">
                <Text className="text-lg font-bold text-white">{busy ? "Please wait…" : step === "targets" ? "Finish Setup" : "Next"}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
