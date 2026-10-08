import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { ImageInput } from "./extract";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel limita el body de funciones a ~4.5 MB
const ALLOWED: ImageInput["mediaType"][] = ["image/jpeg", "image/png", "image/webp"];

/**
 * Valida sesión de Supabase (Bearer token) y el archivo recibido por FormData,
 * y delega el escaneo en `run`.
 */
export async function handleOcrRequest(
  req: Request,
  run: (image: ImageInput) => Promise<unknown>
) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  const mediaType = file.type as ImageInput["mediaType"];
  if (!ALLOWED.includes(mediaType)) {
    return NextResponse.json({ error: "Formato no soportado (usa JPG, PNG o WebP)" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 413 });
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return NextResponse.json(await run({ mediaType, base64 }));
  } catch (e) {
    // No registrar imagen ni datos extraídos (son datos personales)
    console.error("[ocr] error:", e instanceof Error ? e.message : "desconocido");
    return NextResponse.json({ error: "No se pudo procesar el documento" }, { status: 502 });
  }
}
