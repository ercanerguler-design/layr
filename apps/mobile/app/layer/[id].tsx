/**
 * Layer Detay Ekranı — /layer/[id]
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import type { Layer } from "@layr/types";

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

const REACTIONS = [
  { type: "HEART", icon: "heart", label: "Sevdim" },
  { type: "MOVED", icon: "water", label: "Duygulandım" },
  { type: "INTERESTING", icon: "bulb", label: "İlginç" },
  { type: "IMPORTANT", icon: "flag", label: "Önemli" },
] as const;

export default function LayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["layer", id],
    queryFn: () => api.layers.getById(id),
  });

  const layer: Layer | undefined = data?.data?.data;

  const reactMutation = useMutation({
    mutationFn: (type: string) => api.layers.react(id, type),
    onMutate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["layer", id] }),
  });

  const handleShare = async () => {
    if (!layer) return;
    await Share.share({
      message: `LAYR'da "${layer.title ?? layer.type}" hikayesini gör: ${layer.content.slice(0, 100)}...`,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!layer) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Katman bulunamadı.</Text>
      </View>
    );
  }

  const typeColor = LAYER_COLORS[layer.type] ?? "#9ca3af";

  return (
    <ScrollView style={styles.container} bounces={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Type badge */}
      <View style={styles.body}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "22", borderColor: typeColor + "44" }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{layer.type}</Text>
          {layer.year && (
            <Text style={[styles.yearText, { color: typeColor + "aa" }]}>{layer.year}</Text>
          )}
        </View>

        {/* Title */}
        {layer.title && <Text style={styles.title}>{layer.title}</Text>}

        {/* Content */}
        <Text style={styles.content}>{layer.content}</Text>

        {/* Tags */}
        {layer.tags.length > 0 && (
          <View style={styles.tags}>
            {layer.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Media */}
        {layer.media.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
            {layer.media
              .filter((m) => m.type === "IMAGE")
              .map((m) => (
                <Image
                  key={m.id}
                  source={{ uri: m.url }}
                  style={styles.mediaThumb}
                  contentFit="cover"
                />
              ))}
          </ScrollView>
        )}

        {/* Author */}
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            {layer.user.avatarUrl ? (
              <Image
                source={{ uri: layer.user.avatarUrl }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={16} color="rgba(255,255,255,0.5)" />
            )}
          </View>
          <View>
            <Text style={styles.authorName}>{layer.user.displayName}</Text>
            <Text style={styles.authorUsername}>@{layer.user.username}</Text>
          </View>
          {layer.user.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#6366f1" />
          )}
        </View>

        {/* Location info */}
        <TouchableOpacity
          style={styles.locationRow}
          onPress={() => router.push(`/location/${layer.location.id}`)}
        >
          <Ionicons name="location" size={14} color="#6366f1" />
          <Text style={styles.locationText}>{layer.location.name}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>

        {/* Stats */}
        <View style={styles.stats}>
          <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.statText}>{layer.viewCount} görüntülenme</Text>
        </View>

        {/* Reactions */}
        <View style={styles.reactions}>
          {REACTIONS.map((r) => (
            <TouchableOpacity
              key={r.type}
              style={[
                styles.reactionButton,
                layer.userReaction === r.type && styles.reactionActive,
              ]}
              onPress={() => reactMutation.mutate(r.type)}
            >
              <Ionicons
                name={r.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={layer.userReaction === r.type ? "#6366f1" : "rgba(255,255,255,0.4)"}
              />
              <Text
                style={[
                  styles.reactionLabel,
                  layer.userReaction === r.type && { color: "#6366f1" },
                ]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f1a" },
  center: { flex: 1, backgroundColor: "#0f0f1a", alignItems: "center", justifyContent: "center" },
  errorText: { color: "rgba(255,255,255,0.5)", fontSize: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 24 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  typeText: { fontSize: 12, fontWeight: "700" },
  yearText: { fontSize: 12, fontWeight: "600" },
  title: { color: "white", fontSize: 24, fontWeight: "800", marginBottom: 12, lineHeight: 32 },
  content: { color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 26, marginBottom: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(99,102,241,0.2)",
  },
  tagText: { color: "#a5b4fc", fontSize: 12, fontWeight: "600" },
  mediaRow: { marginBottom: 20, flexGrow: 0 },
  mediaThumb: { width: 160, height: 120, borderRadius: 12, marginRight: 10 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 40, height: 40 },
  authorName: { color: "white", fontWeight: "700", fontSize: 14 },
  authorUsername: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  locationText: { color: "rgba(255,255,255,0.6)", fontSize: 13, flex: 1 },
  stats: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 28 },
  statText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  reactions: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    padding: 16,
  },
  reactionButton: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  reactionActive: { backgroundColor: "rgba(99,102,241,0.2)" },
  reactionLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600" },
});
