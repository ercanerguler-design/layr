"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  ArrowLeft,
  Search,
  Crown,
  CheckCircle,
  Shield,
  Trash2,
  UserX,
  RefreshCw,
  Users,
} from "lucide-react";
import Image from "next/image";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isPremium: boolean;
  isVerified: boolean;
  createdAt: string;
  lastActiveAt: string;
  layerCount: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (p = 1, search = "") => {
      setLoading(true);
      try {
        const token = localStorage.getItem("layr_access_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const res = await apiClient.get(
          `/api/admin/users?page=${p}&q=${encodeURIComponent(search)}`,
        );
        setUsers(res.data.data.users);
        setTotal(res.data.data.total);
        setPage(res.data.data.page);
        setPages(res.data.data.pages);
      } catch {
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    fetchUsers(1, q);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePremium = async (userId: string, current: boolean) => {
    setUpdating(userId);
    try {
      await apiClient.patch(`/api/admin/users/${userId}/premium`, {
        isPremium: !current,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isPremium: !current } : u)),
      );
    } finally {
      setUpdating(null);
    }
  };

  const toggleVerified = async (userId: string, current: boolean) => {
    setUpdating(userId);
    try {
      await apiClient.patch(`/api/admin/users/${userId}/premium`, {
        isVerified: !current,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isVerified: !current } : u)),
      );
    } finally {
      setUpdating(null);
    }
  };

  const makeAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    if (!confirm(`Bu kullanıcıyı ${newRole} yapmak istediğinden emin misin?`))
      return;
    setUpdating(userId);
    try {
      await apiClient.patch(`/api/admin/users/${userId}/role`, {
        role: newRole,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (
      !confirm(
        `@${username} kullanıcısını kalıcı olarak silmek istediğinden emin misin?`,
      )
    )
      return;
    setUpdating(userId);
    try {
      await apiClient.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setTotal((t) => t - 1);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Header */}
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
            <span className="text-white/40 text-xs ml-2">
              Kullanıcı Yönetimi
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">{total} kullanıcı</span>
          <button
            onClick={() => fetchUsers(page, q)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            <RefreshCw size={14} className="text-white/60" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Arama */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <Search size={16} className="text-white/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchUsers(1, q)}
              placeholder="Kullanıcı adı, e-posta veya isim ara..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
            />
          </div>
          <button
            onClick={() => fetchUsers(1, q)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold"
          >
            Ara
          </button>
        </div>

        {/* Açıklama */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <Crown size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-300/80 leading-relaxed">
            <strong>Premium</strong> işaretlediğin kullanıcılar: Gelişmiş AI
            (sesli rehber, farklı modlar, kişisel öneriler), geniş arama
            yarıçapı (10km), özel badge.
            <br />
            <strong>Doğrulanmış</strong> işaretlediğin kullanıcılar: Profilde
            mavi tik ✓ görünür.
          </div>
        </div>

        {/* Kullanıcı Listesi */}
        {loading ? (
          <div className="text-center text-white/30 py-12 animate-pulse">
            Yükleniyor...
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-4"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-indigo-300">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>

                {/* Bilgiler */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold truncate">
                      {user.displayName}
                    </span>
                    {user.isPremium && (
                      <span className="flex items-center gap-0.5 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        <Crown size={9} /> Premium
                      </span>
                    )}
                    {user.isVerified && (
                      <span className="flex items-center gap-0.5 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        <CheckCircle size={9} /> Doğrulanmış
                      </span>
                    )}
                    {user.role === "ADMIN" && (
                      <span className="flex items-center gap-0.5 text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                        <Shield size={9} /> Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">
                    @{user.username} • {user.email} • {user.layerCount} katman
                  </div>
                </div>

                {/* Aksiyonlar */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Premium toggle */}
                  <button
                    onClick={() => togglePremium(user.id, user.isPremium)}
                    disabled={updating === user.id}
                    title={user.isPremium ? "Premium'u kaldır" : "Premium yap"}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50"
                    style={
                      user.isPremium
                        ? {
                            backgroundColor: "#f59e0b22",
                            borderColor: "#f59e0b",
                            color: "#f59e0b",
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: "rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                  >
                    <Crown size={11} />
                    {user.isPremium ? "Premium" : "Premium Yap"}
                  </button>

                  {/* Verified toggle */}
                  <button
                    onClick={() => toggleVerified(user.id, user.isVerified)}
                    disabled={updating === user.id}
                    title={user.isVerified ? "Doğrulamayı kaldır" : "Doğrula"}
                    className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-50"
                    style={
                      user.isVerified
                        ? {
                            backgroundColor: "#3b82f622",
                            borderColor: "#3b82f6",
                            color: "#60a5fa",
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: "rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.3)",
                          }
                    }
                  >
                    <CheckCircle size={14} />
                  </button>

                  {/* Admin toggle */}
                  <button
                    onClick={() => makeAdmin(user.id, user.role)}
                    disabled={updating === user.id}
                    title={
                      user.role === "ADMIN" ? "Admin'den çıkar" : "Admin yap"
                    }
                    className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-50"
                    style={
                      user.role === "ADMIN"
                        ? {
                            backgroundColor: "#ef444422",
                            borderColor: "#ef4444",
                            color: "#f87171",
                          }
                        : {
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderColor: "rgba(255,255,255,0.15)",
                            color: "rgba(255,255,255,0.3)",
                          }
                    }
                  >
                    <Shield size={14} />
                  </button>

                  {/* Sil */}
                  <button
                    onClick={() => deleteUser(user.id, user.username)}
                    disabled={updating === user.id}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    <UserX
                      size={13}
                      className="text-white/40 hover:text-red-400"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sayfalama */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => fetchUsers(page - 1, q)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30"
            >
              ← Önceki
            </button>
            <span className="text-white/50 text-sm">
              {page} / {pages}
            </span>
            <button
              onClick={() => fetchUsers(page + 1, q)}
              disabled={page >= pages}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30"
            >
              Sonraki →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
