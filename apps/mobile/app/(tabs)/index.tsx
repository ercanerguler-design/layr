/**
 * AR Kamera Ekranı — LAYR'ın ana ekranı
 *
 * Kullanıcının kamerasını açar, konum alır ve yakındaki katmanları
 * kamera görüntüsünün üzerine AR marker olarak yerleştirir.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { apiClient } from "@/lib/api";
import type { NearbyLayer } from "@layr/types";

const { width: W, height: H } = Dimensions.get("window");

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

const LAYER_ICONS: Record<string, string> = {
  MEMORY: "heart",
  HISTORICAL: "time",
  REVIEW: "star",
  PHOTO: "image",
  VIDEO: "videocam",
  AUDIO: "mic",
  TEXT: "chatbubble",
  EVENT: "calendar",
  AR_OBJECT: "cube",
};

/**
 * Converts a bearing angle to screen X position.
 * Simplified AR projection: compass bearing → screen coordinate.
 */
function bearingToScreenX(
  bearing: number,
  compassHeading: number,
  screenWidth: number,
): number {
  let diff = bearing - compassHeading;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const fieldOfView = 60; // degrees
  const normalised = diff / fieldOfView;
  return screenWidth / 2 + normalised * screenWidth;
}

interface ARMarkerProps {
  layer: NearbyLayer;
  screenX: number;
  onPress: () => void;
}

function ARMarker({ layer, screenX, onPress }: ARMarkerProps) {
  const color = LAYER_COLORS[layer.type] ?? "#9ca3af";
  const icon = (LAYER_ICONS[layer.type] ??
    "location") as keyof typeof Ionicons.glyphMap;

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <TouchableOpacity
      style={[
        styles.marker,
        { left: screenX - 28, backgroundColor: color + "33" },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[styles.markerInner, { borderColor: color }, pulseStyle]}
      >
        <Ionicons name={icon} size={18} color={color} />
      </Animated.View>
      <View
        style={[
          styles.markerLabel,
          { backgroundColor: color + "22", borderColor: color + "44" },
        ]}
      >
        <Text style={[styles.markerTitle, { color }]} numberOfLines={1}>
          {layer.title ?? layer.type}
        </Text>
        <Text style={styles.markerDistance}>{layer.distance}m</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ARScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [compassHeading, setCompassHeading] = useState(0);
  const headingSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  // Request location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Konum Gerekli",
          "LAYR yakınındaki katmanları göstermek için konum iznine ihtiyaç duyar.",
          [{ text: "Tamam" }],
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(loc);

      // Track heading (compass)
      headingSubscription.current = await Location.watchHeadingAsync(
        (heading) => {
          setCompassHeading(heading.trueHeading ?? heading.magHeading);
        },
      );
    })();

    return () => {
      headingSubscription.current?.remove();
    };
  }, []);

  // Fetch nearby layers
  const { data: nearbyData } = useQuery({
    queryKey: [
      "layers",
      "nearby",
      location?.coords.latitude,
      location?.coords.longitude,
    ],
    queryFn: () =>
      apiClient.get(
        `/api/layers/nearby?lat=${location!.coords.latitude}&lng=${location!.coords.longitude}&radius=500&limit=20`,
      ),
    enabled: !!location,
    refetchInterval: 30_000,
  });

  const layers: NearbyLayer[] = nearbyData?.data?.data?.items ?? [];

  /**
   * Calculate bearing from user to a target coordinate (degrees from North).
   */
  const getBearing = useCallback(
    (targetLat: number, targetLng: number): number => {
      if (!location) return 0;
      const lat1 = (location.coords.latitude * Math.PI) / 180;
      const lat2 = (targetLat * Math.PI) / 180;
      const dLng = ((targetLng - location.coords.longitude) * Math.PI) / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      const bearing = (Math.atan2(y, x) * 180) / Math.PI;
      return (bearing + 360) % 360;
    },
    [location],
  );

  if (!cameraPermission) return <View style={styles.container} />;

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons
          name="camera-outline"
          size={64}
          color="rgba(255,255,255,0.3)"
        />
        <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
        <Text style={styles.permissionText}>
          AR katmanlarını görmek için kameraya erişim gerekiyor.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera background */}
      <CameraView style={styles.camera} facing="back">
        {/* AR Markers overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {layers.map((layer) => {
            const bearing = getBearing(layer.location.lat, layer.location.lng);
            const screenX = bearingToScreenX(bearing, compassHeading, W);

            // Only show if on screen (within field of view)
            if (screenX < -60 || screenX > W + 60) return null;

            return (
              <ARMarker
                key={layer.id}
                layer={layer}
                screenX={screenX}
                onPress={() => router.push(`/layer/${layer.id}`)}
              />
            );
          })}
        </View>

        {/* HUD — top bar */}
        <View style={styles.hud}>
          <View style={styles.hudPill}>
            <Ionicons name="location" size={12} color="#6366f1" />
            <Text style={styles.hudText}>{layers.length} katman yakında</Text>
          </View>
        </View>

        {/* Compass indicator */}
        <View style={styles.compass}>
          <Ionicons
            name="compass-outline"
            size={22}
            color="rgba(255,255,255,0.6)"
          />
          <Text style={styles.compassText}>{Math.round(compassHeading)}°</Text>
        </View>

        {/* Bottom hint */}
        {layers.length === 0 && (
          <View style={styles.noLayersHint}>
            <Text style={styles.noLayersText}>
              Henüz yakında katman yok.{"\n"}+ butonuyla ilk hikayeni bırak.
            </Text>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0f0f1a",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  permissionText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 8,
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  // AR markers
  marker: {
    position: "absolute",
    top: H * 0.3,
    width: 56,
    alignItems: "center",
    borderRadius: 28,
    padding: 4,
  },
  markerInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  markerLabel: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 100,
    alignItems: "center",
  },
  markerTitle: {
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 88,
  },
  markerDistance: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    marginTop: 1,
  },

  // HUD
  hud: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 32,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hudPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  hudText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },

  // Compass
  compass: {
    position: "absolute",
    bottom: 110,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  compassText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
  },

  // No layers
  noLayersHint: {
    position: "absolute",
    bottom: 120,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 16,
    padding: 16,
  },
  noLayersText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
