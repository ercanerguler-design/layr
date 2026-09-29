"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  MapPin,
  Loader2,
  CheckCircle,
  ImagePlus,
  Trash2,
  Mic,
  Square,
  Play,
  Pause,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import Image from "next/image";

interface AddLayerModalProps {
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const LAYER_TYPES = [
  { key: "MEMORY", label: "Anı", icon: "❤️", color: "#f59e0b" },
  { key: "HISTORICAL", label: "Tarih", icon: "📜", color: "#8b5cf6" },
  { key: "REVIEW", label: "Yorum", icon: "⭐", color: "#10b981" },
  { key: "TEXT", label: "Not", icon: "💬", color: "#6b7280" },
  { key: "EVENT", label: "Etkinlik", icon: "📅", color: "#ec4899" },
  { key: "PHOTO", label: "Fotoğraf", icon: "📷", color: "#3b82f6" },
  { key: "AUDIO", label: "Ses Kaydı", icon: "🎙️", color: "#f97316" },
  { key: "AR_OBJECT", label: "3D Model", icon: "🧊", color: "#06b6d4" },
] as const;

type LayerTypeKey = (typeof LAYER_TYPES)[number]["key"];

export function AddLayerModal({
  lat,
  lng,
  onClose,
  onSuccess,
}: AddLayerModalProps): JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<LayerTypeKey>("MEMORY");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [year, setYear] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Fotoğraf state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Ses kayıt state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selected = LAYER_TYPES.find((t) => t.key === type)!;

