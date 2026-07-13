import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Camera,
  Clock,
  Sparkles,
  ArrowRight,
  Zap,
  Globe,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "AR Katmanlar",
    description:
      "Telefonunu kaldır — gerçek dünyanın üzerine dijital hikayeler, ses kayıtları ve fotoğraflar çık.",
    color: "#8b5cf6",
  },
  {
    icon: Clock,
    title: "Zaman Yolculuğu",
    description:
      "Yıl sliderını sürükle — herhangi bir mekânın geçmişte nasıl göründüğünü keşfet.",
    color: "#06b6d4",
  },
  {
    icon: Sparkles,
    title: "AI Rehber",
    description:
      "Yapay zeka ilgi alanlarını biliyor. Tarihçiysen Osmanlı eserlerini, otomobil seviyorsan eski fabrikaların hikayesini gösterir.",
    color: "#f59e0b",
  },
  {
    icon: MapPin,
    title: "Hafıza Bırak",
    description:
      "Dedenin diktiği ağaç, ilk öpücüğün olduğu bank, aile pikniği... Her yere iz bırak, her iz sonsuza dek durur.",
    color: "#10b981",
  },
];

const stats = [
  { value: "10+", label: "Şehir", icon: Globe },
  { value: "∞", label: "Hafıza", icon: Sparkles },
  { value: "AI", label: "Destekli", icon: Zap },
  { value: "4", label: "Kullanıcı", icon: Users },
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen text-white overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #08080f 0%, #0f0a1e 50%, #08080f 100%)",
      }}
    >
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass-dark">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="LAYR" width={32} height={32} />
          <span className="text-2xl font-black gradient-text tracking-tight">
            LAYR
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
          >
            Keşfet
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block"
          >
            Giriş
          </Link>
          <Link
            href="/register"
            className="btn-primary text-sm py-2 px-5 rounded-full"
          >
            Başla
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center pt-20">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm mb-8"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.25)",
            }}
          >
            <Sparkles size={13} className="text-violet-400" />
            <span className="text-violet-300/80">AR + AI + Dünya Hafızası</span>
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <Image
              src="/logo.svg"
              alt="LAYR"
              width={72}
              height={72}
              className="animate-pulse"
            />
          </div>

          <h1 className="text-7xl md:text-9xl font-black mb-6 leading-none tracking-tighter">
            <span className="gradient-text">LAYR</span>
          </h1>

          <p
            className="text-2xl md:text-3xl font-light mb-4"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            Dünyadaki her yerin bir hikâyesi var.
          </p>

          <p
            className="text-lg mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Google Maps sana <span className="text-white/60">⭐ 4.7</span>{" "}
            gösterir. LAYR sana{" "}
            <span className="text-violet-400">
              &ldquo;burada biri evlenme teklifi etti&rdquo;
            </span>{" "}
            der.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/map"
              className="group btn-primary flex items-center justify-center gap-2 px-8 py-4 text-base"
            >
              Haritayı Keşfet
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 glass hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl transition-all"
            >
              Hikayeni Bırak
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 mt-20 grid grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <s.icon size={16} className="text-violet-400 mx-auto mb-1" />
              <div className="text-3xl font-black gradient-text">{s.value}</div>
              <div
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center mb-3">
          Her yerin <span className="gradient-text">hafızası</span> var
        </h2>
        <p
          className="text-center mb-16 max-w-xl mx-auto"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Google Maps değil. Instagram değil. TikTok değil. Bunların arasında
          yeni bir katman.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="card p-8 hover:border-violet-500/30 transition-all group"
              style={{ borderColor: `${f.color}18` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110"
                style={{ backgroundColor: f.color + "20" }}
              >
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p
                className="leading-relaxed"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <div
          className="card max-w-3xl mx-auto p-16 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.06))",
            borderColor: "rgba(139,92,246,0.25)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(124,58,237,0.1) 0%, transparent 70%)",
            }}
          />
          <h2 className="relative text-4xl font-black mb-4">
            İlk iz bırakanlardan ol
          </h2>
          <p
            className="relative mb-8 text-lg"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Şehir şehir, sokak sokak, bina bina. Her yer bir hikaye bekliyor.
          </p>
          <Link
            href="/register"
            className="relative btn-primary inline-flex items-center gap-2 text-lg px-10 py-4"
          >
            Ücretsiz Başla <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}
