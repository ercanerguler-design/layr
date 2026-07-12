import { writeFileSync } from "fs";

const content = `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Search, Layers, X, MapPin, Navigation, Camera, AlertCircle } from "lucide-react";
import type { NearbyLayer } from "@layr/types";

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

const DEFAULT_LAT = 41.0138;
const DEFAULT_LNG = 28.9742;

function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const lat1R = (lat1 * Math.PI) / 180;
  const lat2R = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2R);
  const x = Math.cos(lat1R) * Math.sin(lat2R) - Math.sin(lat1R) * Math.cos(lat2R) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [center, setCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selected, setSelected] = useState<NearbyLayer | null>(null);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

  // AR state
  const [arOpen, setArOpen] = useState(false);
  const [arLayers, setArLayers] = useState<(NearbyLayer & { bearing: number; dist: number })[]>([]);
  const [compass, setCompass] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const arStreamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orientationHandlerRef = useRef<any>(null);

  const { data, refetch } = useQuery({
    queryKey: ["layers", "nearby", center.lat, center.lng],
    queryFn: () =>
      apiClient.get(
        \\\`/api/layers/nearby?lat=\\\${center.lat}&lng=\\\${center.lng}&radius=500&limit=50\\\`
      ),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const layers: NearbyLayer[] = data?.data?.data?.items ?? [];

  // Leaflet init
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id) (mapRef.current as any)._leaflet_id = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(mapRef.current!, { center: [DEFAULT_LAT, DEFAULT_LNG], zoom: 14 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      map.on("moveend", () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
      });
      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) (mapRef.current as any)._leaflet_id = null;
    };
  }, []);

  // Otomatik konum al
  useEffect(() => { goToMyLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToMyLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCenter({ lat, lng });
        leafletRef.current?.flyTo([lat, lng], 16, { duration: 1.2 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Markers
  useEffect(() => {
    if (!leafletRef.current) return;
    import("leaflet").then((L) => {
      (leafletRef.current._markers ?? []).forEach((m: { remove: () => void }) => m.remove());
      leafletRef.current._markers = [];
      layers.forEach((layer) => {
        const color = COLORS[layer.type] ?? "#6b7280";
        const icon = L.divIcon({
          html: \\\`<div style="width:36px;height:36px;border-radius:50%;background:\\\${color}33;border:2.5px solid \\\${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:\\\${color};box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;">\\\${layer.type.charAt(0)}</div>\\\`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const m = L.marker([layer.location.lat, layer.location.lng], { icon })
          .addTo(leafletRef.current)
          .on("click", () => setSelected(layer));
        leafletRef.current._markers.push(m);
      });
    });
  }, [layers]);

  // Arama — her seferinde çalışır, input temizlenir
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    apiClient
      .get(\\\`/api/locations/search?q=\\\${encodeURIComponent(q)}&limit=1\\\`)
      .then((res) => {
        const loc = res.data?.data?.items?.[0];
        if (loc && leafletRef.current) {
          leafletRef.current.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
          setTimeout(() => refetch(), 1800);
        } else {
          alert(\\\`"\\\${q}" bulunamadı.\\\`);
        }
      });
    setQuery("");
  };

  // AR Kamera
  const openAR = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      arStreamRef.current = stream;
      setArOpen(true);

      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        apiClient
          .get(\\\`/api/layers/nearby?lat=\\\${lat}&lng=\\\${lng}&radius=500&limit=20\\\`)
          .then((res) => {
            const items: NearbyLayer[] = res.data?.data?.items ?? [];
            setArLayers(items.map((l) => ({
              ...l,
              bearing: getBearing(lat, lng, l.location.lat, l.location.lng),
              dist: Math.round(getDistance(lat, lng, l.location.lat, l.location.lng)),
            })));
          });
      });

      orientationHandlerRef.current = (e: DeviceOrientationEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const h = (e as any).webkitCompassHeading ?? (e.alpha ? 360 - e.alpha : 0);
        setCompass(h);
      };
      window.addEventListener("deviceorientation", orientationHandlerRef.current);

      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 150);
    } catch {
      alert("Kamera izni gerekli.");
    }
  };

  const closeAR = () => {
    arStreamRef.current?.getTracks().forEach((t) => t.stop());
    arStreamRef.current = null;
    if (orientationHandlerRef.current) {
      window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      orientationHandlerRef.current = null;
    }
    setArOpen(false);
    setArLayers([]);
  };

  const bearingToX = (bearing: number) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 390;
    let diff = bearing - compass;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return w / 2 + (diff / 60) * w;
  };

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* AR Kamera Overlay */}
      {arOpen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* AR Katman Marker'ları */}
          <div className="absolute inset-0 pointer-events-none">
            {arLayers.map((layer) => {
              const color = COLORS[layer.type] ?? "#6b7280";
              const x = bearingToX(layer.bearing);
              const w = typeof window !== "undefined" ? window.innerWidth : 390;
              if (x < -80 || x > w + 80) return null;
              return (
                <div
                  key={layer.id}
                  className="absolute flex flex-col items-center pointer-events-auto cursor-pointer"
                  style={{ left: x - 24, top: "28%" }}
                  onClick={() => { setSelected(layer); closeAR(); }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-xl border-2"
                    style={{ backgroundColor: color + "55", borderColor: color, color }}
                  >
                    {layer.type.charAt(0)}
                  </div>
                  <div className="mt-1 px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: "rgba(0,0,0,0.75)", color }}>
                    {layer.title ?? layer.type}
                  </div>
                  <div className="text-white/60 text-xs">{layer.dist}m</div>
                </div>
              );
            })}
          </div>

          {/* HUD */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 border border-white/20 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Layers size={12} className="text-indigo-400" />
            <span className="text-white/80 text-xs">{arLayers.length} katman • {Math.round(compass)}°</span>
          </div>

          <button
            onClick={closeAR}
            className="absolute top-8 right-5 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>

          {arLayers.length === 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 rounded-2xl px-6 py-4 text-center">
              <AlertCircle size={22} className="text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">Yakında (500m) katman bulunamadı.</p>
            </div>
          )}
        </div>
      )}

      {/* Harita */}
      <div className="relative w-full h-screen bg-[#0f0f1a]">
        {/* Search */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
          <form onSubmit={handleSearch} className="flex items-center bg-[rgba(15,15,26,0.95)] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bir yer ara... (Galata Kulesi, Anıtkabir...)"
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-white/40 text-sm outline-none"
            />
            <button type="submit" className="px-4 text-white/70 hover:text-white">
              <Search size={18} />
            </button>
          </form>
        </div>

        {layers.length > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-4 py-1.5 text-sm">
            <Layers size={14} className="text-indigo-400" />
            <span className="text-white/80">{layers.length} katman yakında</span>
          </div>
        )}

        <div ref={mapRef} className="w-full h-full" />

        {/* Sağ Araçlar */}
        <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={openAR}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-600/40"
            title="AR Kamera ile tara"
          >
            <Camera size={20} className="text-white" />
          </button>
          <button
            onClick={goToMyLocation}
            disabled={locating}
            className="w-12 h-12 rounded-full bg-[rgba(15,15,26,0.9)] border border-white/10 hover:bg-white/10 flex items-center justify-center shadow-lg disabled:opacity-50"
            title="Konumuma git"
          >
            <Navigation size={18} className={locating ? "text-indigo-400 animate-pulse" : "text-white/70"} />
          </button>
        </div>

        {/* Seçili katman */}
        {selected && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
            <div className="bg-[rgba(20,20,35,0.97)] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1" style={{ backgroundColor: \\\`\\\${COLORS[selected.type] ?? "#6b7280"}22\\\`, color: COLORS[selected.type] ?? "#6b7280" }}>
                    {selected.type}
                  </span>
                  {selected.title && <h3 className="font-bold text-white text-sm">{selected.title}</h3>}
                </div>
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-4">{selected.content}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-white/40" />
                  <span className="text-white/40 text-xs">{selected.location.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/40 text-xs">@{selected.user.username}</span>
                  {selected.year && <span className="text-white/40 text-xs">{selected.year}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <a href="/" className="absolute bottom-6 left-6 z-[1000] bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
          ← Ana Sayfa
        </a>
      </div>
    </>
  );
}
`;
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Search, Layers, X, MapPin } from "lucide-react";
import type { NearbyLayer } from "@layr/types";

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

