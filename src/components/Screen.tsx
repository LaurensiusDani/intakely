import type { ReactNode } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-cream">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" className="text-3xl font-bold text-forest-deep">
          {title}
        </Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
