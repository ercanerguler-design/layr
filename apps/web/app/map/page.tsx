"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  Search,
  Layers,
  X,
  MapPin,
  Navigation,
  Camera,
  AlertCircle,
  Plus,
  PenLine,
} from "lucide-react";
import type { NearbyLayer } from "@layr/types";
import { AddLayerModal } from "@/components/AddLayerModal";

// Bearing: kuzeyden saat yönünde derece
function getBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const l1 = (lat1 * Math.PI) / 180,
    l2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(l2);
  const x =
    Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180,
    dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [center, setCenter] = useState({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
  const [selected, setSelected] = useState<NearbyLayer | null>(null);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const userMarkerRef = useRef<unknown>(null);
  // AR state
  const [arOpen, setArOpen] = useState(false);
  const [addLayerOpen, setAddLayerOpen] = useState(false);
  const [addLayerPos, setAddLayerPos] = useState({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });
  const [arLayers, setArLayers] = useState<
    (NearbyLayer & { bearing: number; dist: number })[]
  >([]);
  const [arLocations, setArLocations] = useState<
    Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      category: string;
      layerCount?: number;
      aiSummary?: { summary: string } | null;
      bearing: number;
      dist: number;
    }>
  >([]);
  const [targetedLocation, setTargetedLocation] = useState<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    category: string;
    layerCount?: number;
    aiSummary?: { summary: string } | null;
    bearing: number;
    dist: number;
  } | null>(null);
  const [compass, setCompass] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const arStreamRef = useRef<MediaStream | null>(null);
  const orientationRef = useRef<((e: DeviceOrientationEvent) => void) | null>(
    null,
  );

  const { data, refetch } = useQuery({
    queryKey: ["layers", "nearby", center.lat, center.lng],
    queryFn: () =>
      apiClient.get(
        `/api/layers/nearby?lat=${center.lat}&lng=${center.lng}&radius=500&limit=50`,
      ),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const layers: NearbyLayer[] = data?.data?.data?.items ?? [];

  // Otomatik konum
  useEffect(() => {
    goToMyLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Tarayıcın konum desteklemiyor.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setCenter({ lat, lng });
        leafletRef.current?.flyTo([lat, lng], accuracy < 150 ? 17 : 15, {
          duration: 1.2,
        });
        setLocating(false);

        // Mavi GPS nokta
        import("leaflet").then((L) => {
          if (!leafletRef.current) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (userMarkerRef.current as any)?.remove();
          const icon = L.divIcon({
            html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.25);"></div>`,
            className: "",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
          userMarkerRef.current = L.marker([lat, lng], {
            icon,
            zIndexOffset: 1000,
          })
            .addTo(leafletRef.current)
            .bindPopup(`📍 Konumunuz (~${Math.round(accuracy)}m hassasiyet)`);
        });
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          alert(
            "Konum izni verilmedi.\n\nURL çubuğundaki kilit simgesine → Site Ayarları → Konum → İzin Ver.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, []);

  // Init Leaflet (client-only)
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((mapRef.current as any)._leaflet_id)
        (mapRef.current as any)._leaflet_id = null; // eslint-disable-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [DEFAULT_LAT, DEFAULT_LNG],
        zoom: 14,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.on("moveend", () => {
        const c = map.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
      });

      // Harita uzun basma → katman ekle
      map.on("contextmenu", (e) => {
        setAddLayerPos({ lat: e.latlng.lat, lng: e.latlng.lng });
        setAddLayerOpen(true);
      });

      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) (mapRef.current as any)._leaflet_id = null;
    };
  }, []);

  // Sync markers
  useEffect(() => {
    if (!leafletRef.current) return;

    import("leaflet").then((L) => {
      // Remove old markers
      (leafletRef.current._markers ?? []).forEach((m: { remove: () => void }) =>
        m.remove(),
      );
      leafletRef.current._markers = [];

      layers.forEach((layer) => {
        const color = COLORS[layer.type] ?? "#6b7280";
        const icon = L.divIcon({
          html: `<div style="width:36px;height:36px;border-radius:50%;background:${color}33;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:${color};box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:pointer;">${layer.type.charAt(0)}</div>`,
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
    const q = query.trim();
    if (!q) return;
    setQuery(""); // Her aramada input temizle
    apiClient
      .get(`/api/locations/search?q=${encodeURIComponent(q)}&limit=1`)
      .then((res) => {
        const loc = res.data?.data?.items?.[0];
        if (loc && leafletRef.current) {
          leafletRef.current.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
          setTimeout(() => refetch(), 1800); // Uçuş bittikten sonra katmanları yenile
        } else {
          alert(`"${q}" bulunamadı.`);
        }
      });
  };

  // AR Kamera
  const openAR = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      arStreamRef.current = stream;
      setArOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 150);

      // GPS al — mobilde hassas, masaüstünde WiFi-based (~100m)
      // Fallback: harita merkezi
      const getPos = (): Promise<{ lat: number; lng: number }> =>
        new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve(center);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(center), // izin yoksa harita merkezi
            { enableHighAccuracy: true, timeout: 6000 },
          );
        });

      const { lat, lng } = await getPos();

      // 1) Katmanları çek (layer marker'lar için)
      apiClient
        .get(`/api/layers/nearby?lat=${lat}&lng=${lng}&radius=5000&limit=30`)
        .then((res) => {
          const items: NearbyLayer[] = res.data?.data?.items ?? [];
          setArLayers(
            items.map((l) => ({
              ...l,
              bearing: getBearing(lat, lng, l.location.lat, l.location.lng),
              dist: Math.round(
                getDistance(lat, lng, l.location.lat, l.location.lng),
              ),
            })),
          );
        });

      // 2) Lokasyonları çek (bina tespiti için)
      apiClient
        .get(`/api/locations/nearby?lat=${lat}&lng=${lng}&radius=3000&limit=30`)
        .then((res) => {
          const locs = res.data?.data ?? [];
          setArLocations(
            locs.map(
              (l: {
                id: string;
                name: string;
                lat: number;
                lng: number;
                category: string;
                layerCount?: number;
                aiSummary?: { summary: string } | null;
              }) => ({
                ...l,
                bearing: getBearing(lat, lng, l.lat, l.lng),
                dist: Math.round(getDistance(lat, lng, l.lat, l.lng)),
              }),
            ),
          );
        });

      // 3) Pusula izle
      orientationRef.current = (e: DeviceOrientationEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const h =
          (e as any).webkitCompassHeading ?? (e.alpha ? 360 - e.alpha : 0);
        setCompass(h);
      };
      window.addEventListener("deviceorientation", orientationRef.current);
    } catch {
      alert("Kamera izni gerekli. Tarayıcı ayarlarından izin ver.");
    }
  };

  const closeAR = () => {
    arStreamRef.current?.getTracks().forEach((t) => t.stop());
    arStreamRef.current = null;
    if (orientationRef.current) {
      window.removeEventListener("deviceorientation", orientationRef.current);
      orientationRef.current = null;
    }
    setArOpen(false);
    setArLayers([]);
    setArLocations([]);
    setTargetedLocation(null);
  };

  // Pusula değişince kameranın baktığı binayı tespit et
  useEffect(() => {
    if (!arOpen || arLocations.length === 0) {
      setTargetedLocation(null);
      return;
    }
    const FOV = 30; // ±30° tolerans
    let best: typeof targetedLocation = null;
    let bestDiff = Infinity;
    for (const loc of arLocations) {
      let diff = Math.abs(loc.bearing - compass);
      if (diff > 180) diff = 360 - diff;
      if (diff < FOV && diff < bestDiff) {
        bestDiff = diff;
        best = loc;
      }
    }
    setTargetedLocation(best);
  }, [compass, arLocations, arOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const bearingToX = (bearing: number) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 390;
    let diff = bearing - compass;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return w / 2 + (diff / 60) * w;
  };

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      {/* ── AR Kamera Overlay ── */}
      {arOpen && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          <div className="absolute inset-0 pointer-events-none">
            {/* Lokasyon (bina) marker'ları — mor, daha büyük */}
            {arLocations.map((loc) => {
              const x = bearingToX(loc.bearing);
              const w = typeof window !== "undefined" ? window.innerWidth : 390;
              if (x < -80 || x > w + 80) return null;
              const isTargeted = targetedLocation?.id === loc.id;
              return (
                <div
                  key={loc.id}
                  className="absolute flex flex-col items-center pointer-events-auto cursor-pointer"
                  style={{ left: x - 28, top: "20%" }}
                  onClick={() => {
                    closeAR();
                    router.push(`/location/${loc.id}`);
                  }}
                >
                  <div
                    className="rounded-xl flex flex-col items-center justify-center shadow-xl border-2 transition-all"
                    style={{
                      width: isTargeted ? 64 : 52,
                      height: isTargeted ? 64 : 52,
                      backgroundColor: isTargeted
                        ? "rgba(139,92,246,0.6)"
                        : "rgba(139,92,246,0.3)",
                      borderColor: isTargeted
                        ? "#a78bfa"
                        : "rgba(139,92,246,0.5)",
                    }}
                  >
                    <MapPin
                      size={isTargeted ? 22 : 18}
                      color={isTargeted ? "#e9d5ff" : "#a78bfa"}
                    />
                  </div>
                  <div
                    className="mt-1 px-2 py-0.5 rounded-lg text-xs font-bold max-w-28 text-center truncate"
                    style={{
                      background: "rgba(0,0,0,0.85)",
                      color: isTargeted ? "#c4b5fd" : "#a78bfa",
                    }}
                  >
                    {loc.name}
                  </div>
                  <div className="text-white/50 text-xs">{loc.dist}m</div>
                  {isTargeted && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping mt-0.5" />
                  )}
                </div>
              );
            })}

            {/* Katman marker'ları */}
            {arLayers.map((layer) => {
              const color = COLORS[layer.type] ?? "#6b7280";
              const x = bearingToX(layer.bearing);
              const w = typeof window !== "undefined" ? window.innerWidth : 390;
              if (x < -80 || x > w + 80) return null;
              return (
                <div
                  key={layer.id}
                  className="absolute flex flex-col items-center pointer-events-auto cursor-pointer"
                  style={{ left: x - 24, top: "38%" }}
                  onClick={() => {
                    setSelected(layer);
                    closeAR();
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-lg border-2"
                    style={{
                      backgroundColor: color + "44",
                      borderColor: color,
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {layer.type.charAt(0)}
                  </div>
                  <div
                    className="mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ background: "rgba(0,0,0,0.75)", color }}
                  >
                    {(layer.title ?? layer.type).slice(0, 12)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 border border-white/20 rounded-full px-4 py-1.5 flex items-center gap-2">
            <Layers size={12} className="text-indigo-400" />
            <span className="text-white/80 text-xs">
              {arLayers.length} katman • {arLocations.length} lokasyon •{" "}
              {Math.round(compass)}°
            </span>
          </div>

          <button
            onClick={closeAR}
            className="absolute top-8 right-5 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>

          {/* Hedeflenen bina paneli — kamera o binaya bakıyor */}
          {targetedLocation && (
            <div className="absolute bottom-8 left-4 right-4">
              <button
                onClick={() => {
                  closeAR();
                  router.push(`/location/${targetedLocation.id}`);
                }}
                className="w-full text-left bg-black/85 border-2 border-violet-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md"
              >
                {/* Hedef nişanı */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600/40 border-2 border-violet-400 flex items-center justify-center animate-pulse">
                    <MapPin size={14} className="text-violet-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-base">
                        {targetedLocation.name}
                      </span>
                      <span className="text-xs bg-violet-600/30 text-violet-300 px-2 py-0.5 rounded-full">
                        Tespit Edildi
                      </span>
                    </div>
                    <div className="text-white/50 text-xs">
                      {targetedLocation.dist}m uzakta •{" "}
                      {targetedLocation.layerCount ?? 0} hikaye
                    </div>
                  </div>
                </div>

                {/* AI özet */}
                {targetedLocation.aiSummary?.summary && (
                  <p className="text-white/70 text-xs leading-relaxed line-clamp-2 mb-2 pl-11">
                    {targetedLocation.aiSummary.summary}
                  </p>
                )}

                <div className="flex items-center gap-2 pl-11">
                  <span className="text-violet-400 text-xs font-semibold">
                    Tüm hikayeleri gör →
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Hiçbir bina ve katman yoksa */}
          {arLayers.length === 0 && arLocations.length === 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/80 rounded-2xl px-6 py-4 text-center">
              <AlertCircle size={22} className="text-white/40 mx-auto mb-2" />
              <p className="text-white/60 text-sm">
                Yakında kayıtlı yer bulunamadı.
              </p>
              <p className="text-white/30 text-xs mt-1">
                Haritada İstanbul bölgesine git ve tekrar dene.
              </p>
            </div>
          )}

          {/* Bina var ama henüz hedef yok */}
          {!targetedLocation && arLocations.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-5 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-white/60 text-xs">
                {arLocations.length} yer yakında — kamerayı binaya doğrult
              </span>
            </div>
          )}
        </div>
      )}

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
            <button
              type="submit"
              className="px-4 text-white/70 hover:text-white"
            >
              <Search size={18} />
            </button>
          </form>
        </div>

        {/* Badge */}
        {layers.length > 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-4 py-1.5 text-sm">
            <Layers size={14} className="text-indigo-400" />
            <span className="text-white/80">
              {layers.length} katman yakında
            </span>
          </div>
        )}

        {/* Map — alt toolbar için boşluk bırak */}
        <div
          ref={mapRef}
          className="w-full"
          style={{ height: "calc(100vh - 72px)" }}
        />

        {/* Selected layer card — toolbar üstünde */}
        {selected && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
            <div className="bg-[rgba(20,20,35,0.97)] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span
                    className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1"
                    style={{
                      backgroundColor: `${COLORS[selected.type] ?? "#6b7280"}22`,
                      color: COLORS[selected.type] ?? "#6b7280",
                    }}
                  >
                    {selected.type}
                  </span>
                  {selected.title && (
                    <h3 className="font-bold text-white text-sm">
                      {selected.title}
                    </h3>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-white/70 text-xs leading-relaxed line-clamp-3">
                {selected.content}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-white/40" />
                  <button
                    onClick={() => {
                      setSelected(null);
                      router.push(`/location/${selected.location.id}`);
                    }}
                    className="text-white/50 text-xs hover:text-indigo-400 transition-colors"
                  >
                    {selected.location.name} →
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    router.push(`/layer/${selected.id}`);
                  }}
                  className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 px-3 py-1 rounded-full transition-colors"
                >
                  Detayı gör →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Back */}
        <a
          href="/"
          className="absolute top-4 left-4 z-[1000] bg-[rgba(15,15,26,0.9)] border border-white/10 rounded-full px-3 py-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          ← LAYR
        </a>

        {/* Alt Toolbar — Her zaman görünür */}
        <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-[rgba(13,13,23,0.97)] border-t border-white/10 px-4 py-3 flex items-center gap-3">
          {/* Hikaye Bırak */}
          <button
            onClick={() => {
              setAddLayerPos(center);
              setAddLayerOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/30"
          >
            <PenLine size={18} />
            Hikaye Bırak
          </button>

          {/* AR */}
          <button
            onClick={openAR}
            className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 hover:bg-indigo-600/20 flex items-center justify-center transition-colors"
            title="AR Kamera"
          >
            <Camera size={20} className="text-white/70" />
          </button>

          {/* Konum */}
          <button
            onClick={goToMyLocation}
            disabled={locating}
            className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 hover:bg-blue-600/20 flex items-center justify-center transition-colors disabled:opacity-40"
            title="Konumuma git"
          >
            <Navigation
              size={18}
              className={
                locating ? "text-blue-400 animate-pulse" : "text-white/70"
              }
            />
          </button>
        </div>
      </div>

      {/* Katman ekleme modalı */}
      {addLayerOpen && (
        <AddLayerModal
          lat={addLayerPos.lat}
          lng={addLayerPos.lng}
          onClose={() => setAddLayerOpen(false)}
          onSuccess={() => {
            setAddLayerOpen(false);
            refetch();
          }}
        />
      )}
    </>
  );
}