const DEFAULT_LAT = 41.0138;
const DEFAULT_LNG = 28.9742;

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  const [center, setCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selected, setSelected] = useState<NearbyLayer | null>(null);
  const [query, setQuery] = useState("");

  const { data } = useQuery({
    queryKey: ["layers", "nearby", center.lat, center.lng],
    queryFn: () =>
      apiClient.get(
        \`/api/layers/nearby?lat=\${center.lat}&lng=\${center.lng}&radius=3000&limit=50\`
      ),
    staleTime: 30_000,
  });

  const layers: NearbyLayer[] = data?.data?.data?.items ?? [];

  // Init Leaflet (client-only)
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, { center: [DEFAULT_LAT, DEFAULT_LNG], zoom: 14 });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
      });

      leafletRef.current = map;
    });

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  }, []);

  // Sync markers
  useEffect(() => {
    if (!leafletRef.current) return;

    import("leaflet").then((L) => {
      // Remove old markers
      (leafletRef.current._markers ?? []).forEach(
        (m: { remove: () => void }) => m.remove()
      );
      leafletRef.current._markers = [];

      layers.forEach((layer) => {
        const color = COLORS[layer.type] ?? "#6b7280";
        const icon = L.divIcon({
          html: \`<div style="width:36px;height:36px;border-radius:50%;background:\${color}33;border:2.5px solid \${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:\${color};box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;">\${layer.type.charAt(0)}</div>\`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        const m = L.marker([layer.location.lat, layer.location.lng], { icon })
          .addTo(leafletRef.current)
          .on("click", () => setSelected(layer));
        leafletRef.current._markers.push(m);
      });
    });
  }, [layers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    apiClient
      .get(\`/api/locations/search?q=\${encodeURIComponent(query)}&limit=1\`)
      .then((res) => {
        const loc = res.data?.data?.items?.[0];
        if (loc) leafletRef.current?.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
      });
  };

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="relative w-full h-screen bg-[#0f0f1a]">

        {/* Search */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
          <form
            onSubmit={handleSearch}
            className="flex items-center bg-[rgba(15,15,26,0.95)] border border-white/10 rounded-2xl overflow-hidden shadow-xl"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bir yer ara... (Galata Kulesi, Anıtkabir...)"
              className="flex-1 bg-transparent px-4 py-3 text-white placeholder-white/40 text-sm outline-none"
            />
            <button type="submit" className="px-4 text-white/70 hover:text-white">
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* Badge */}
        {layers.length > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-4 py-1.5 text-sm">
            <Layers size={14} className="text-indigo-400" />
            <span className="text-white/80">{layers.length} katman yakında</span>
          </div>
        )}

        {/* Map */}
        <div ref={mapRef} className="w-full h-full" />

        {/* Selected layer card */}
        {selected && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
            <div className="bg-[rgba(20,20,35,0.97)] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span
                    className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1"
                    style={{
                      backgroundColor: \`\${COLORS[selected.type] ?? "#6b7280"}22\`,
                      color: COLORS[selected.type] ?? "#6b7280",
                    }}
                  >
                    {selected.type}
                  </span>
                  {selected.title && (
                    <h3 className="font-bold text-white text-sm">{selected.title}</h3>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-3">
                {selected.content}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-white/40" />
                  <span className="text-white/40 text-xs">{selected.location.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white/40 text-xs">@{selected.user.username}</span>
                  {selected.year && (
                    <span className="text-white/40 text-xs">{selected.year}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Back */}
        <a
          href="/"
          className="absolute bottom-6 left-6 z-[1000] bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          ← Ana Sayfa
        </a>
      </div>
    </>
  );
}
`;

writeFileSync("apps/web/app/map/page.tsx", content, "utf8");
console.log("Written:", content.split("\n").length, "lines");
