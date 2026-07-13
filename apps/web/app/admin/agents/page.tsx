"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Bot,
  MapPin,
  Check,
  X,
} from "lucide-react";
import Image from "next/image";

interface AiAgent {
  id: string;
  locationId: string;
  name: string;
  title?: string;
  greeting?: string;
  avatarEmoji: string;
  avatarColor: string;
  type: string;
  isActive: boolean;
  location?: { name: string; city?: string };
}

const AGENT_TYPES = [
  {
    key: "HISTORICAL",
    label: "Tarihî Figür",
    example: "Atatürk, Fatih Sultan Mehmet",
  },
  {
    key: "NARRATOR",
    label: "Mekan Anlatıcısı",
    example: "Galata Kulesi Rehberi",
  },
  { key: "EXPERT", label: "Uzman", example: "Beslenme Uzmanı, Şef" },
  { key: "ASSISTANT", label: "İşletme Asistanı", example: "Restoran, Otel" },
  {
    key: "CHARACTER",
    label: "Kurgu Karakter",
    example: "Osmanlı Komutanı, Kahraman",
  },
];

const DEFAULT_PERSONAS: Record<string, string> = {
  HISTORICAL:
    "Sen tarihi bir figürsün. Döneminizin olaylarını birinci şahıs ağzından anlat. Heyecanla, bilgelikle ve otantik bir dille konuş.",
  NARRATOR:
    "Sen bu mekanın resmi anlatıcısısın. Mekanın tarihini, önemli anlarını ve hikayelerini anlatıyorsun. Canlı ve ilgi çekici ol.",
  EXPERT:
    "Sen bu alandaki uzmansın. Doğru, güncel ve faydalı bilgiler ver. Samimi ve yardımsever bir dil kullan.",
  ASSISTANT:
    "Sen bu işletmenin dijital asistanısın. Hizmetler, menü ve öneriler hakkında bilgi veriyorsun. Güler yüzlü ve profesyonel ol.",
  CHARACTER:
    "Sen kurgusal bir karaktersin. Rolüne tam uygun, tutarlı ve sürükleyici bir şekilde konuş.",
};

