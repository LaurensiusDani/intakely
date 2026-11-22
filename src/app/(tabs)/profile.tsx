import { Pressable, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { useSession } from "../../session";

export default function ProfileScreen() {
  const { session, setSession } = useSession();
  return (
    <Screen title="Profile">
      <Text className="text-lg font-semibold text-forest-deep">{session?.record.name}</Text>
      {session?.record.email ? <Text className="text-forest-deep">{session.record.email}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => setSession(null)} className="self-start py-3">
        <Text className="font-semibold text-red-700">Sign out</Text>
      </Pressable>
    </Screen>
  );
}
