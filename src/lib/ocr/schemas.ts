import { z } from "zod";

/** Texto opcional: "" / null / undefined -> null */
const str = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));

/** Número opcional: acepta "2030" o 2030 */
const int = z.preprocess(
  (v) => (typeof v === "string" && /^\d{1,4}$/.test(v.trim()) ? Number(v) : v),
  z.number().int().nullable().catch(null)
);

export const CURP_REGEX =
  /^[A-Z][AEIOUX][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
export const CLAVE_ELECTOR_REGEX = /^[A-Z]{6}\d{8}[HM]\d{3}$/;
export const NIV_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

export const ineSchema = z.object({
  lado: z.enum(["frente", "reverso", "desconocido"]).catch("desconocido"),
  legible: z.boolean().catch(true),
  nombres: str,
  apellidoPaterno: str,
  apellidoMaterno: str,
  curp: str,
  claveElector: str,
  fechaNacimiento: str, // YYYY-MM-DD
  sexo: z.enum(["H", "M"]).nullable().catch(null),
  calle: str,
  colonia: str,
  ciudad: str,
  estado: str,
  codigoPostal: str,
  seccion: str,
  vigencia: int, // año de vigencia (p. ej. 2030)
});
export type IneData = z.infer<typeof ineSchema>;

export const tarjetaSchema = z.object({
  legible: z.boolean().catch(true),
  placa: str,
  niv: str,
  marca: str,
  submarca: str,
  modelo: int, // año modelo
  color: str,
  clase: str,
  tipo: str,
  numeroMotor: str,
  combustible: str,
  propietario: str,
  entidad: str,
  fechaExpedicion: str,
  vigencia: str,
  folio: str,
});
export type TarjetaData = z.infer<typeof tarjetaSchema>;

export type OcrResult<T> = {
  data: T;
  /** Mensajes legibles para mostrar al usuario */
  warnings: string[];
  /** Nombres de campos que conviene revisar manualmente */
  reviewFields: string[];
};
