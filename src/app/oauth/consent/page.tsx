"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type AuthorizationDetails = {
  authorization_id?: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
};

// Cualquier usuario activo de la empresa puede autorizar MCP de solo lectura.
// Staff ve datos de la empresa; partner/client solo su propio alcance (tools).
const ALLOWED_APP_ROLES = new Set([
  "admin",
  "editor",
  "viewer",
  "super_admin",
  "partner",
  "client",
]);

function ConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAuthorization() {
      if (!authorizationId) {
        setError("Falta el identificador de autorización.");
        setLoading(false);
        return;
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!sessionData.session?.user) {
          const callbackUrl = window.location.pathname + window.location.search;
          router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("role,company_id,is_deleted")
          .eq("id", sessionData.session.user.id)
          .maybeSingle();

        if (
          profileError ||
          !profile ||
          profile.is_deleted ||
          !profile.company_id ||
          !ALLOWED_APP_ROLES.has(String(profile.role))
        ) {
          throw new Error(
            "Tu usuario no tiene permisos para autorizar una conexión MCP de solo lectura."
          );
        }

        const { data, error: authorizationError } =
          await (supabase.auth as any).oauth.getAuthorizationDetails(authorizationId);

        if (authorizationError) throw authorizationError;
        const authorization = data as AuthorizationDetails | null;
        if (!authorization) throw new Error("No se pudo cargar la solicitud de autorización.");

        if (authorization.redirect_url) {
          window.location.replace(authorization.redirect_url);
          return;
        }

        if (!authorization.authorization_id) {
          throw new Error("La solicitud de autorización no es válida.");
        }

        if (active) setDetails(authorization);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo validar la solicitud.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAuthorization();
    return () => {
      active = false;
    };
  }, [authorizationId, router]);

  const decide = useCallback(
    async (decision: "approve" | "deny") => {
      if (!authorizationId || submitting) return;
      setSubmitting(decision);
      setError(null);

      try {
        const oauth = (supabase.auth as any).oauth;
        const result =
          decision === "approve"
            ? await oauth.approveAuthorization(authorizationId)
            : await oauth.denyAuthorization(authorizationId);

        if (result.error) throw result.error;
        const redirectUrl = result.data?.redirect_url;
        if (redirectUrl) {
          window.location.assign(redirectUrl);
        } else {
          throw new Error("El proveedor de identidad no devolvió la URL de retorno.");
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo procesar la autorización.");
        setSubmitting(null);
      }
    },
    [authorizationId, submitting]
  );

  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-6 text-[var(--fe-text)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[var(--fe-lime)]/[0.04] blur-[100px]" />
          <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-[var(--fe-lime)]/[0.03] blur-[80px]" />
        </div>
        <Loader2 className="relative z-10 h-8 w-8 animate-spin text-[var(--fe-lime)]" />
        <p className="relative z-10 mt-4 text-sm text-[var(--fe-text-muted)]">
          Validando solicitud segura…
        </p>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-4 text-[var(--fe-text)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[var(--fe-lime)]/[0.04] blur-[100px]" />
          <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-[var(--fe-lime)]/[0.03] blur-[80px]" />
        </div>
        <main className="relative z-10 w-full max-w-md">
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-[var(--fe-radius-sm)] border border-white/[0.08] bg-white/[0.04]">
                <Image
                  src="/logo.png"
                  alt="FleetEase"
                  fill
                  className="object-contain p-1.5"
                  sizes="44px"
                  priority
                />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
                  Conexión MCP
                </p>
                <h1 className="text-lg font-semibold tracking-[-0.03em] text-[var(--fe-text)]">
                  No se puede autorizar
                </h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--fe-text-muted)]">{error}</p>
            <a
              href="/dashboard"
              className="mt-6 inline-flex text-sm font-medium text-[var(--fe-lime)] hover:underline"
            >
              Volver a FleetEase
            </a>
          </section>
        </main>
      </div>
    );
  }

  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-4 text-[var(--fe-text)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[var(--fe-lime)]/[0.04] blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-[var(--fe-lime)]/[0.03] blur-[80px]" />
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fe-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
            Fleet OS
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--fe-text)] sm:text-3xl">
            FleetEase <span className="text-[var(--fe-lime)]">Manager</span>
          </h1>
        </div>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--fe-radius-sm)] border border-white/[0.08] bg-white/[0.04]">
              {/* Prefer app brand mark; client logo_uri is optional and not trusted for auth decisions. */}
              <Image
                src="/logo.png"
                alt="FleetEase"
                fill
                className="object-contain p-1.5"
                sizes="48px"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
                Conexión MCP
              </p>
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-[var(--fe-text)] sm:text-xl">
                Autorizar acceso de solo lectura
              </h2>
            </div>
          </div>

          <p className="text-sm leading-6 text-[var(--fe-text-muted)]">
            <strong className="font-medium text-[var(--fe-text)]">
              {details?.client_name || "Una aplicación externa"}
            </strong>{" "}
            solicita conectar con tu cuenta de FleetEase. Solo podrá consultar las herramientas de
            lectura habilitadas según tu rol; no podrá crear, modificar ni eliminar registros a
            través de MCP.
          </p>

          <div className="mt-6 rounded-[var(--fe-radius-md)] border border-white/[0.06] bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-[var(--fe-text)]">Datos que podrá consultar</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--fe-text-muted)]">
              <li>
                Staff (admin/editor/viewer): vehículos, clientes, finanzas y multas de tu empresa.
              </li>
              <li>Cliente: solo tu perfil, vehículo asignado, créditos y multas propias.</li>
              <li>Socio: solo tu perfil de socio, vehículos vinculados y movimientos asociados.</li>
            </ul>
            {scopes.length > 0 && (
              <p className="mt-3 text-xs leading-5 text-[var(--fe-text-faint)]">
                Permisos de identidad solicitados: {scopes.join(", ")}
              </p>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-[var(--fe-text-faint)]">
            El acceso queda ligado a tu usuario y empresa. FleetEase aplica permisos de base de datos
            de solo lectura y filtra por tu alcance. Puedes rechazar la solicitud si no reconoces la
            aplicación.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[var(--fe-radius-sm)] border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300"
            >
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={submitting !== null}
              loading={submitting === "deny"}
              onClick={() => void decide("deny")}
              className="h-11 w-full rounded-xl sm:w-auto"
            >
              {submitting === "deny" ? "Rechazando…" : "Rechazar"}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={submitting !== null}
              loading={submitting === "approve"}
              onClick={() => void decide("approve")}
              className="h-11 w-full rounded-xl sm:w-auto"
            >
              {submitting === "approve" ? "Autorizando…" : "Autorizar solo lectura"}
            </Button>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] text-[var(--fe-text-faint)]">
          © {new Date().getFullYear()} FleetEase Manager
        </p>
      </main>
    </div>
  );
}

export default function McpOAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--fe-ink)] text-[var(--fe-text)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--fe-lime)]" />
          <p className="mt-4 text-sm text-[var(--fe-text-muted)]">Cargando…</p>
        </div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
