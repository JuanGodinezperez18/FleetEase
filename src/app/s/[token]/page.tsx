"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Download, ShieldCheck, Clock3, Loader2, AlertTriangle } from "lucide-react";

type LinkInfo = {
  status: "active" | "expired" | "revoked" | "used" | "unavailable";
  documentLabel?: string;
  vehicleLabel?: string;
  expiresAt?: string;
  singleUse?: boolean;
  message?: string;
};

function formatDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function SharedLinkPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [info, setInfo] = useState<LinkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shared-links/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok && response.status !== 404) throw new Error("No se pudo consultar el enlace.");
        if (!cancelled) setInfo(data || { status: "unavailable" });
      })
      .catch(() => { if (!cancelled) setError("No se pudo consultar el enlace. Intenta más tarde."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(`/api/shared-links/${encodeURIComponent(token)}/download`, {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Este enlace no está disponible.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const fallbackName = disposition.match(/filename="([^"]+)"/i)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : (fallbackName || "documento");
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      if (info?.singleUse) setInfo((current) => current ? { ...current, status: "used" } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el documento.");
      if (info?.singleUse) {
        fetch(`/api/shared-links/${encodeURIComponent(token)}`, { cache: "no-store" })
          .then((response) => response.json())
          .then((data) => setInfo(data))
          .catch(() => undefined);
      }
    } finally {
      setDownloading(false);
    }
  };

  const statusCopy: Record<string, string> = {
    expired: "Este enlace venció.",
    revoked: "Este enlace fue revocado.",
    used: "Este enlace de un solo uso ya fue utilizado.",
    unavailable: "Este enlace no está disponible.",
  };
  const active = info?.status === "active";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0f] px-4 py-10 text-white">
      <section className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0e1117] shadow-2xl">
        <header className="border-b border-white/[0.07] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d7ff3f]/10 text-[#d7ff3f]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">FleetEase</p>
              <h1 className="text-lg font-semibold">Documento compartido</h1>
            </div>
          </div>
        </header>
        <div className="space-y-5 p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-white/50">
              <Loader2 className="h-5 w-5 animate-spin text-[#d7ff3f]" /> Verificando enlace…
            </div>
          ) : error && !info ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-white/70">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /> {error}
            </div>
          ) : active ? (
            <>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#d7ff3f]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="break-words text-base font-semibold">{info?.documentLabel || "Documento"}</h2>
                  <p className="mt-1 break-words text-sm text-white/50">{info?.vehicleLabel || "Vehículo"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-xs text-white/50">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> Vence: {formatDate(info?.expiresAt)}</div>
                <p className="mt-2">{info?.singleUse ? "El enlace permite una sola descarga desde FleetEase." : "El enlace permite descargas hasta su vencimiento o revocación."}</p>
              </div>
              <button onClick={handleDownload} disabled={downloading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#d7ff3f] px-4 text-sm font-semibold text-black transition hover:bg-[#c8f02e] disabled:cursor-not-allowed disabled:opacity-60">
                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {downloading ? "Preparando descarga…" : "Descargar documento"}
              </button>
              <p className="text-center text-xs leading-relaxed text-white/35">Al descargarlo, el destinatario puede guardar o copiar el archivo. FleetEase no puede controlar el archivo una vez descargado.</p>
              {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            </>
          ) : (
            <div className="space-y-2 py-4 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-amber-300" />
              <h2 className="font-semibold">Enlace no disponible</h2>
              <p className="text-sm text-white/50">{statusCopy[info?.status || "unavailable"] || "Este enlace no está disponible."}</p>
            </div>
          )}
        </div>
        <footer className="border-t border-white/[0.07] px-6 py-4 text-center text-[11px] text-white/30">Acceso limitado al documento compartido · FleetEase</footer>
      </section>
    </main>
  );
}
