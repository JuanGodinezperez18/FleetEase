"use client";

import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    const update = () => {
      const next = navigator.onLine;
      setOnline(next);
      if (next) {
        setShowBackOnline(true);
        const timer = window.setTimeout(() => setShowBackOnline(false), 2200);
        return () => window.clearTimeout(timer);
      }
      return undefined;
    };

    setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online && !showBackOnline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center px-4 pt-3 pointer-events-none">
      <div className={online ? "fe-online-banner" : "fe-offline-banner"} role="status" aria-live="polite">
        {online ? <Wifi className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        <span>{online ? "Conexión restaurada" : "Sin conexión · mostrando datos disponibles"}</span>
      </div>
    </div>
  );
}
