"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.auth.login(email, password);
      localStorage.setItem("layr_access_token", data.data.accessToken);
      localStorage.setItem("layr_refresh_token", data.data.refreshToken);
      router.push("/map");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Giriş başarısız. Bilgilerini kontrol et.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-4xl font-black gradient-text">LAYR</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold mb-2 text-center">
            Tekrar hoş geldin
          </h1>
          <p className="text-white/50 text-center text-sm mb-8">
            Hikayelerin seni bekliyor.
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                E-posta veya Kullanıcı Adı
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500 transition-colors"
                placeholder="sen@örnek.com veya kullanıcıadı"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-1.5">
                Şifre
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 outline-none focus:border-indigo-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Giriş Yap
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Hesabın yok mu?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
