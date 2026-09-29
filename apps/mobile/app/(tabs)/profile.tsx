import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.me().then(({ data }) => setUser(data.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem("layr_refresh_token");
    if (refreshToken) await api.auth.logout(refreshToken).catch(() => undefined);
    await AsyncStorage.multiRemove(["layr_access_token", "layr_refresh_token"]);
    setUser(null);
    Alert.alert("Cikis yapildi");
  };

  if (loading) return <View style={styles.screen}><ActivityIndicator color="#818cf8" /></View>;
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Profil</Text>
      {user ? <>
        <Text style={styles.name}>{user.displayName}</Text><Text style={styles.muted}>@{user.username}</Text>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={logout}><Text style={styles.buttonText}>Cikis yap</Text></TouchableOpacity>
      </> : <>
        <Text style={styles.muted}>Profilini gormek ve hikaye birakmak icin giris yap.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.push("/(auth)/login")}><Text style={styles.buttonText}>Giris yap</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.push("/(auth)/register")}><Text style={styles.buttonText}>Kayit ol</Text></TouchableOpacity>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f1a", padding: 24, paddingTop: 58, gap: 14 },
  heading: { color: "white", fontSize: 24, fontWeight: "800", marginBottom: 18 },
  name: { color: "white", fontSize: 22, fontWeight: "700" }, muted: { color: "#aaa", lineHeight: 22 },
  button: { backgroundColor: "#4f46e5", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 8 },
  secondary: { backgroundColor: "#2a2a3a" }, buttonText: { color: "white", fontWeight: "700" },
});
