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

/** Shell oscuro aislado: no depende de la clase .light/.dark del documento. */
function ConsentShell({ children }: { children: React.ReactNode }) {
  // Forzar tokens dark mientras esta pantalla está montada (misma idea que (auth)/layout).
  useEffect(() => {
    const root = document.documentElement;
    const hadLight = root.classList.contains("light");
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    root.classList.remove("light");
    root.style.colorScheme = "dark";

    return () => {
      if (hadLight && !hadDark) {
        root.classList.add("light");
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    };
  }, []);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{
        backgroundColor: "#080a0f",
        color: "#ffffff",
        colorScheme: "dark",
      }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full blur-[100px]"
          style={{ backgroundColor: "rgba(215, 255, 63, 0.04)" }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full blur-[80px]"
          style={{ backgroundColor: "rgba(215, 255, 63, 0.03)" }}
        />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

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
      <ConsentShell>
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#d7ff3f" }} />
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Validando solicitud segura…
          </p>
        </div>
      </ConsentShell>
    );
  }

  if (error && !details) {
    return (
      <ConsentShell>
        <section
          className="rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className="relative h-11 w-11 overflow-hidden rounded-[10px] border"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
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
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Conexión MCP
              </p>
              <h1 className="text-lg font-semibold tracking-[-0.03em]" style={{ color: "#ffffff" }}>
                No se puede autorizar
              </h1>
            </div>
          </div>
          <p className="text-sm leading-6" style={{ color: "rgba(255,255,255,0.6)" }}>
            {error}
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex text-sm font-medium hover:underline"
            style={{ color: "#d7ff3f" }}
          >
            Volver a FleetEase
          </a>
        </section>
      </ConsentShell>
    );
  }

  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <ConsentShell>
      <div className="mb-6 text-center">
        <div
          className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#d7ff3f", boxShadow: "0 0 12px #d7ff3f" }}
          />
          Fleet OS
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl" style={{ color: "#ffffff" }}>
          FleetEase <span style={{ color: "#d7ff3f" }}>Manager</span>
        </h1>
      </div>

      <section
        className="rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[10px] border"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
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
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Conexión MCP
            </p>
            <h2
              className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
              style={{ color: "#ffffff" }}
            >
              Autorizar acceso de solo lectura
            </h2>
          </div>
        </div>

        <p className="text-sm leading-6" style={{ color: "rgba(255,255,255,0.65)" }}>
          <strong className="font-medium" style={{ color: "#ffffff" }}>
            {details?.client_name || "Una aplicación externa"}
          </strong>{" "}
          solicita conectar con tu cuenta de FleetEase. Solo podrá consultar las herramientas de
          lectura habilitadas según tu rol; no podrá crear, modificar ni eliminar registros a través
          de MCP.
        </p>

        <div
          className="mt-6 rounded-[14px] border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "#ffffff" }}>
            Datos que podrá consultar
          </h3>
          <ul
            className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            <li>
              Staff (admin/editor/viewer): vehículos, clientes, finanzas y multas de tu empresa.
            </li>
            <li>Cliente: solo tu perfil, vehículo asignado, créditos y multas propias.</li>
            <li>Socio: solo tu perfil de socio, vehículos vinculados y movimientos asociados.</li>
          </ul>
          {scopes.length > 0 && (
            <p className="mt-3 text-xs leading-5" style={{ color: "rgba(255,255,255,0.5)" }}>
              Permisos de identidad solicitados: {scopes.join(", ")}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs leading-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          El acceso queda ligado a tu usuario y empresa. FleetEase aplica permisos de base de datos de
          solo lectura y filtra por tu alcance. Puedes rechazar la solicitud si no reconoces la
          aplicación.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-[10px] border px-3 py-2.5 text-sm"
            style={{
              borderColor: "rgba(248, 113, 113, 0.3)",
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              color: "#fda4af",
            }}
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("deny")}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border text-sm font-medium transition disabled:opacity-50 sm:w-auto sm:px-5"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {submitting === "deny" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rechazando…
              </>
            ) : (
              "Rechazar"
            )}
          </button>
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("approve")}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition disabled:opacity-50 sm:w-auto sm:px-5"
            style={{
              backgroundColor: "#d7ff3f",
              color: "#080a0f",
            }}
          >
            {submitting === "approve" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autorizando…
              </>
            ) : (
              "Autorizar solo lectura"
            )}
          </button>
        </div>
      </section>

      <p className="mt-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
        © {new Date().getFullYear()} FleetEase Manager
      </p>
    </ConsentShell>
  );
}

export default function McpOAuthConsentPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen flex-col items-center justify-center"
          style={{ backgroundColor: "#080a0f", color: "#ffffff" }}
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#d7ff3f" }} />
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Cargando…
          </p>
        </div>
      }
    >
      <ConsentContent />
    </Suspense>
  );
}
