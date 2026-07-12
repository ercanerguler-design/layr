/**
 * Keşfet Ekranı — Harita tabanlı layer/konum keşfi
 */
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { NearbyLayer } from "@layr/types";
import { apiClient } from "@/lib/api";

const { height: H } = Dimensions.get("window");

const LAYER_COLORS: Record<string, string> = {
  MEMORY: "#f59e0b",
  HISTORICAL: "#8b5cf6",
  REVIEW: "#10b981",
  PHOTO: "#3b82f6",
  VIDEO: "#ef4444",
  AUDIO: "#f97316",
  TEXT: "#9ca3af",
  EVENT: "#ec4899",
  AR_OBJECT: "#06b6d4",
};

export default function ExploreScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState({
    latitude: 41.0138,
    longitude: 28.9742,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [search, setSearch] = useState("");
  const [selectedLayer, setSelectedLayer] = useState<NearbyLayer | null>(null);

  const { data } = useQuery({
    queryKey: ["layers", "map", region.latitude, region.longitude],
    queryFn: () =>
      apiClient.get(
        `/api/layers/nearby?lat=${region.latitude}&lng=${region.longitude}&radius=3000&limit=60`
      ),
    staleTime: 30_000,
  });

  const layers: NearbyLayer[] = data?.data?.data?.items ?? [];

  const goToUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    mapRef.current?.animateToRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Yer ara..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        userInterfaceStyle="dark"
      >
        {layers.map((layer) => (
          <Marker
            key={layer.id}
            coordinate={{ latitude: layer.location.lat, longitude: layer.location.lng }}
            onPress={() => setSelectedLayer(layer)}
          >
            <View
              style={[
                styles.mapMarker,
                {
                  backgroundColor: LAYER_COLORS[layer.type] ?? "#9ca3af",
                },
              ]}
            >
              <Text style={styles.mapMarkerText}>
                {layer.type.charAt(0)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* My location button */}
      <TouchableOpacity style={styles.locationButton} onPress={goToUserLocation}>
        <Ionicons name="locate" size={20} color="white" />
      </TouchableOpacity>

      {/* Selected layer preview */}
      {selectedLayer && (
        <TouchableOpacity
          style={styles.previewCard}
          onPress={() => {
            router.push(`/layer/${selectedLayer.id}`);
            setSelectedLayer(null);
          }}
          activeOpacity={0.9}
        >
          <View style={styles.previewContent}>
            <View
              style={[
                styles.previewTypeBadge,
                { backgroundColor: (LAYER_COLORS[selectedLayer.type] ?? "#9ca3af") + "33" },
              ]}
            >
              <Text
                style={[
                  styles.previewTypeText,
                  { color: LAYER_COLORS[selectedLayer.type] ?? "#9ca3af" },
                ]}
              >
                {selectedLayer.type}
              </Text>
            </View>
            {selectedLayer.title && (
              <Text style={styles.previewTitle}>{selectedLayer.title}</Text>
            )}
            <Text style={styles.previewBody} numberOfLines={2}>
              {selectedLayer.content}
            </Text>
            <View style={styles.previewMeta}>
              <Text style={styles.previewUser}>@{selectedLayer.user.username}</Text>
              {selectedLayer.year && (
                <Text style={styles.previewYear}>{selectedLayer.year}</Text>
              )}
            </View>
          </View>
          <View style={styles.previewArrow}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
          </View>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setSelectedLayer(null)}
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  searchBar: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(15,15,26,0.9)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
  },
  map: { flex: 1 },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  mapMarkerText: {
    color: "white",
    fontSize: 12,
    fontWeight: "900",
  },
  locationButton: {
    position: "absolute",
    bottom: 200,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  previewCard: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: "rgba(20,20,35,0.97)",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  previewContent: { flex: 1 },
  previewTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  previewTypeText: { fontSize: 10, fontWeight: "700" },
  previewTitle: { color: "white", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  previewBody: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 },
  previewMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  previewUser: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  previewYear: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  previewArrow: { paddingLeft: 12 },
  previewClose: { position: "absolute", top: 12, right: 12 },
});