export default function AdminAgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<
    Array<{ id: string; name: string; city?: string }>
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    title: "",
    persona: "",
    greeting: "",
    avatarEmoji: "🤖",
    avatarColor: "#6366f1",
    type: "NARRATOR",
    voiceLang: "tr-TR",
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      // Admin ajanlar için önce lokasyonları çek
      const res = await apiClient.get("/api/locations/search?q=&limit=50");
      const locs = res.data.data.items ?? [];
      const agentList: AiAgent[] = [];
      for (const loc of locs.slice(0, 20)) {
        try {
          const ar = await apiClient.get(`/api/agents/${loc.id}`);
          if (ar.data.data) agentList.push({ ...ar.data.data, location: loc });
        } catch {
          /* lokasyonda ajan yok */
        }
      }
      setAgents(agentList);
    } finally {
      setLoading(false);
    }
  };

  const searchLocations = async (q: string) => {
    if (q.length < 2) {
      setLocationResults([]);
      return;
    }
    const res = await apiClient.get(
      `/api/locations/search?q=${encodeURIComponent(q)}&limit=10`,
    );
    setLocationResults(res.data.data.items ?? []);
  };

  const resetForm = () => {
    setForm({
      name: "",
      title: "",
      persona: "",
      greeting: "",
      avatarEmoji: "🤖",
      avatarColor: "#6366f1",
      type: "NARRATOR",
      voiceLang: "tr-TR",
    });
    setSelectedLocation(null);
    setLocationSearch("");
    setLocationResults([]);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!selectedLocation && !editingId) {
      alert("Konum seçin.");
      return;
    }
    if (!form.name) {
      alert("Ajan adı gerekli.");
      return;
    }
    if (!form.persona) {
      alert("Karakter tanımı gerekli.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await apiClient.patch(`/api/agents/${editingId}`, form);
      } else {
        await apiClient.post("/api/agents", {
          ...form,
          locationId: selectedLocation!.id,
        });
      }
      setShowForm(false);
      resetForm();
      loadAgents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      alert(msg ?? "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ajanını silmek istiyor musun?`)) return;
    await apiClient.delete(`/api/agents/${id}`);
    setAgents((prev) => prev.filter((a) => a.id !== id));
  };

  const handleEdit = (agent: AiAgent) => {
    setEditingId(agent.id);
    setSelectedLocation({
      id: agent.locationId,
      name: agent.location?.name ?? "",
    });
    setForm({
      name: agent.name,
      title: agent.title ?? "",
      persona: "", // persona backend'de gizli
      greeting: agent.greeting ?? "",
      avatarEmoji: agent.avatarEmoji,
      avatarColor: agent.avatarColor,
      type: agent.type,
      voiceLang: "tr-TR",
    });
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[rgba(10,10,20,0.95)] z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"
          >
            <ArrowLeft size={16} className="text-white/70" />
          </button>
          <Image src="/logo.svg" alt="LAYR" width={28} height={28} />
          <div>
            <span className="font-black text-base gradient-text">LAYR</span>
            <span className="text-white/40 text-xs ml-2">AI Ajan Yönetimi</span>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> Yeni Ajan
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Açıklama */}
        <div className="bg-indigo-600/10 border border-indigo-600/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Bot size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-300/80 leading-relaxed">
              <strong>AI Ajanlar</strong> belirli konumlara atanan yapay zeka
              karakterleridir. Kullanıcı o konuma geldiğinde karakterle
              konuşabilir. Anıtkabir için <em>Atatürk</em>, Topkapı için{" "}
              <em>Fatih Sultan Mehmet</em>, bir restoran için{" "}
              <em>Şef karakteri</em> oluşturabilirsin.
            </div>
          </div>
        </div>

        {/* Ajan Listesi */}
        {loading ? (
          <div className="text-center text-white/30 py-12 animate-pulse">
            Ajanlar yükleniyor...
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <Bot size={40} className="mx-auto mb-3 opacity-30" />
            <p>Henüz AI ajan yok. "Yeni Ajan" ile başla.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border-2"
                  style={{
                    backgroundColor: agent.avatarColor + "22",
                    borderColor: agent.avatarColor,
                  }}
                >
                  {agent.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{agent.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                      {agent.type}
                    </span>
                    {!agent.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        Pasif
                      </span>
                    )}
                  </div>
                  {agent.title && (
                    <div className="text-xs text-white/50 mt-0.5">
                      {agent.title}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-white/30 mt-1">
                    <MapPin size={10} />
                    {agent.location?.name}{" "}
                    {agent.location?.city ? `• ${agent.location.city}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(agent)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
                  >
                    <Pencil size={13} className="text-white/50" />
                  </button>
                  <button
                    onClick={() => handleDelete(agent.id, agent.name)}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500/20 flex items-center justify-center"
                  >
                    <Trash2
                      size={13}
                      className="text-white/50 hover:text-red-400"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ajan Oluşturma / Düzenleme Formu */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#0f0f1a] border border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? "Ajanı Düzenle" : "Yeni AI Ajan"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Konum Seç */}
              {!editingId && (
                <div>
                  <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                    Konum *
                  </label>
                  {selectedLocation ? (
                    <div className="flex items-center gap-2 bg-indigo-600/10 border border-indigo-600/30 rounded-xl px-4 py-2.5">
                      <MapPin size={14} className="text-indigo-400" />
                      <span className="text-sm text-white">
                        {selectedLocation.name}
                      </span>
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className="ml-auto text-white/40 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={locationSearch}
                        onChange={(e) => {
                          setLocationSearch(e.target.value);
                          searchLocations(e.target.value);
                        }}
                        placeholder="Konum ara... (Galata Kulesi, Anıtkabir...)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm outline-none"
                      />
                      {locationResults.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden z-10">
                          {locationResults.map((loc) => (
                            <button
                              key={loc.id}
                              onClick={() => {
                                setSelectedLocation(loc);
                                setLocationResults([]);
                                setLocationSearch(loc.name);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm border-b border-white/5 last:border-0"
                            >
                              {loc.name}{" "}
                              <span className="text-white/40 text-xs">
                                {loc.city}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tip */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                  Ajan Tipi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AGENT_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          type: t.key,
                          persona: (f.persona || DEFAULT_PERSONAS[t.key]) ?? "",
                        }));
                      }}
                      className="text-left p-3 rounded-xl border text-xs transition-colors"
                      style={
                        form.type === t.key
                          ? {
                              backgroundColor: "#6366f122",
                              borderColor: "#6366f1",
                              color: "#a5b4fc",
                            }
                          : {
                              backgroundColor: "rgba(255,255,255,0.04)",
                              borderColor: "rgba(255,255,255,0.1)",
                              color: "rgba(255,255,255,0.5)",
                            }
                      }
                    >
                      <div className="font-bold">{t.label}</div>
                      <div className="opacity-60 mt-0.5 truncate">
                        {t.example}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                    Emoji Avatar
                  </label>
                  <input
                    value={form.avatarEmoji}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, avatarEmoji: e.target.value }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-2xl outline-none text-center"
                    maxLength={4}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                    Renk
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      "#6366f1",
                      "#f59e0b",
                      "#10b981",
                      "#ef4444",
                      "#8b5cf6",
                      "#06b6d4",
                      "#ec4899",
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, avatarColor: c }))
                        }
                        className="w-8 h-8 rounded-full border-2 transition-transform"
                        style={{
                          backgroundColor: c,
                          borderColor:
                            form.avatarColor === c ? "white" : "transparent",
                          transform:
                            form.avatarColor === c ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* İsim + Unvan */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                    İsim *
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Atatürk, Şef Ali..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                    Unvan
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="Cumhuriyetin Kurucusu..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                  />
                </div>
              </div>

              {/* Karşılama mesajı */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                  Karşılama Mesajı
                </label>
                <input
                  value={form.greeting}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, greeting: e.target.value }))
                  }
                  placeholder="Merhaba! Ben Atatürk. Sizi bu topraklar üzerinde karşılamaktan..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                />
              </div>

              {/* Karakter Tanımı (Persona) */}
              <div>
                <label className="block text-xs text-white/60 mb-1.5 font-semibold uppercase tracking-wide">
                  Karakter Tanımı (Sistem Promptu) *
                </label>
                <textarea
                  value={form.persona}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, persona: e.target.value }))
                  }
                  rows={5}
                  placeholder="Sen kimsin? Nasıl konuşuyorsun? Hangi konuları biliyor / bilmiyorsun?..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none resize-none"
                />
                <p className="text-xs text-white/30 mt-1">
                  Kullanıcıya gösterilmez. AI'nin nasıl davranacağını belirler.
                </p>
              </div>

              {/* Kaydet */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-bold flex items-center justify-center gap-2"
              >
                {saving ? (
                  "Kaydediliyor..."
                ) : (
                  <>
                    <Check size={16} /> Ajanı Kaydet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
