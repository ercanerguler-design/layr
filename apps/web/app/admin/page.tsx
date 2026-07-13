"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  Users,
  MapPin,
  Layers,
  Activity,
  TrendingUp,
  Shield,
  LogOut,
  Eye,
  Clock,
  Crown,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";

interface Stats {
  users: { total: number; today: number; premium: number; verified: number };
  layers: { total: number; today: number; byType: Record<string, number> };
  locations: { total: number; cities: number };
  recentLayers: Array<{
    id: string;
    title?: string;
    content: string;
    type: string;
    createdAt: string;
    user: { username: string; displayName: string };
    location: { name: string };
  }>;
  recentUsers: Array<{
    id: string;
    username: string;
    displayName: string;
    role: string;
    createdAt: string;
    isPremium: boolean;
  }>;
}

const TYPE_COLORS: Record<string, string> = {
  MEMORY: "#f59e0b",
  HISTORICAL: "#8b5cf6",
  REVIEW: "#10b981",
  PHOTO: "#3b82f6",
  VIDEO: "#ef4444",
  AUDIO: "#f97316",
  TEXT: "#6b7280",
  EVENT: "#ec4899",
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("layr_access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchStats = async () => {
      try {
        // Paralel veri çek
        const [usersRes, layersRes, locsRes, recentLayersRes, recentUsersRes] =
          await Promise.all([
            apiClient.get("/api/admin/stats/users"),
            apiClient.get("/api/admin/stats/layers"),
            apiClient.get("/api/admin/stats/locations"),
            apiClient.get("/api/admin/recent/layers"),
            apiClient.get("/api/admin/recent/users"),
          ]);

        setStats({
          users: usersRes.data.data,
          layers: layersRes.data.data,
          locations: locsRes.data.data,
          recentLayers: recentLayersRes.data.data,
          recentUsers: recentUsersRes.data.data,
        });
      } catch (e: unknown) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 403) {
          setError("Bu sayfaya erişim için admin yetkisi gerekiyor.");
        } else {
          setError("Veriler yüklenemedi.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("layr_access_token");
    localStorage.removeItem("layr_refresh_token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-white/40 animate-pulse">
          Admin paneli yükleniyor...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center gap-4">
        <Shield size={48} className="text-red-400" />
        <p className="text-white/60">{error}</p>
        <button
          onClick={() => router.push("/")}
          className="text-indigo-400 text-sm"
        >
          Ana sayfaya dön
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[rgba(10,10,20,0.95)] z-10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="LAYR" width={32} height={32} />
          <div>
            <span className="font-black text-lg gradient-text">LAYR</span>
            <span className="text-white/40 text-xs ml-2">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/map")}
            className="text-xs text-white/50 hover:text-white flex items-center gap-1"
          >
            <Eye size={14} /> Uygulamayı Gör
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-400/10 px-3 py-1.5 rounded-full"
          >
            <LogOut size={12} /> Çıkış
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Ana istatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: Users,
              label: "Toplam Kullanıcı",
              value: stats.users.total,
              sub: `+${stats.users.today} bugün`,
              color: "#6366f1",
            },
            {
              icon: Layers,
              label: "Toplam Katman",
              value: stats.layers.total,
              sub: `+${stats.layers.today} bugün`,
              color: "#f59e0b",
            },
            {
              icon: MapPin,
              label: "Lokasyon",
              value: stats.locations.total,
              sub: `${stats.locations.cities} şehir`,
              color: "#10b981",
            },
            {
              icon: TrendingUp,
              label: "Premium Üye",
              value: stats.users.premium,
              sub: `${stats.users.verified} doğrulanmış`,
              color: "#ec4899",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/8 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon size={20} style={{ color: stat.color }} />
                <span className="text-xs text-white/30">{stat.sub}</span>
              </div>
              <div className="text-3xl font-black">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-xs text-white/50 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Katman tipi dağılımı */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" />
              Katman Tipi Dağılımı
            </h2>
            <div className="space-y-2">
              {Object.entries(stats.layers.byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const pct =
                    stats.layers.total > 0
                      ? Math.round((count / stats.layers.total) * 100)
                      : 0;
                  const color = TYPE_COLORS[type] ?? "#6b7280";
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-xs w-20 text-white/50">{type}</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-xs text-white/50 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Son kullanıcılar */}
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Users size={16} className="text-green-400" />
                Son Kayıt Olan Kullanıcılar
              </h2>
              <button
                onClick={() => router.push("/admin/users")}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-600/10 px-3 py-1.5 rounded-full"
              >
                <Crown size={11} /> Tümünü Yönet <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {user.displayName}
                      {user.isPremium && (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
                          Premium
                        </span>
                      )}
                      {user.role === "ADMIN" && (
                        <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">
                      @{user.username}
                    </div>
                  </div>
                  <div className="text-xs text-white/30 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Son katmanlar */}
        <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Layers size={16} className="text-amber-400" />
            Son Eklenen Katmanlar
          </h2>
          <div className="space-y-3">
            {stats.recentLayers.map((layer) => {
              const color = TYPE_COLORS[layer.type] ?? "#6b7280";
              return (
                <div
                  key={layer.id}
                  className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0"
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: color + "22", color }}
                  >
                    {layer.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    {layer.title && (
                      <div className="text-sm font-semibold truncate">
                        {layer.title}
                      </div>
                    )}
                    <p className="text-white/50 text-xs line-clamp-1">
                      {layer.content}
                    </p>
                    <div className="text-xs text-white/30 mt-1">
                      @{layer.user.username} • {layer.location.name}
                    </div>
                  </div>
                  <div className="text-xs text-white/30 flex-shrink-0 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(layer.createdAt).toLocaleDateString("tr-TR")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
