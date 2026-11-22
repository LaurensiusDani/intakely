import { Redirect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState, type ReactNode } from "react";
import {
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signIn, signUp } from "../services/ApiService";
import { useSession } from "../session";

const logo = require("../../Design/Intakely_Logo.png");
const wave = require("../../Design/Login_Asset/Login_Asset-Wave.png");
const nameIcon = require("../../Design/SignUp_Asset/SignUp_FullName-Icon.png");
const loginEmailIcon = require("../../Design/Login_Asset/Login_Email-Icon.png");
const loginPasswordIcon = require("../../Design/Login_Asset/Login_Password-Icon.png");
const signupEmailIcon = require("../../Design/SignUp_Asset/SignUp_Email-Icon.png");
const signupPasswordIcon = require("../../Design/SignUp_Asset/SignUp_Password-Icon.png");
const ink = "#102127";

function AccountInput({
  icon,
  action,
  ...input
}: TextInputProps & { icon: ImageSourcePropType; action?: ReactNode }) {
  return (
    <View className="min-h-[55px] flex-row items-center gap-4 rounded-2xl border border-[#D6D9D2] pl-4">
      <Image
        accessible={false}
        source={icon}
        className="h-6 w-6"
        resizeMode="contain"
        tintColor={ink}
      />
      <TextInput
        {...input}
        accessibilityLabel={input.placeholder}
        placeholderTextColor={ink}
        underlineColorAndroid="transparent"
        className="min-h-[53px] flex-1 py-3 pr-2 text-[19px] text-[#102127]"
      />
      {action}
    </View>
  );
}

export default function AccountScreen() {
  const { session, setSession } = useSession();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function changeMode(next: boolean) {
    setRegistering(next);
    setPasswordVisible(false);
    setError("");
  }

  useEffect(() => {
    if (!registering) return;
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!saving) changeMode(false);
      return true;
    });
    return () => back.remove();
  }, [registering, saving]);

  if (session) {
    return <Redirect href={session.onboardingComplete ? "/diary" : "/onboarding"} />;
  }

  async function submit() {
    if (saving) return;
    const address = email.trim();
    if (!address || !password || (registering && (!name.trim() || password.length < 8))) {
      setError(registering ? "Enter your name, email, and a password of at least 8 characters." : "Enter your email and password.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (registering) {
        await signUp({ name: name.trim(), email: address, password });
        changeMode(false);
      }
      setSession(await signIn(address, password));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not sign in. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-cream">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[440px] px-5" style={{ paddingTop: compact ? 16 : 32 }}>
          {registering ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
              onPress={() => changeMode(false)}
              disabled={saving}
              className="h-12 w-12 justify-center pl-1"
            >
              <SymbolView name={{ android: "arrow_back", ios: "arrow.left", web: "arrow_back" }} size={25} tintColor={ink} />
            </Pressable>
          ) : (
            <View className="items-center gap-1">
              <View className="h-[108px] w-[112px] overflow-hidden rounded-[28px] bg-[#006A3C]">
                <Image
                  source={logo}
                  accessible={false}
                  style={{ position: "absolute", width: 210, height: 210, left: -49, top: -29 }}
                />
              </View>
              <Text className="text-[49px] font-extrabold tracking-tight text-[#006A3C]">Intakely</Text>
            </View>
          )}

          <View className={registering ? "mt-6 gap-3 px-1" : "mt-6 items-center gap-3"}>
            <Text
              accessibilityRole="header"
              className={registering ? "text-[32px] font-extrabold text-[#102127]" : "text-center text-[36px] font-extrabold text-[#102127]"}
            >
              {registering ? "Create Your Account" : "Welcome Back!"}
            </Text>
            <Text className={registering ? "text-[19px] leading-7 text-[#102127]" : "text-center text-[19px] leading-7 text-[#102127]"}>
              {registering
                ? "Start your fitness nutrition journey with Intakely."
                : "Log in to continue tracking your nutrition, water, and weight."}
            </Text>
          </View>

          <View className={registering ? "mt-9 gap-5" : "mt-8 gap-3"}>
            {registering && (
              <AccountInput icon={nameIcon} placeholder="Full Name" value={name}
                onChangeText={setName} editable={!saving} autoComplete="name" />
            )}
            <AccountInput icon={registering ? signupEmailIcon : loginEmailIcon} placeholder="Email" value={email}
              onChangeText={setEmail} editable={!saving} autoComplete="email" autoCorrect={false}
              keyboardType="email-address" autoCapitalize="none" />
            <AccountInput icon={registering ? signupPasswordIcon : loginPasswordIcon} placeholder="Password" value={password}
              onChangeText={setPassword} editable={!saving} secureTextEntry={!passwordVisible}
              autoComplete={registering ? "new-password" : "current-password"}
              autoCapitalize="none" autoCorrect={false}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  className="h-12 w-12 items-center justify-center"
                >
                  <SymbolView
                    name={passwordVisible
                      ? { android: "visibility", ios: "eye", web: "visibility" }
                      : { android: "visibility_off", ios: "eye.slash", web: "visibility_off" }}
                    size={25} tintColor={ink}
                  />
                </Pressable>
              }
            />
          </View>
          {error ? <Text accessibilityRole="alert" className="mt-3 text-red-700">{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={submit}
            className={registering
              ? "mt-11 min-h-[57px] items-center justify-center rounded-2xl bg-[#006A3C] px-4 py-3 disabled:opacity-65"
              : "mt-8 min-h-[57px] items-center justify-center rounded-2xl bg-[#006A3C] px-4 py-3 disabled:opacity-65"}
          >
            <Text className="text-center text-[22px] font-bold text-white">
              {saving ? "Please wait…" : registering ? "Create Account" : "Sign In"}
            </Text>
          </Pressable>
          {registering && (
            <Text className="mt-7 text-center text-[19px] text-[#102127]">Already have an account?</Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            className={registering ? "min-h-11 items-center justify-center" : "mt-2 min-h-12 items-center justify-center"}
            onPress={() => changeMode(!registering)}
          >
            <Text className="text-center text-xl font-bold text-[#006A3C]">
              {registering ? "Sign In" : "Create account"}
            </Text>
          </Pressable>
        </View>

        {!registering && (
          <View className="flex-1 justify-end pt-2" pointerEvents="none">
            <Image
              source={wave}
              accessible={false}
              className="h-[124px] w-full"
              resizeMode="stretch"
              style={{ mixBlendMode: "multiply" }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
