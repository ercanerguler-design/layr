import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { api } from "@/lib/api";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.auth.login(email.trim(), password);
      await AsyncStorage.multiSet([
        ["layr_access_token", data.data.accessToken],
        ["layr_refresh_token", data.data.refreshToken],
      ]);
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Giris yapilamadi", error.response?.data?.message ?? "E-posta veya sifreyi kontrol et.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.brand}>LAYR</Text>
        <Text style={styles.heading}>Giris yap</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-posta veya kullanici adi" placeholderTextColor="#888" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Sifre" placeholderTextColor="#888" secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Giris yapiliyor..." : "Giris yap"}</Text>
        </TouchableOpacity>
        <Link href="/(auth)/register" style={styles.link}>Hesabin yok mu? Kayit ol</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", padding: 24 },
  card: { gap: 16 }, brand: { color: "#818cf8", fontSize: 34, fontWeight: "900", textAlign: "center" },
  heading: { color: "white", fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  input: { backgroundColor: "#1b1b2a", borderColor: "#33334a", borderWidth: 1, borderRadius: 12, padding: 15, color: "white" },
  button: { backgroundColor: "#4f46e5", borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" }, link: { color: "#a5b4fc", textAlign: "center", marginTop: 8 },
});
