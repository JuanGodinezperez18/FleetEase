import type { IneData, OcrResult, TarjetaData } from "./schemas";

/** Reduce y comprime la foto para no rebasar el límite de body de Vercel (~4.5 MB). */
export async function resizeImage(file: File, maxSide = 1800, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) throw new Error("No se pudo comprimir la imagen");
  return new File([blob], "scan.jpg", { type: "image/jpeg" });
}

type Kind = "ine" | "tarjeta-circulacion";
type ResultFor<K extends Kind> = K extends "ine" ? OcrResult<IneData> : OcrResult<TarjetaData>;

/**
 * Uso:
 *   const { data: { session } } = await supabase.auth.getSession();
 *   const result = await scanDocument("ine", file, session!.access_token);
 */
export async function scanDocument<K extends Kind>(
  kind: K,
  file: File,
  accessToken: string
): Promise<ResultFor<K>> {
  const small = await resizeImage(file);
  const form = new FormData();
  form.append("file", small);

  const res = await fetch(`/api/ocr/${kind}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Error al escanear el documento");
  }
  return res.json();
}
