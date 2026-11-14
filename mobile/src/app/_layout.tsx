import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StoreProvider } from "../data/store";

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }}>
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="people" options={{ animation: "none" }} />
          <Stack.Screen name="kept" options={{ animation: "none" }} />
          <Stack.Screen name="band" options={{ animation: "none" }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
