import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { api } from "@/lib/api";

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.auth.register(form);
      await AsyncStorage.multiSet([
        ["layr_access_token", data.data.accessToken],
        ["layr_refresh_token", data.data.refreshToken],
      ]);
      router.replace("/(tabs)");
    } catch (error: any) {
      const message = error.response?.data?.message;
      Alert.alert("Kayit yapilamadi", message === "Email already in use" ? "Bu e-posta zaten kayitli." : message === "Username already taken" ? "Bu kullanici adi alinmis." : message ?? "Bilgileri kontrol edip tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <Text style={styles.brand}>LAYR</Text><Text style={styles.heading}>Hesap olustur</Text>
        <TextInput style={styles.input} value={form.email} onChangeText={update("email")} placeholder="E-posta" placeholderTextColor="#888" keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} value={form.username} onChangeText={update("username")} placeholder="Kullanici adi" placeholderTextColor="#888" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} value={form.displayName} onChangeText={update("displayName")} placeholder="Gorunen ad" placeholderTextColor="#888" />
        <TextInput style={styles.input} value={form.password} onChangeText={update("password")} placeholder="Sifre (en az 8 karakter)" placeholderTextColor="#888" secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}><Text style={styles.buttonText}>{loading ? "Kayit yapiliyor..." : "Kayit ol"}</Text></TouchableOpacity>
        <Link href="/(auth)/login" style={styles.link}>Hesabin var mi? Giris yap</Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", padding: 24 },
  card: { gap: 14 }, brand: { color: "#818cf8", fontSize: 34, fontWeight: "900", textAlign: "center" },
  heading: { color: "white", fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  input: { backgroundColor: "#1b1b2a", borderColor: "#33334a", borderWidth: 1, borderRadius: 12, padding: 15, color: "white" },
  button: { backgroundColor: "#4f46e5", borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" }, link: { color: "#a5b4fc", textAlign: "center", marginTop: 8 },
});
