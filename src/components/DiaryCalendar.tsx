import { SymbolView } from "expo-symbols";
import { Pressable, Text, View } from "react-native";
import { dayLabel, monthLabel, monthWeeks, shiftMonth, startOfMonth } from "../diary/calendar";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DiaryCalendar({ selected, today, recorded, disabled, onSelect }: {
  selected: string;
  today: string;
  recorded: ReadonlySet<string>;
  disabled: boolean;
  onSelect: (day: string) => void;
}) {
  const monthStart = startOfMonth(selected);
  const nextMonth = shiftMonth(monthStart, 1);
  const canNext = !disabled && nextMonth <= today;

  return (
    <View className="rounded-2xl border border-forest/15 bg-[#FFFCF7] p-3">
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={disabled}
          onPress={() => onSelect(shiftMonth(monthStart, -1))} className="h-11 w-10 items-center justify-center">
          <SymbolView name={{ android: "chevron_left", ios: "chevron.left", web: "chevron_left" }} size={23} tintColor="#0F4D39" />
        </Pressable>
        <Text accessibilityRole="header" className="flex-1 text-center text-base font-bold text-[#102127]">
          {monthLabel(monthStart)}
        </Text>
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
