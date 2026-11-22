import { Text, View } from "react-native";
import { Screen } from "../../components/Screen";

export default function ExploreScreen() {
  return (
    <Screen title="Explore">
      {["Activity Routes", "Nutrition & Health"].map((feature) => (
        <View key={feature} className="rounded-xl bg-forest-soft p-4">
          <Text className="font-semibold text-forest-deep">{feature}</Text>
          <Text className="mt-1 text-forest-deep">Coming later</Text>
        </View>
      ))}
    </Screen>
  );
}