  // Ses kayıt temizle
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s >= 300) {
            mr.stop();
            setRecording(false);
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Mikrofon izni gerekli.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAudioDuration(recordSeconds);
  };

  const playAudio = () => {
    if (!audioBlob) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      setAudioPlaying(false);
      audioRef.current = null;
    };
    audio.play();
    setAudioPlaying(true);
  };

  const formatSeconds = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = type === "AR_OBJECT" ? 50 : 10;
    if (file.size > maxMB * 1024 * 1024) {
      alert(`Maksimum ${maxMB} MB.`);
      return;
    }
    setPhotoFile(file);
    // 3D model için DataURL preview gerekmez
    if (type === "AR_OBJECT") {
      setPhotoPreview("3d-model");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && type !== "PHOTO" && type !== "AUDIO") return;
    if (type === "PHOTO" && !photoFile && !content.trim()) {
      alert("Fotoğraf seç veya açıklama yaz.");
      return;
    }
    if (type === "AUDIO" && !audioBlob && !content.trim()) {
      alert("Ses kaydı yap veya açıklama yaz.");
      return;
    }

    // Token kontrolü
    const token = localStorage.getItem("layr_access_token");
    if (!token) {
      if (
        confirm(
          "Katman bırakmak için giriş yapman gerekiyor. Giriş sayfasına git?",
        )
      ) {
        router.push("/login");
      }
      return;
    }

    setLoading(true);
    try {
      // Konumu bul veya oluştur
      const locRes = await apiClient.post("/api/locations", {
        name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        category: "OTHER",
      });
      const locationId = locRes.data.data.id;

      // Fotoğraf varsa önce yükle
      const media: Array<{ url: string; type: string; mimeType: string; size: number }> = [];
      if (photoFile && type === "PHOTO") {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("file", photoFile);
        const uploadRes = await apiClient.post("/api/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = uploadRes.data?.data;
        if (uploaded?.url) media.push(uploaded);
        setUploadingPhoto(false);
      }

      // Ses kaydı varsa yükle
      if (audioBlob && type === "AUDIO") {
        setUploadingPhoto(true);
        const audioFile = new File([audioBlob], "kayit.webm", {
          type: "audio/webm",
        });
        const formData = new FormData();
        formData.append("file", audioFile);
        const uploadRes = await apiClient.post("/api/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = uploadRes.data?.data;
        if (uploaded?.url) media.push(uploaded);
        setUploadingPhoto(false);
      }

      await apiClient.post("/api/layers", {
        locationId,
        title: title.trim() || undefined,
        content:
          content.trim() ||
          (type === "PHOTO"
            ? "📷 Fotoğraf paylaşıldı"
            : type === "AUDIO"
              ? `🎙️ Ses kaydı — ${formatSeconds(audioDuration)}`
              : ""),
        type,
        year: year ? parseInt(year) : undefined,
        isPublic: true,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        media,
      });

      setDone(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      if (msg?.includes("Unauthorized")) {
        alert("Oturum süresi dolmuş. Tekrar giriş yap.");
        router.push("/login");
      } else {
        alert(msg || "Katman eklenemedi. Tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-end justify-center p-4">
        <div className="bg-[rgba(20,20,35,0.98)] border border-white/10 rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl">
          <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-1">
            Katman Bırakıldı!
          </h3>
          <p className="text-white/50 text-sm">Bu noktaya hikayen eklendi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[rgba(15,15,26,0.98)] border border-white/10 rounded-t-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Katman Bırak</h2>
            <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
              <MapPin size={10} />
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tip seç */}
          <div>
            <label className="block text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide">
              Katman Türü
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LAYER_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setType(t.key)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-sm"
                  style={
                    type === t.key
                      ? {
                          backgroundColor: t.color + "22",
                          borderColor: t.color,
                          color: t.color,
                        }
                      : {
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: "rgba(255,255,255,0.5)",
                        }
                  }
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Başlık */}
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
              Başlık (opsiyonel)
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50"
              placeholder="Kısa bir başlık..."
              maxLength={120}
            />
          </div>

          {/* Ses Kaydı — sadece AUDIO tipinde */}
          {type === "AUDIO" && (
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                Ses Kaydı{" "}
                {!audioBlob && <span className="text-red-400">*</span>}
              </label>

              {!audioBlob ? (
                <div className="flex flex-col items-center gap-3 py-6 border-2 border-dashed border-orange-500/30 rounded-xl bg-orange-500/5">
                  {recording ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                        <Mic size={28} className="text-red-400" />
                      </div>
                      <div className="text-red-400 font-mono text-xl font-bold">
                        {formatSeconds(recordSeconds)}
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-2 rounded-full text-sm font-semibold"
                      >
                        <Square size={14} fill="currentColor" /> Durdur
                      </button>
                    </>
                  ) : (
                    <>
                      <Mic size={32} className="text-orange-400/60" />
                      <p className="text-white/40 text-xs">Konuşmanı kaydet</p>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-colors"
                      >
                        <Mic size={16} /> Kayda Başla
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <button
                    type="button"
                    onClick={playAudio}
                    className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"
                  >
                    {audioPlaying ? (
                      <Pause size={16} className="text-white" />
                    ) : (
                      <Play size={14} className="text-white ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="text-sm text-white font-semibold">
                      Ses Kaydı
                    </div>
                    <div className="text-xs text-white/50">
                      {formatSeconds(audioDuration)} • webm
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBlob(null);
                      setAudioDuration(0);
                    }}
                    className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Fotoğraf yükleme — sadece PHOTO tipinde */}
          {type === "PHOTO" && (
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                Fotoğraf <span className="text-red-400">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-white/10">
                  <Image
                    src={photoPreview}
                    alt="Önizleme"
                    width={400}
                    height={200}
                    className="w-full h-40 object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center"
                  >
                    <Trash2 size={13} className="text-white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400/50 hover:bg-blue-400/5 transition-colors"
                >
                  <ImagePlus size={28} className="text-white/30" />
                  <span className="text-xs text-white/40">
                    Fotoğraf seçmek için tıkla
                  </span>
                  <span className="text-xs text-white/20">
                    JPG, PNG, WEBP • Max 10 MB
                  </span>
                </button>
              )}
            </div>
          )}

          {/* İçerik */}
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
              Hikaye / İçerik
              {type !== "PHOTO" && <span className="text-red-400"> *</span>}
              {type === "PHOTO" && (
                <span className="text-white/30"> (opsiyonel)</span>
              )}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50 resize-none"
              placeholder="Bu yere dair ne biliyorsun? Ne hissettin? Ne gördün?"
              maxLength={3000}
            />
            <div className="text-right text-xs text-white/20 mt-1">
              {content.length}/3000
            </div>
          </div>

          {/* 3D Model yükleme — sadece AR_OBJECT tipinde */}
          {type === "AR_OBJECT" && (
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                3D Model Dosyası (.glb veya .gltf)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                onChange={handleFileChange}
                className="hidden"
              />
              {photoPreview ? (
                <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg">
                    🧊
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-white font-semibold">
                      {photoFile?.name}
                    </div>
                    <div className="text-xs text-white/50">
                      {photoFile
                        ? (photoFile.size / 1024 / 1024).toFixed(1)
                        : 0}{" "}
                      MB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-28 border-2 border-dashed border-cyan-500/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-cyan-400/50 hover:bg-cyan-400/5 transition-colors"
                >
                  <span className="text-3xl">🧊</span>
                  <span className="text-xs text-white/40">
                    GLB / GLTF dosyası seç (max 50 MB)
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Yıl (tarihsel içerik için) */}
          {type === "HISTORICAL" && (
            <div>
              <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                Yıl (opsiyonel)
              </label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                type="number"
                min="0"
                max={new Date().getFullYear()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50"
                placeholder="ör. 1923"
              />
            </div>
          )}

          {/* Etiketler */}
          <div>
            <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
              Etiketler (virgülle ayır)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none focus:border-indigo-500/50"
              placeholder="tarih, anı, istanbul"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              loading || uploadingPhoto || (!content.trim() && type !== "PHOTO")
            }
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: selected.color }}
          >
            {loading || uploadingPhoto ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {uploadingPhoto ? "Fotoğraf yükleniyor..." : "Kaydediliyor..."}
              </>
            ) : (
              <>
                <MapPin size={16} />
                Bu Noktaya Bırak
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
