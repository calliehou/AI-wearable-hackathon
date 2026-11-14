import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { askNotifications, StoreProvider } from "../data/store";

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  useEffect(() => {
    askNotifications();
    // Tapping a "New promise" notification opens that promise.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const id = r.notification.request.content.data?.todoId;
      if (typeof id === "string") router.push({ pathname: "/todo/[id]", params: { id } });
    });
    return () => sub.remove();
  }, []);
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
