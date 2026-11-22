import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { dayForMonth, dayLabel, monthLabel, monthWeeks, shiftMonth, startOfMonth } from "../diary/calendar";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function DiaryCalendar({ selected, today, recorded, disabled, onSelect }: {
  selected: string;
  today: string;
  recorded: ReadonlySet<string>;
  disabled: boolean;
  onSelect: (day: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [year, setYear] = useState("");
  const monthStart = startOfMonth(selected);
  const nextMonth = shiftMonth(monthStart, 1);
  const canNext = !disabled && nextMonth <= today;
  const canPrevious = !disabled && monthStart > "0001-01-01";

  return (
    <View className="rounded-2xl border border-forest/15 bg-[#FFFCF7] p-3">
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-5">
          <View accessibilityViewIsModal className="w-full max-w-[400px] gap-4 rounded-2xl bg-cream p-5">
            <Text accessibilityRole="header" className="text-xl font-bold text-forest-deep">Jump to month</Text>
            <TextInput accessibilityLabel="Year" keyboardType="number-pad" value={year} onChangeText={setYear}
              maxLength={4} placeholder="Year" className="min-h-12 rounded-xl border border-forest/25 px-3 text-base text-forest-deep" />
            <Text className="text-sm text-forest-deep">Choose a month for the year above.</Text>
            <View className="flex-row flex-wrap">
              {months.map((label, index) => {
                const date = dayForMonth(year, index + 1, today);
                return (
                  <View key={label} className="w-1/3 p-1">
                    <Pressable accessibilityRole="button" disabled={!date}
                      onPress={() => { if (date) onSelect(date); setPickerOpen(false); }}
                      className="min-h-11 items-center justify-center rounded-lg bg-forest-soft disabled:opacity-40">
                      <Text className="font-semibold text-forest">{label}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setPickerOpen(false)} className="min-h-11 justify-center self-end px-3">
              <Text className="font-semibold text-forest">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canPrevious}
          onPress={() => onSelect(shiftMonth(monthStart, -1))} className="h-11 w-10 items-center justify-center disabled:opacity-40">
          <SymbolView name={{ android: "chevron_left", ios: "chevron.left", web: "chevron_left" }} size={23} tintColor="#0F4D39" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Jump to month. ${monthLabel(monthStart)}`} disabled={disabled}
          onPress={() => { setYear(selected.slice(0, 4)); setPickerOpen(true); }}
          className="min-h-11 flex-1 flex-row items-center justify-center gap-1">
          <Text className="text-center text-base font-bold text-[#102127]">{monthLabel(monthStart)}</Text>
          <SymbolView name={{ android: "expand_more", ios: "chevron.down", web: "expand_more" }} size={14} tintColor="#0F4D39" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={!canNext}
          onPress={() => onSelect(startOfMonth(today) === nextMonth ? today : nextMonth)}
          className="h-11 w-10 items-center justify-center disabled:opacity-40">
          <SymbolView name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }} size={23} tintColor="#0F4D39" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onSelect(today)} disabled={disabled}
          className="min-h-11 justify-center px-1">
          <Text className="text-sm font-semibold text-forest">Today</Text>
        </Pressable>
      </View>
      <View className="my-1 flex-row">
        {weekdays.map((weekday) => (
          <Text key={weekday} className="flex-1 text-center text-xs font-semibold text-forest-deep/75">{weekday}</Text>
        ))}
      </View>
      {monthWeeks(monthStart).map((week, index) => (
        <View key={index} className="flex-row">
          {week.map((day, column) => {
            if (!day) return <View key={column} className="h-11 flex-1" />;
            const chosen = day === selected;
            const current = day === today;
            const logged = recorded.has(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen, disabled: disabled || day > today }}
                accessibilityLabel={`${dayLabel(day)}${current ? ", today" : ""}${logged ? ", food recorded" : ""}`}
                disabled={disabled || day > today}
                onPress={() => onSelect(day)}
                className="h-11 flex-1 items-center justify-center disabled:opacity-40"
              >
                <View className={`h-8 w-8 items-center justify-center rounded-full ${chosen ? "bg-forest" : current ? "border border-forest" : ""}`}>
                  <Text className={chosen ? "font-bold text-white" : "font-semibold text-[#102127]"}>
                    {Number(day.slice(-2))}
                  </Text>
                </View>
                <View className={`mt-0.5 h-1 w-1 rounded-full ${logged ? "bg-forest" : "bg-transparent"}`} />
              </Pressable>
            );
          })}
        </View>
      ))}
      <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <Text className="text-xs text-forest-deep">● Food recorded</Text>
        <Text className="text-xs text-forest-deep">○ Today</Text>
      </View>
    </View>
  );
}
