"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase-browser";
import { Loader2, ShieldCheck } from "lucide-react";

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

const easeOut = [0.22, 1, 0.36, 1] as const;

/** Shell oscuro aislado: no depende de la clase .light/.dark del documento. */
function ConsentShell({ children }: { children: React.ReactNode }) {
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
        <motion.div
          className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full blur-[100px]"
          style={{ backgroundColor: "rgba(215, 255, 63, 0.05)" }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: easeOut }}
        />
        <motion.div
          className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full blur-[80px]"
          style={{ backgroundColor: "rgba(215, 255, 63, 0.035)" }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.1, ease: easeOut }}
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
  const reduceMotion = useReducedMotion();
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

  const enter = reduceMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
      };

  if (loading) {
    return (
      <ConsentShell>
        <motion.div
          className="flex flex-col items-center justify-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={reduceMotion ? undefined : { duration: 0.9, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8" style={{ color: "#d7ff3f" }} />
          </motion.div>
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            Validando solicitud segura…
          </p>
        </motion.div>
      </ConsentShell>
    );
  }

  if (error && !details) {
    return (
      <ConsentShell>
        <motion.section
          className="rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
          {...enter}
          transition={{ duration: 0.45, ease: easeOut }}
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
        </motion.section>
      </ConsentShell>
    );
  }

  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <ConsentShell>
      <motion.div
        className="mb-6 text-center"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <div
          className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: "#d7ff3f", boxShadow: "0 0 12px #d7ff3f" }}
            animate={reduceMotion ? undefined : { scale: [1, 1.35, 1], opacity: [1, 0.7, 1] }}
            transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          Fleet OS
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl" style={{ color: "#ffffff" }}>
          FleetEase <span style={{ color: "#d7ff3f" }}>Manager</span>
        </h1>
      </motion.div>

      <motion.section
        className="rounded-3xl border p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.03)",
        }}
        initial={reduceMotion ? false : { opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08, ease: easeOut }}
      >
        <motion.div
          className="mb-6 flex items-center gap-3"
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.16, ease: easeOut }}
        >
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
        </motion.div>

        <motion.p
          className="text-sm leading-6"
          style={{ color: "rgba(255,255,255,0.65)" }}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.22 }}
        >
          <strong className="font-medium" style={{ color: "#ffffff" }}>
            {details?.client_name || "Una aplicación externa"}
          </strong>{" "}
          solicita conectar con tu cuenta de FleetEase. Solo podrá consultar las herramientas de
          lectura habilitadas según tu rol; no podrá crear, modificar ni eliminar registros a través
          de MCP.
        </motion.p>

        <motion.div
          className="mt-6 rounded-[14px] border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            backgroundColor: "rgba(255,255,255,0.03)",
          }}
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.28, ease: easeOut }}
        >
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#d7ff3f" }} />
            <h3 className="text-sm font-semibold" style={{ color: "#ffffff" }}>
              Datos que podrá consultar
            </h3>
          </div>
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
        </motion.div>

        <motion.p
          className="mt-4 text-xs leading-5"
          style={{ color: "rgba(255,255,255,0.5)" }}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.34 }}
        >
          El acceso queda ligado a tu usuario y empresa. FleetEase aplica permisos de base de datos de
          solo lectura y filtra por tu alcance. Puedes rechazar la solicitud si no reconoces la
          aplicación.
        </motion.p>

        {error && (
          <motion.p
            role="alert"
            className="mt-4 rounded-[10px] border px-3 py-2.5 text-sm"
            style={{
              borderColor: "rgba(248, 113, 113, 0.3)",
              backgroundColor: "rgba(248, 113, 113, 0.1)",
              color: "#fda4af",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {error}
          </motion.p>
        )}

        <motion.div
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.38, ease: easeOut }}
        >
          <motion.button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("deny")}
            whileHover={reduceMotion || submitting ? undefined : { scale: 1.015 }}
            whileTap={reduceMotion || submitting ? undefined : { scale: 0.98 }}
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
          </motion.button>
          <motion.button
            type="button"
            disabled={submitting !== null}
            onClick={() => void decide("approve")}
            whileHover={reduceMotion || submitting ? undefined : { scale: 1.02, brightness: 1.05 }}
            whileTap={reduceMotion || submitting ? undefined : { scale: 0.98 }}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition disabled:opacity-50 sm:w-auto sm:px-5"
            style={{
              backgroundColor: "#d7ff3f",
              color: "#080a0f",
              boxShadow: submitting === "approve" ? undefined : "0 0 24px rgba(215, 255, 63, 0.18)",
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
          </motion.button>
        </motion.div>
      </motion.section>

      <motion.p
        className="mt-6 text-center text-[11px]"
        style={{ color: "rgba(255,255,255,0.45)" }}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.48 }}
      >
        © {new Date().getFullYear()} FleetEase Manager
      </motion.p>
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
