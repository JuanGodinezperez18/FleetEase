import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/resend";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(120).optional().default(""),
  fleetSize: z.enum(["1", "2-5", "6-15", "16-30", "31-50", "51+"]),
  interest: z.string().trim().min(2).max(100),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(0).optional().default(""),
});

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json({ message: "Solicitud no válida." }, { status: 415 });
    }
    const raw = await request.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ message: "Revisa los campos e inténtalo de nuevo." }, { status: 400 });

    // Honeypot: silently accept automated submissions without sending email.
    if (parsed.data.website) return NextResponse.json({ success: true });

    const { name, email, company, fleetSize, interest, message } = parsed.data;
    const recipient = process.env.SALES_CONTACT_EMAIL || process.env.SUPPORT_EMAIL || "soporte@fleetease.com.mx";
    const safe = { name: escapeHtml(name), email: escapeHtml(email), company: escapeHtml(company || "No especificada"), fleetSize: escapeHtml(fleetSize), interest: escapeHtml(interest), message: escapeHtml(message).replace(/\n/g, "<br />") };
    const result = await sendEmail({
      to: recipient,
      subject: `Nuevo prospecto de ventas FleetEase — ${fleetSize} vehículo(s)`,
      text: `Nueva solicitud comercial FleetEase\nNombre: ${name}\nCorreo: ${email}\nEmpresa: ${company || "No especificada"}\nVehículos: ${fleetSize}\nInterés: ${interest}\n\nNecesidades / dudas:\n${message}`,
      html: `<h2>Nueva solicitud comercial FleetEase</h2><p><b>Nombre:</b> ${safe.name}</p><p><b>Correo:</b> ${safe.email}</p><p><b>Empresa:</b> ${safe.company}</p><p><b>Vehículos:</b> ${safe.fleetSize}</p><p><b>Interés:</b> ${safe.interest}</p><hr /><p><b>Necesidades / dudas:</b></p><p>${safe.message}</p>`,
    });
    if (!result?.id) return NextResponse.json({ message: "No se pudo confirmar el envío. Inténtalo más tarde." }, { status: 502 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Sales contact] Email delivery failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ message: "No pudimos enviar tu solicitud. Inténtalo más tarde." }, { status: 500 });
  }
}
