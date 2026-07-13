"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { apiClient } from "@/lib/api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationButton() {
  const [status, setStatus] = useState<
    "idle" | "subscribed" | "denied" | "unsupported"
  >("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("subscribed");
    else if (Notification.permission === "denied") setStatus("denied");
  }, []);

  const subscribe = async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        ...(VAPID_PUBLIC_KEY && {
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }),
      });

      // Push token'ı backend'e gönder
      const token = localStorage.getItem("layr_access_token");
      if (token) {
        await apiClient.patch("/api/users/me", {
          pushToken: JSON.stringify(sub),
        });
      }

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  };

  const unsubscribe = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
    setStatus("idle");
  };

  if (status === "unsupported") return null;

  return (
    <button
      onClick={status === "subscribed" ? unsubscribe : subscribe}
      title={status === "subscribed" ? "Bildirimleri kapat" : "Bildirimleri aç"}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors"
      style={
        status === "subscribed"
          ? {
              backgroundColor: "#6366f122",
              borderColor: "#6366f1",
              color: "#a5b4fc",
            }
          : {
              backgroundColor: "rgba(255,255,255,0.05)",
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.5)",
            }
      }
    >
      {status === "subscribed" ? <Bell size={12} /> : <BellOff size={12} />}
      {status === "subscribed" ? "Bildirim Açık" : "Bildirim Aç"}
    </button>
  );
}
