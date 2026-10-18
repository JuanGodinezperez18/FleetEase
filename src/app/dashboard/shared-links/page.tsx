"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2Off, RefreshCw, ShieldCheck, Clock3, Loader2, FileText } from "lucide-react";
import { getSessionToken } from "@/lib/auth";
import { toast } from "sonner";

type SharedLink = {
  id: string;
  document_label: string;
  vehicle_label: string;
  created_at: string;
  expires_at: string;
  single_use: boolean;
  use_count: number;
  used_at: string | null;
  revoked_at: string | null;
  state: "active" | "expired" | "revoked" | "used";
};

const stateLabel: Record<SharedLink["state"], string> = {
  active: "Activo", expired: "Vencido", revoked: "Revocado", used: "Utilizado",
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function SharedLinksAdminPage() {
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("Inicia sesión para administrar enlaces.");
      const response = await fetch("/api/shared-links", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "No se pudieron cargar los enlaces.");
      setLinks(data.links || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los enlaces.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadLinks(); }, [loadLinks]);

  const revoke = async (link: SharedLink) => {
    if (!window.confirm(`¿Revocar el enlace de “${link.document_label}”? El acceso quedará bloqueado inmediatamente.`)) return;
    setBusyId(link.id);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("Inicia sesión para continuar.");
      const response = await fetch(`/api/shared-links/manage/${link.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "No se pudo revocar el enlace.");
      toast.success("Enlace revocado");
      await loadLinks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revocar el enlace.");
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = links.filter((link) => link.state === "active").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-muted)]"><ShieldCheck className="h-4 w-4" /> Seguridad de documentos</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--fe-text)] sm:text-3xl">Enlaces compartidos</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--fe-text-muted)]">Controla el acceso a documentos compartidos. Los enlaces vencen automáticamente y puedes revocarlos en cualquier momento.</p>
        </div>
        <button onClick={() => void loadLinks()} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--fe-border)] px-3 text-sm text-[var(--fe-text)] hover:bg-[var(--fe-hover)] disabled:opacity-60">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)] p-4"><p className="text-xs text-[var(--fe-text-muted)]">Enlaces registrados</p><p className="mt-2 text-2xl font-semibold text-[var(--fe-text)]">{links.length}</p></div>
        <div className="rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)] p-4"><p className="text-xs text-[var(--fe-text-muted)]">Activos</p><p className="mt-2 text-2xl font-semibold text-[var(--fe-text)]">{activeCount}</p></div>
        <div className="rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)] p-4"><p className="text-xs text-[var(--fe-text-muted)]">Acceso público</p><p className="mt-2 text-sm font-medium text-[var(--fe-text)]">Solo lectura · Un documento</p></div>
      </div>

      <div className="rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-surface)]">
        <div className="border-b border-[var(--fe-border)] px-4 py-3 sm:px-5"><h2 className="text-sm font-semibold text-[var(--fe-text)]">Historial de enlaces</h2><p className="mt-1 text-xs text-[var(--fe-text-muted)]">Por seguridad, el enlace completo solo se muestra al crearlo. Para volver a compartir, crea uno nuevo.</p></div>
        {loading ? <div className="flex items-center justify-center gap-2 p-10 text-sm text-[var(--fe-text-muted)]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando enlaces…</div> :
          links.length === 0 ? <div className="p-10 text-center"><FileText className="mx-auto h-8 w-8 text-[var(--fe-text-muted)]" /><p className="mt-3 text-sm text-[var(--fe-text-muted)]">Todavía no hay enlaces compartidos.</p></div> :
          <div className="divide-y divide-[var(--fe-border)]">
            {links.map((link) => (
              <article key={link.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="break-words text-sm font-semibold text-[var(--fe-text)]">{link.document_label}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${link.state === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--fe-hover)] text-[var(--fe-text-muted)]"}`}>{stateLabel[link.state]}</span></div>
                  <p className="mt-1 break-words text-xs text-[var(--fe-text-muted)]">{link.vehicle_label}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--fe-text-muted)]"><span><Clock3 className="mr-1 inline h-3 w-3" />Vence {dateLabel(link.expires_at)}</span><span>{link.single_use ? "Un solo uso" : "Reutilizable"}</span><span>Descargas: {link.use_count}</span><span>Creado: {dateLabel(link.created_at)}</span></div>
                </div>
                {link.state === "active" && <button onClick={() => void revoke(link)} disabled={busyId === link.id} className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 px-3 text-xs font-medium text-rose-500 hover:bg-rose-500/10 disabled:opacity-50">{busyId === link.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Link2Off className="mr-2 h-3.5 w-3.5" />}Revocar enlace</button>}
              </article>
            ))}
          </div>}
      </div>
    </div>
  );
}
