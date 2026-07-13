"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  MapPin,
  Calendar,
  Heart,
  User,
  ArrowLeft,
  Clock,
  Tag,
  Eye,
  Share2,
  Sparkles,
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

export default function LayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["layer", id],
    queryFn: () => apiClient.get(`/api/layers/${id}`),
    enabled: !!id,
  });

  const layer = data?.data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !layer) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center gap-4">
        <div className="text-white/40 text-sm">Katman bulunamadı.</div>
        <button
          onClick={() => router.back()}
          className="text-indigo-400 text-sm hover:text-indigo-300"
        >
          ← Geri dön
        </button>
      </div>
    );
  }

  const color = COLORS[layer.type] ?? "#6b7280";
  const tags: string[] = Array.isArray(layer.tags) ? layer.tags : [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[rgba(15,15,26,0.95)] border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} className="text-white/70" />
          </button>
          <span className="text-sm text-white/50">Katman Detayı</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Tip badge + başlık */}
        <div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-3"
            style={{ backgroundColor: color + "22", color }}
          >
            <span>{TYPE_LABELS[layer.type] ?? layer.type}</span>
            {layer.year && (
              <>
                <span className="opacity-50">•</span>
                <Clock size={11} />
                <span>{layer.year}</span>
              </>
            )}
          </div>

          {layer.title && (
            <h1 className="text-2xl font-black mb-2 leading-tight">
              {layer.title}
            </h1>
          )}
        </div>

        {/* İçerik */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/8">
          <p className="text-white/85 leading-relaxed text-base whitespace-pre-wrap">
            {layer.content}
          </p>
        </div>

        {/* Medya — Ses, Fotoğraf, 3D Model */}
        {layer.media && layer.media.length > 0 && (
          <div className="space-y-3">
            {layer.media.map(
              (m: {
                id: string;
                type: string;
                url: string;
                mimeType: string;
                duration?: number | null;
              }) => {
                const mediaUrl = m.url.startsWith("http")
                  ? m.url
                  : `http://localhost:3001${m.url}`;

                if (m.type === "AUDIO") {
                  return (
                    <div
                      key={m.id}
                      className="bg-white/5 rounded-2xl p-4 border border-white/8"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🎙️</span>
                        <div>
                          <div className="text-sm font-semibold">Ses Kaydı</div>
                          {m.duration && (
                            <div className="text-xs text-white/40">
                              {Math.floor(m.duration / 60)}:
                              {String(m.duration % 60).padStart(2, "0")}
                            </div>
                          )}
                        </div>
                      </div>
                      <audio
                        controls
                        src={mediaUrl}
                        className="w-full h-10"
                        style={{ filter: "invert(1)" }}
                      />
                    </div>
                  );
                }

                if (m.type === "IMAGE") {
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl overflow-hidden border border-white/8"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl}
                        alt="Fotoğraf"
                        className="w-full max-h-80 object-cover"
                      />
                    </div>
                  );
                }

                if (m.type === "VIDEO") {
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl overflow-hidden border border-white/8"
                    >
                      <video
                        controls
                        src={mediaUrl}
                        className="w-full max-h-80"
                      />
                    </div>
                  );
                }

                if (m.type === "MODEL_3D") {
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-[#0a0a1a]"
                    >
                      <div className="p-3 flex items-center gap-2 border-b border-white/5">
                        <span className="text-lg">🧊</span>
                        <span className="text-xs text-cyan-400 font-semibold">
                          3D Model — AR ile görüntüleyebilirsin
                        </span>
                      </div>
                      <div
                        id={`model-${m.id}`}
                        className="h-72 w-full"
                        data-src={mediaUrl}
                      />
                      <script
                        dangerouslySetInnerHTML={{
                          __html: `
                          import('https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js').then(()=>{
                            const el = document.getElementById('model-${m.id}');
                            if(el && !el.querySelector('model-viewer')){
                              const mv = document.createElement('model-viewer');
                              mv.setAttribute('src','${mediaUrl}');
                              mv.setAttribute('alt','3D Model');
                              mv.setAttribute('ar','');
                              mv.setAttribute('auto-rotate','');
                              mv.setAttribute('camera-controls','');
                              mv.style.cssText='width:100%;height:100%;';
                              el.appendChild(mv);
                            }
                          });
                        `,
                        }}
                      />
                    </div>
                  );
                }

                return null;
              },
            )}
          </div>
        )}

        {/* Konum */}
        <button
          onClick={() => router.push(`/location/${layer.location.id}`)}
          className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/8 rounded-xl p-4 border border-white/8 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-indigo-400" />
          </div>
          <div>
            <div className="text-sm font-semibold">{layer.location.name}</div>
            <div className="text-xs text-white/40">Konumu görüntüle →</div>
          </div>
        </button>

        {/* Meta bilgiler */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <Eye size={16} className="text-white/30 mx-auto mb-1" />
            <div className="text-lg font-bold">{layer.viewCount}</div>
            <div className="text-xs text-white/40">Görüntülenme</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <Heart size={16} className="text-white/30 mx-auto mb-1" />
            <div className="text-lg font-bold">{layer.reactionCount ?? 0}</div>
            <div className="text-xs text-white/40">Reaksiyon</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/8">
            <Calendar size={16} className="text-white/30 mx-auto mb-1" />
            <div className="text-sm font-bold">
              {new Date(layer.createdAt).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "short",
              })}
            </div>
            <div className="text-xs text-white/40">Eklenme</div>
          </div>
        </div>

        {/* Etiketler */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-1 text-white/60"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Kullanıcı */}
        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <User size={18} className="text-white/50" />
            </div>
            <div>
              <div className="text-sm font-semibold flex items-center gap-1.5">
                {layer.user.displayName}
                {layer.user.isVerified && (
                  <span
                    className="text-blue-400 text-xs"
                    title="Doğrulanmış hesap"
                  >
                    ✓
                  </span>
                )}
                {layer.user.isPremium && (
                  <span className="text-amber-400 text-xs" title="Premium üye">
                    👑
                  </span>
                )}
              </div>
              <div className="text-xs text-white/40">
                @{layer.user.username}
              </div>
            </div>
          </div>

          <button
            onClick={() =>
              navigator.share?.({
                title: layer.title ?? "LAYR Katmanı",
                text: layer.content,
                url: window.location.href,
              })
            }
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 transition-colors"
          >
            <Share2 size={12} />
            Paylaş
          </button>
        </div>

        {/* AI ipucu */}
        <div className="flex items-start gap-3 bg-indigo-600/10 border border-indigo-600/20 rounded-2xl p-4">
          <Sparkles
            size={16}
            className="text-indigo-400 flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-xs text-indigo-300/80 leading-relaxed">
              Bu konumun tüm katmanlarını ve AI özetini görmek için konum
              sayfasına git.
            </p>
            <button
              onClick={() => router.push(`/location/${layer.location.id}`)}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
            >
              {layer.location.name} sayfasını aç →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
