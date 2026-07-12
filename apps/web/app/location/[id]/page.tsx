"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api";
import {
  MapPin,
  ArrowLeft,
  Sparkles,
  Clock,
  ChevronRight,
  Heart,
  Eye,
  User,
  Tag,
  History,
} from "lucide-react";

const COLORS: Record<string, string> = {
  MEMORY: "#f59e0b",
  HISTORICAL: "#8b5cf6",
  REVIEW: "#10b981",
  PHOTO: "#3b82f6",
  VIDEO: "#ef4444",
  AUDIO: "#f97316",
  TEXT: "#6b7280",
  EVENT: "#ec4899",
  AR_OBJECT: "#06b6d4",
};

const TYPE_LABELS: Record<string, string> = {
  MEMORY: "Anı",
  HISTORICAL: "Tarih",
  REVIEW: "Yorum",
  PHOTO: "Fotoğraf",
  VIDEO: "Video",
  AUDIO: "Ses",
  TEXT: "Not",
  EVENT: "Etkinlik",
  AR_OBJECT: "AR Nesne",
};

const CATEGORY_LABELS: Record<string, string> = {
  LANDMARK: "Tarihi Yapı",
  MUSEUM: "Müze",
  MARKET: "Çarşı/Pazar",
  RESTAURANT: "Restoran",
  CAFE: "Kafe",
  PARK: "Park",
  TRANSPORT: "Ulaşım",
  LANDMARK_NATURE: "Doğal Alan",
  OTHER: "Diğer",
};

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [timeYear, setTimeYear] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "all" | "history" | "memory" | "review"
  >("all");

  // Konum detayı
  const { data: locData } = useQuery({
    queryKey: ["location", id],
    queryFn: () => apiClient.get(`/api/locations/${id}`),
    enabled: !!id,
  });

  // Tüm katmanlar
  const { data: layersData } = useQuery({
    queryKey: ["location-layers", id, timeYear],
    queryFn: () =>
      apiClient.get(
        `/api/layers/location/${id}${timeYear ? `?year=${timeYear}` : ""}`,
      ),
    enabled: !!id,
  });

  // AI özeti
  const { data: aiData } = useQuery({
    queryKey: ["ai-summary", id],
    queryFn: () => apiClient.get(`/api/ai/summary/${id}`),
    enabled: !!id,
  });

  const location = locData?.data?.data;
  const allLayers = layersData?.data?.data ?? [];
  const aiSummary = aiData?.data?.data;

  const filteredLayers =
    activeTab === "all"
      ? allLayers
      : allLayers.filter((l: { type: string }) => {
          if (activeTab === "history") return l.type === "HISTORICAL";
          if (activeTab === "memory") return l.type === "MEMORY";
          if (activeTab === "review") return l.type === "REVIEW";
          return true;
        });

  // Zaman yolculuğu için yılları çıkar
  const years: number[] = Array.from(
    new Set(
      allLayers
        .filter((l: { year?: number }) => l.year)
        .map((l: { year: number }) => l.year),
    ),
  ).sort() as number[];

  if (!location) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  const highlights: string[] = aiSummary?.highlights
    ? typeof aiSummary.highlights === "string"
      ? JSON.parse(aiSummary.highlights)
      : aiSummary.highlights
    : [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgba(15,15,26,0.95)] border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold truncate">{location.name}</div>
            <div className="text-xs text-white/40">
              {location.city} •{" "}
              {CATEGORY_LABELS[location.category] ?? location.category}
            </div>
          </div>
          <button
            onClick={() =>
              router.push(`/map?lat=${location.lat}&lng=${location.lng}`)
            }
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 rounded-full px-3 py-1.5"
          >
            <MapPin size={11} />
            Haritada Gör
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 pt-6">
        {/* AI Özet */}
        {aiSummary && (
          <div className="bg-gradient-to-br from-indigo-600/15 to-purple-600/10 border border-indigo-600/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-sm font-bold text-indigo-300">AI Özet</span>
              <span className="ml-auto text-xs text-white/30">
                {aiSummary.layerCount} katman analiz edildi
              </span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-4">
              {aiSummary.summary}
            </p>
            {highlights.length > 0 && (
              <div className="space-y-1.5">
                {highlights.map((h: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-xs text-white/60"
                  >
                    <span className="text-indigo-400 mt-0.5">✦</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ⏱ Zaman Yolculuğu */}
        {years.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-amber-400" />
              <span className="text-sm font-bold">Zaman Yolculuğu</span>
              {timeYear && (
                <button
                  onClick={() => setTimeYear(null)}
                  className="ml-auto text-xs text-white/40 hover:text-white"
                >
                  Tüm zamanlar
                </button>
              )}
            </div>

            {/* Yıl slider */}
            <div className="relative mb-3">
              <input
                type="range"
                min={Math.min(...years)}
                max={new Date().getFullYear()}
                value={timeYear ?? new Date().getFullYear()}
                onChange={(e) => setTimeYear(Number(e.target.value))}
                className="w-full accent-amber-400"
                style={{ height: 4 }}
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>{Math.min(...years)}</span>
                <span className="text-amber-400 font-bold">
                  {timeYear ?? "Günümüz"}
                </span>
                <span>{new Date().getFullYear()}</span>
              </div>
            </div>

            {/* Yıl kısayolları */}
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setTimeYear(y === timeYear ? null : y)}
                  className="text-xs px-3 py-1 rounded-full border transition-colors"
                  style={
                    timeYear === y
                      ? {
                          backgroundColor: "#f59e0b22",
                          borderColor: "#f59e0b",
                          color: "#f59e0b",
                        }
                      : {
                          backgroundColor: "rgba(255,255,255,0.05)",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.5)",
                        }
                  }
                >
                  {y}
                </button>
              ))}
            </div>

            {timeYear && (
              <p className="text-xs text-amber-400/70 mt-3">
                {timeYear} yılına ait veya önceki katmanlar gösteriliyor
              </p>
            )}
          </div>
        )}

        {/* Tab filtresi */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "all", label: `Tümü (${allLayers.length})` },
            { key: "history", label: "Tarih" },
            { key: "memory", label: "Anılar" },
            { key: "review", label: "Yorumlar" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="flex-shrink-0 text-xs px-4 py-1.5 rounded-full border transition-colors"
              style={
                activeTab === tab.key
                  ? {
                      backgroundColor: "#6366f133",
                      borderColor: "#6366f1",
                      color: "#818cf8",
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Katman listesi */}
        {filteredLayers.length === 0 ? (
          <div className="text-center text-white/30 py-8 text-sm">
            {timeYear
              ? `${timeYear} yılına ait katman bulunamadı.`
              : "Bu kategoride katman yok."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLayers.map(
              (layer: {
                id: string;
                type: string;
                title?: string;
                content: string;
                year?: number;
                tags: string | string[];
                viewCount: number;
                reactionCount?: number;
                user: {
                  username: string;
                  displayName: string;
                  isVerified: boolean;
                };
                createdAt: string;
              }) => {
                const color = COLORS[layer.type] ?? "#6b7280";
                const tags = Array.isArray(layer.tags)
                  ? layer.tags
                  : JSON.parse((layer.tags as string) ?? "[]");

                return (
                  <button
                    key={layer.id}
                    onClick={() => router.push(`/layer/${layer.id}`)}
                    className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/8 rounded-2xl p-4 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: color + "22", color }}
                          >
                            {TYPE_LABELS[layer.type] ?? layer.type}
                          </span>
                          {layer.year && (
                            <span className="text-xs text-white/30 flex items-center gap-1">
                              <Clock size={10} />
                              {layer.year}
                            </span>
                          )}
                        </div>

                        {layer.title && (
                          <h3 className="text-sm font-bold mb-1.5 text-white">
                            {layer.title}
                          </h3>
                        )}

                        <p className="text-white/60 text-xs leading-relaxed line-clamp-3">
                          {layer.content}
                        </p>

                        {tags.length > 0 && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {tags.slice(0, 3).map((t: string) => (
                              <span
                                key={t}
                                className="text-xs text-white/30 flex items-center gap-0.5"
                              >
                                <Tag size={9} />
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-white/20 group-hover:text-white/50 flex-shrink-0 mt-1 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <User size={11} className="text-white/30" />
                        <span className="text-xs text-white/40">
                          {layer.user.displayName}
                          {layer.user.isVerified && " ✓"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Eye size={10} />
                          {layer.viewCount}
                        </span>
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Heart size={10} />
                          {layer.reactionCount ?? 0}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
