import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { apiClient } from "@/lib/api";

export default function FeedScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["feed", "nearby"],
    queryFn: async () => {
      let lat = 41.0138;
      let lng = 28.9742;
      const permission = await Location.getForegroundPermissionsAsync();
      if (permission.granted) {
        const current = await Location.getCurrentPositionAsync();
        lat = current.coords.latitude;
        lng = current.coords.longitude;
      }
      return apiClient.get(`/api/layers/nearby?lat=${lat}&lng=${lng}&radius=10000&limit=50`);
    },
  });
  const layers = data?.data?.data?.items ?? [];

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Yakinindaki hikayeler</Text>
      {isLoading ? <ActivityIndicator color="#818cf8" /> : isError ? (
        <TouchableOpacity onPress={() => refetch()}><Text style={styles.empty}>Akis yuklenemedi. Tekrar dene.</Text></TouchableOpacity>
      ) : layers.length === 0 ? <Text style={styles.empty}>Henuz hikaye yok.</Text> : (
        <FlatList data={layers} keyExtractor={(item: any) => item.id} contentContainerStyle={styles.list} renderItem={({ item }: any) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/layer/${item.id}`)}>
            <Text style={styles.type}>{item.type} · {item.location?.name}</Text>
            <Text style={styles.title}>{item.title || "Konum hikayesi"}</Text>
            <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
            <Text style={styles.author}>@{item.user?.username}</Text>
          </TouchableOpacity>
        )} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0f0f1a", padding: 18, paddingTop: 58 },
  heading: { color: "white", fontSize: 24, fontWeight: "800", marginBottom: 18 },
  list: { gap: 12, paddingBottom: 24 }, card: { backgroundColor: "#1b1b2a", borderRadius: 16, padding: 16, gap: 8 },
  type: { color: "#a5b4fc", fontSize: 12 }, title: { color: "white", fontSize: 18, fontWeight: "700" },
  content: { color: "#d1d1dc", lineHeight: 21 }, author: { color: "#888", fontSize: 12 },
  empty: { color: "#aaa", textAlign: "center", marginTop: 50 },
});
