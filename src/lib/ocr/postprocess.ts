import {
  CLAVE_ELECTOR_REGEX,
  CURP_REGEX,
  NIV_REGEX,
  type IneData,
  type OcrResult,
  type TarjetaData,
} from "./schemas";

const clean = (v: string | null) => (v ? v.toUpperCase().replace(/[\s.]/g, "") : null);

function parseCurp(curp: string) {
  const yy = Number(curp.slice(4, 6));
  // Posición 17: dígito => nacido antes del 2000, letra => 2000 en adelante
  const century = /\d/.test(curp[16]) ? 1900 : 2000;
  return {
    fechaNacimiento: `${century + yy}-${curp.slice(6, 8)}-${curp.slice(8, 10)}`,
    sexo: curp[10] as "H" | "M",
  };
}

export function postprocessIne(raw: IneData): OcrResult<IneData> {
  const data: IneData = { ...raw };
  const warnings: string[] = [];
  const review = new Set<string>();

  if (!raw.legible) warnings.push("La imagen no es del todo legible. Intenta con otra foto.");
  if (raw.lado === "reverso") {
    warnings.push("Parece el reverso de la INE. Sube también el frente para ver nombre y domicilio.");
  }

  data.curp = clean(raw.curp);
  if (data.curp) {
    if (!CURP_REGEX.test(data.curp)) {
      warnings.push("La CURP no tiene un formato válido. Verifícala.");
      review.add("curp");
    } else {
      const d = parseCurp(data.curp);
      if (!data.fechaNacimiento) data.fechaNacimiento = d.fechaNacimiento;
      else if (data.fechaNacimiento !== d.fechaNacimiento) {
        warnings.push("La fecha de nacimiento no coincide con la CURP.");
        review.add("fechaNacimiento");
        review.add("curp");
      }
      if (!data.sexo) data.sexo = d.sexo;
      else if (data.sexo !== d.sexo) {
        warnings.push("El sexo no coincide con la CURP.");
        review.add("sexo");
        review.add("curp");
      }
    }
  }

  data.claveElector = clean(raw.claveElector);
  if (data.claveElector && !CLAVE_ELECTOR_REGEX.test(data.claveElector)) {
    warnings.push("La clave de elector no tiene un formato válido. Verifícala.");
    review.add("claveElector");
  }

  if (data.codigoPostal && !/^\d{5}$/.test(data.codigoPostal)) {
    warnings.push("El código postal debe tener 5 dígitos.");
    review.add("codigoPostal");
  }

  if (data.vigencia !== null && data.vigencia < new Date().getFullYear()) {
    warnings.push(`La INE venció en ${data.vigencia}.`);
    review.add("vigencia");
  }

  for (const k of ["nombres", "apellidoPaterno", "calle", "ciudad", "estado"] as const) {
    if (raw.lado !== "reverso" && !data[k]) review.add(k);
  }

  return { data, warnings, reviewFields: [...review] };
}

export function postprocessTarjeta(raw: TarjetaData): OcrResult<TarjetaData> {
  const data: TarjetaData = { ...raw };
  const warnings: string[] = [];
  const review = new Set<string>();

  if (!raw.legible) warnings.push("La imagen no es del todo legible. Intenta con otra foto.");

  data.placa = raw.placa ? raw.placa.toUpperCase().replace(/\s+/g, "") : null;

  if (raw.niv) {
    let niv = raw.niv.toUpperCase().replace(/[\s-]/g, "");
    // Un NIV nunca contiene I, O ni Q: son confusiones típicas de lectura
    const fixed = niv.replace(/[IOQ]/g, (c) => (c === "I" ? "1" : "0"));
    if (fixed !== niv) {
      warnings.push("Se corrigieron caracteres del NIV (I/O/Q no existen en un NIV). Verifícalo.");
      review.add("niv");
      niv = fixed;
    }
    data.niv = niv;
    if (!NIV_REGEX.test(niv)) {
      warnings.push("El NIV debe tener 17 caracteres válidos. Verifícalo.");
      review.add("niv");
    }
  }

  const year = new Date().getFullYear();
  if (data.modelo !== null && (data.modelo < 1950 || data.modelo > year + 2)) {
    warnings.push("El año modelo parece incorrecto.");
    review.add("modelo");
  }

  for (const k of ["placa", "niv", "marca", "modelo"] as const) {
    if (!data[k]) review.add(k);
  }

  return { data, warnings, reviewFields: [...review] };
}
