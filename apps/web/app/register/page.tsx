"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Loader2, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.auth.register(form);
      localStorage.setItem("layr_access_token", data.data.accessToken);
      localStorage.setItem("layr_refresh_token", data.data.refreshToken);
      router.push("/map");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Kayıt başarısız.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "email" as const, label: "E-posta", type: "email", placeholder: "sen@örnek.com", autocomplete: "email" },
    { key: "username" as const, label: "Kullanıcı adı", type: "text", placeholder: "aliyildiz", autocomplete: "username" },
    { key: "displayName" as const, label: "Görünen ad", type: "text", placeholder: "Ali Yıldız", autocomplete: "name" },
    { key: "password" as const, label: "Şifre", type: "password", placeholder: "En az 8 karakter", autocomplete: "new-password" },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-4xl font-black gradient-text">LAYR</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold mb-2 text-center">İlk izini bırak</h1>
          <p className="text-white/50 text-center text-sm mb-8">
            Ücretsiz hesap oluştur, anılarını dünyayla paylaş.
          </p>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-white/70 mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={update(f.key)}
                  required
                  autoComplete={f.autocomplete}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500 transition-colors"
                  placeholder={f.placeholder}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              Kayıt Ol
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Hesabın var mı?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
