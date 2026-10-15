"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

type AuthorizationDetails = {
  authorization_id?: string;
  client_name?: string;
  client_uri?: string;
  logo_uri?: string;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
};

// Solo lectura: staff de la empresa puede autorizar. Partner/client quedan fuera.
const ALLOWED_APP_ROLES = new Set([
  "admin",
  "editor",
  "viewer",
  "super_admin",
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

        if (profileError || !profile || profile.is_deleted || !profile.company_id ||
            !ALLOWED_APP_ROLES.has(String(profile.role))) {
          throw new Error("Tu usuario no tiene permisos para autorizar una conexión MCP de solo lectura.");
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
    return () => { active = false; };
  }, [authorizationId, router]);

  const decide = useCallback(async (decision: "approve" | "deny") => {
    if (!authorizationId || submitting) return;
    setSubmitting(decision);
    setError(null);

    try {
      const oauth = (supabase.auth as any).oauth;
      const result = decision === "approve"
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
  }, [authorizationId, submitting]);

  if (loading) {
    return <div className="mx-auto max-w-xl p-8 text-center text-sm text-muted-foreground">Validando solicitud segura…</div>;
  }

  if (error && !details) {
    return (
      <main className="mx-auto max-w-xl p-6 sm:p-10">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">No se puede autorizar la conexión</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <a className="mt-6 inline-flex text-sm font-medium underline" href="/dashboard">Volver a FleetEase</a>
        </section>
      </main>
    );
  }

  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <main className="mx-auto max-w-xl p-6 sm:p-10">
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          {details?.logo_uri ? (
            // The logo is supplied by the registered OAuth client; it is optional and never trusted for authorization.
            <img src={details.logo_uri} alt="" className="h-12 w-12 rounded-xl border object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border font-semibold">FE</div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Conexión MCP</p>
            <h1 className="text-xl font-semibold">Autorizar acceso de solo lectura</h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          <strong className="text-foreground">{details?.client_name || "Una aplicación externa"}</strong> solicita conectar con tu cuenta de FleetEase.
          Solo podrá consultar las herramientas de lectura habilitadas; no podrá crear, modificar ni eliminar registros a través de MCP.
        </p>

        <div className="mt-6 rounded-xl bg-muted/50 p-4">
          <h2 className="text-sm font-semibold">Datos que podrá consultar</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Vehículos y clientes de tu empresa.</li>
            <li>Gastos, ingresos y saldos de créditos.</li>
            <li>Socios y multas.</li>
          </ul>
          {scopes.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Permisos de identidad solicitados: {scopes.join(", ")}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          El acceso queda ligado a tu usuario y empresa. FleetEase aplica permisos de base de datos de solo lectura. Puedes rechazar la solicitud si no reconoces la aplicación.
        </p>

        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("deny")}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {submitting === "deny" ? "Rechazando…" : "Rechazar"}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("approve")}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {submitting === "approve" ? "Autorizando…" : "Autorizar solo lectura"}
          </button>
        </div>
      </section>
    </main>
  );
}

export default function McpOAuthConsentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl p-8 text-center text-sm text-muted-foreground">Cargando…</div>}>
      <ConsentContent />
    </Suspense>
  );
}
