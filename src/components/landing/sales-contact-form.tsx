"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[var(--fe-lime)] focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)]/30";

type SalesRequestType = "sales" | "vehicle_management";

export function SalesContactForm({ requestType = "sales" }: { requestType?: SalesRequestType }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    requestType,
    name: "",
    email: "",
    company: "",
    fleetSize: "",
    interest: requestType === "vehicle_management" ? "Administración de vehículos de renta" : "Asesoría para empresa",
    message: "",
    website: "",
  });
  const isIndependentDriver = form.interest === "Soy conductor independiente";
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function updateInterest(value: string) {
    setForm((current) => ({
      ...current,
      interest: value,
      fleetSize: value === "Soy conductor independiente" ? "" : current.fleetSize,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setErrorMessage("");
    try {
      const response = await fetch("/api/contact/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "No pudimos enviar tu solicitud. Inténtalo de nuevo.");
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "No pudimos enviar tu solicitud. Inténtalo de nuevo.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-[var(--fe-lime)]/30 bg-[var(--fe-lime)]/[0.06] p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--fe-lime)]" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-semibold">Solicitud enviada</h2>
        <p className="mt-3 text-sm leading-6 text-white/60">
          Gracias por tu interés en FleetEase. Nuestro equipo revisará lo que necesitas y se pondrá en contacto contigo.
        </p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-[var(--fe-lime)] px-5 py-3 text-sm font-bold text-[var(--fe-ink)]">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-white/80">
          Nombre completo <span className="text-red-400">*</span>
          <input required minLength={2} maxLength={100} autoComplete="name" className={inputClass} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Tu nombre" />
        </label>
        <label className="block text-sm font-medium text-white/80">
          Correo de contacto <span className="text-red-400">*</span>
          <input required type="email" maxLength={254} autoComplete="email" className={inputClass} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="tu@empresa.com" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-white/80">
          Empresa (opcional)
          <input maxLength={120} autoComplete="organization" className={inputClass} value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Nombre de la empresa" />
        </label>
        <label className="block text-sm font-medium text-white/80">
          ¿Qué te interesa? <span className="text-red-400">*</span>
          <select required className={inputClass} value={form.interest} onChange={(e) => updateInterest(e.target.value)}>
            <option className="bg-[#111]">Asesoría para empresa</option>
            <option className="bg-[#111]">Administración de vehículos de renta</option>
            <option className="bg-[#111]">Control de renta de vehículos</option>
            <option className="bg-[#111]">Control financiero y rentabilidad</option>
            <option className="bg-[#111]">Mantenimiento y gastos</option>
            <option className="bg-[#111]">Solución personalizada / integración</option>
            <option className="bg-[#111]">Soy conductor independiente</option>
            <option className="bg-[#111]">Otro</option>
          </select>
        </label>
      </div>
      {!isIndependentDriver && (
        <label className="block text-sm font-medium text-white/80">
          ¿Cuántos vehículos administras? <span className="text-red-400">*</span>
          <select required className={inputClass} value={form.fleetSize} onChange={(e) => update("fleetSize", e.target.value)}>
            <option value="" className="bg-[#111]">Selecciona una opción</option>
            <option value="1" className="bg-[#111]">1 vehículo</option>
            <option value="2-5" className="bg-[#111]">2 a 5 vehículos</option>
            <option value="6-15" className="bg-[#111]">6 a 15 vehículos</option>
            <option value="16-30" className="bg-[#111]">16 a 30 vehículos</option>
            <option value="31-50" className="bg-[#111]">31 a 50 vehículos</option>
            <option value="51+" className="bg-[#111]">Más de 50 vehículos</option>
          </select>
        </label>
      )}
      <label className="block text-sm font-medium text-white/80">
        Cuéntanos qué necesitas <span className="text-red-400">*</span>
        <textarea required minLength={10} maxLength={3000} rows={5} className={inputClass} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="¿Qué quieres controlar o mejorar? ¿Qué funciones necesitas? ¿Qué dudas tienes?" />
      </label>
      <div className="hidden" aria-hidden="true">
        <label>Deja este campo vacío<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} /></label>
      </div>
      {status === "error" && <p role="alert" className="text-sm text-red-300">{errorMessage}</p>}
      <button type="submit" disabled={status === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--fe-lime)] px-6 py-4 text-sm font-bold text-[var(--fe-ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        {status === "sending" ? "Enviando..." : "Enviar solicitud"}
        <Send className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-xs leading-5 text-white/40">
        Usaremos tus datos únicamente para responder esta solicitud comercial. Consulta nuestro{" "}
        <Link href="/privacidad" className="text-[var(--fe-lime)] underline underline-offset-2 hover:text-white">
          Aviso de privacidad
        </Link>.
      </p>
    </form>
  );
}
