# Requisitos de recursos visuales — Landing FleetEase

**Objetivo:** incorporar imágenes y una demostración real del producto sin perjudicar LCP, transferencia inicial ni experiencia móvil.

## Especificación de imágenes

| Recurso | Cantidad | Tamaño maestro | Formato de entrega | Peso máximo |
|---|---:|---:|---|---:|
| Imagen principal del hero (solo si sustituye/mejora la composición actual) | 1 | 1600 × 1000 px | AVIF; WebP de respaldo | 200 KB |
| Capturas de producto | 4–6 | 1440 × 900 px | AVIF o WebP | 150 KB cada una |
| Captura alternativa para móvil, si el contenido no se entiende al reducir | Según necesidad | 900 × 1200 px | AVIF o WebP | 120 KB |
| Poster del video | 1 | 1280 × 720 px | WebP | 100 KB |
| Logotipos de redes | No se requieren archivos | Vectorial | Iconos inline del paquete ya instalado | Sin petición de imagen |

### Variantes responsive

- Preparar variantes de 640, 960 y 1440 px de ancho cuando el recurso se muestre a distintos tamaños.
- Mantener proporción 16:10 para capturas de interfaz y 16:9 para el poster.
- Usar `next/image` o el mecanismo optimizado ya existente; declarar dimensiones o `aspect-ratio` para evitar CLS.
- Cargar de forma prioritaria únicamente el recurso visual que realmente forme parte del primer viewport.
- Aplicar `loading="lazy"` a las capturas posteriores al primer viewport.
- No incluir capturas con nombres, correos, teléfonos, placas, documentos, identificadores, saldos ni datos reales de clientes. Utilizar una cuenta demo con datos ficticios coherentes y sanitizados.
- Evitar texto pequeño dentro de capturas: si una pantalla necesita explicación, acompañarla con una breve anotación HTML accesible, no incrustar párrafos en la imagen.

## Video de demostración

| Parámetro | Especificación |
|---|---|
| Duración | 30–45 segundos |
| Resolución recomendada | 1280 × 720 px |
| Relación de aspecto | 16:9 |
| Contenedor / codec | MP4 / H.264 |
| Fotogramas | 24–30 fps |
| Audio | Opcional; nunca autoplay con sonido |
| Peso máximo de entrega | 5 MB |
| Peso objetivo | 3–4 MB |
| Poster | 1280 × 720 px, WebP, máximo 100 KB |
| Subtítulos | Archivo VTT o transcripción accesible |

### Guion sugerido (30–45 s)

1. 0–5 s: vista general del dashboard y contexto de la flotilla.
2. 5–13 s: consulta de vehículos y asignaciones.
3. 13–22 s: ingresos, gastos, pagos y saldos.
4. 22–31 s: mantenimiento, vencimientos y alertas.
5. 31–40 s: lectura de rentabilidad / reportes y cierre con CTA.

Mostrar exclusivamente módulos que estén disponibles en la versión actual. No simular automatizaciones, integraciones o pantallas aún no liberadas.

### Estrategia de carga

- No descargar el archivo de video al cargar la landing.
- Mostrar el poster y un botón explícito de reproducción.
- Usar `preload="none"` y asignar la fuente cuando el visitante solicite reproducir; alternativamente, cargar el reproductor bajo demanda.
- No utilizar autoplay. Si se solicita una animación ambiental futura, debe ser independiente del video demostrativo, silenciosa, muy corta y tener alternativa estática.
- Probar el comportamiento en red móvil lenta y con ahorro de datos.

## Presupuesto de rendimiento

- Hero: máximo 200 KB de imagen transferida en el viewport inicial.
- Capturas: no más de 150 KB cada una y carga diferida fuera del viewport.
- Poster: máximo 100 KB; no precargar el MP4.
- Video: máximo 5 MB, transferido solo después de una acción explícita.
- No añadir librerías de reproducción ni paquetes de iconos nuevos para este trabajo.
- Medir LCP, CLS y peso transferido en móvil antes y después. El objetivo es no empeorar los valores del Preview aprobado.

## Archivos y nombres sugeridos

```text
public/
  media/
    landing/
      hero-product.avif
      product-dashboard.avif
      product-vehicles.avif
      product-finance.avif
      product-maintenance.avif
      product-profitability.avif
      product-demo-poster.webp
      product-demo.mp4
      product-demo.vtt
```

No agregar archivos vacíos ni placeholders con nombres finales. Integrar cada recurso cuando se haya recibido, inspeccionado y optimizado.

## Checklist de recepción

- [ ] Capturas reales de una cuenta demo o sanitizadas.
- [ ] Confirmación de que cada pantalla y función mostrada está disponible actualmente.
- [ ] Imágenes exportadas y comprimidas dentro de los límites.
- [ ] Video de 30–45 segundos, máximo 5 MB.
- [ ] Poster WebP de máximo 100 KB.
- [ ] Subtítulos o transcripción.
- [ ] Revisión de privacidad de todos los fotogramas.
- [ ] Validación de rendimiento móvil en Preview.
