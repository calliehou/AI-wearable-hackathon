import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConfirmProvider } from "../components/Confirm";
import { WELCOMED } from "../data/prefs";
import { askNotifications, StoreProvider } from "../data/store";



export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (!loaded) return;
    // First launch: the Welcome screen (connect the band, import contacts).
    AsyncStorage.getItem(WELCOMED).then((v) => { if (!v) router.replace("/welcome"); }).catch(() => undefined);
  }, [loaded]);

  useEffect(() => {
    askNotifications();
    // Tapping a "Promise heard" notification opens that promise.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.todoId;
      if (typeof id === "string") router.push({ pathname: "/promise/[id]", params: { id } });
    });
    return () => sub.remove();
  }, []);

  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ConfirmProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#FFFFFF" } }}>
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="contacts" options={{ animation: "none" }} />
          <Stack.Screen name="ask" options={{ animation: "none" }} />
          <Stack.Screen name="band" options={{ animation: "none" }} />
          <Stack.Screen name="welcome" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="mic" options={{ presentation: "modal" }} />
        </Stack>
        </ConfirmProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
