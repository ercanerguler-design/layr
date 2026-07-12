/**
 * Hikaye Bırak Ekranı — Yeni layer oluşturma
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";

const LAYER_TYPES = [
  { key: "MEMORY", label: "Anı", icon: "heart", color: "#f59e0b" },
  { key: "HISTORICAL", label: "Tarih", icon: "time", color: "#8b5cf6" },
  { key: "REVIEW", label: "Yorum", icon: "star", color: "#10b981" },
  { key: "PHOTO", label: "Fotoğraf", icon: "image", color: "#3b82f6" },
  { key: "AUDIO", label: "Ses", icon: "mic", color: "#f97316" },
  { key: "EVENT", label: "Etkinlik", icon: "calendar", color: "#ec4899" },
] as const;

type LayerTypeKey = (typeof LAYER_TYPES)[number]["key"];

export default function CreateScreen() {
  const router = useRouter();
  const [type, setType] = useState<LayerTypeKey>("MEMORY");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const selectedType = LAYER_TYPES.find((t) => t.key === type)!;

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("İçerik gerekli", "Lütfen hikayeni veya içeriğini yaz.");
      return;
    }

    setLoading(true);
    try {
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Konum Gerekli", "Katman bırakmak için konumuna ihtiyacımız var.");
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Find or create location for current position
      const locRes = await api.locations.findOrCreate({
        name: "Bilinmeyen Konum",
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        category: "OTHER",
      });

      const locationId = locRes.data.data.id;

      await api.layers.create({
        locationId,
        title: title.trim() || undefined,
        content: content.trim(),
        type,
        year: year ? parseInt(year) : undefined,
        isPublic,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      Alert.alert("Katman bırakıldı! 🎉", "Hikayen bu noktaya eklendi.", [
        { text: "Harika!", onPress: () => router.replace("/(tabs)/") },
      ]);
    } catch (err) {
      Alert.alert("Hata", "Katman eklenemedi. Tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.heading}>Hikayeni Bırak</Text>
        <Text style={styles.subheading}>Bulunduğun yere bir iz ekle.</Text>

        {/* Type selector */}
        <Text style={styles.label}>Tür</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
          {LAYER_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.typeChip,
                type === t.key && { backgroundColor: t.color + "33", borderColor: t.color },
              ]}
              onPress={() => setType(t.key)}
            >
              <Ionicons
                name={t.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={type === t.key ? t.color : "rgba(255,255,255,0.4)"}
              />
              <Text
                style={[
                  styles.typeChipText,
                  { color: type === t.key ? t.color : "rgba(255,255,255,0.4)" },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Title */}
        <Text style={styles.label}>Başlık (opsiyonel)</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder="Kısa bir başlık..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          maxLength={120}
        />

        {/* Content */}
        <Text style={styles.label}>
          İçerik <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          style={[styles.input, styles.textArea]}
          placeholder="Hikayeni yaz..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          numberOfLines={6}
          maxLength={5000}
        />

        {/* Year (for historical) */}
        {type === "HISTORICAL" && (
          <>
            <Text style={styles.label}>Yıl (opsiyonel)</Text>
            <TextInput
              value={year}
              onChangeText={setYear}
              style={styles.input}
              placeholder="1923"
              placeholderTextColor="rgba(255,255,255,0.3)"
              keyboardType="numeric"
              maxLength={4}
            />
          </>
        )}

        {/* Tags */}
        <Text style={styles.label}>Etiketler (virgülle ayır)</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder="tarih, anı, aşk"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />

        {/* Visibility */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setIsPublic((v) => !v)}
        >
          <View>
            <Text style={styles.toggleTitle}>Herkese açık</Text>
            <Text style={styles.toggleSub}>
              {isPublic ? "Herkes görebilir" : "Sadece sen görürsün"}
            </Text>
          </View>
          <View
            style={[styles.toggle, isPublic && styles.toggleActive]}
          >
            <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
          </View>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: selectedType.color },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="location" size={18} color="white" />
              <Text style={styles.submitText}>Bu Noktaya Bırak</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  content: { padding: 24, paddingTop: 64 },
  heading: { color: "white", fontSize: 28, fontWeight: "800", marginBottom: 6 },
  subheading: { color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 28 },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  required: { color: "#ef4444" },
  typeRow: { marginBottom: 24, flexGrow: 0 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  typeChipText: { fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "white",
    fontSize: 14,
    marginBottom: 20,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  toggleTitle: { color: "white", fontWeight: "600", fontSize: 14 },
  toggleSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: "#6366f1" },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  toggleThumbActive: { alignSelf: "flex-end" },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 32,
  },
  submitText: { color: "white", fontWeight: "800", fontSize: 16 },
});
