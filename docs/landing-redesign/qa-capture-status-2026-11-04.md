# Capturas QA y ajuste de dashboard, 2026-11-04

## Datos autorizados de demostración

El propietario confirmó expresamente que todos los datos de su empresa de pruebas son ficticios y autorizó cambiar sus formularios a etiquetas QA. Se identificó la empresa mediante la cuenta de pruebas y se limitaron todas las escrituras a esa empresa.

- Nombre de la empresa: `QA FleetEase Demo` (antes `Mi Empresa`).
- Perfil de la cuenta: `QA Administrador`; acceso y credenciales conservados.
- Datos activos etiquetados: 15 clientes, 4 socios, 21 vehículos y 5 proveedores.
- Contactos con correos reservados `@example.invalid`, teléfonos de demostración y domicilios QA.
- Placas `QADEMO001` a `QADEMO021`, alias `QA Unidad NN` y referencias de licencia/póliza QA.
- Mensajes persistidos de notificaciones identificados como demostración; los nuevos avisos automáticos usan las placas QA.
- No se alteraron importes, fechas, estados operativos, asignaciones ni documentos adjuntos. Las capturas no muestran documentos.

Estos cambios de datos ya se verificaron en la aplicación. No son una migración ni deben ejecutarse para otras empresas.

## Selección de 13 indicadores

La solicitud enumera 12 indicadores. Se conserva `Vehículos activos` como elemento adicional y se documenta esa decisión para que pueda sustituirse si el propietario elige otro.

1. Notificaciones sin leer (L).
2. Flujo de efectivo (S).
3. Ingresos (S).
4. Gastos (S).
5. Vehículos activos (S).
6. Resumen financiero (L).
7. Estado de la flota (M).
8. Rentabilidad por vehículo (M).
9. Salud de mantenimiento (M).
10. Cartera de créditos (M).
11. Licencias por vencer (S).
12. Multas de la flota (M).
13. Riesgo de clientes (M).

La selección de 13 quedó guardada en el navegador de pruebas. El servicio actual guarda la configuración por usuario en `localStorage`; no se sincroniza entre dispositivos. No confundir esa selección con el orden del preset del PR, todavía pendiente de Preview/integración.

El PR añade `Vista de 13 indicadores` al configurador para aplicar este orden de forma explícita. Hay que pulsar `Guardar cambios`; cancelar no persiste el preset. Los dashboards existentes no se sobrescriben automáticamente.

## Causa de los espacios

La cuadrícula anterior combinaba spans fijos con `grid-flow-dense`: podía cambiar el orden visual, dejaba columnas residuales y no estiraba las tarjetas numéricas a la altura de la fila. S y M eran iguales para métricas. La lista de diez avisos podía imponer una altura excesiva a toda la primera fila.

La corrección calcula los spans de cada fila para 1, 2, 3 y 4 columnas, mantiene el orden guardado y amplía la última tarjeta de una fila al ancho restante. S solicita una columna, M hasta dos y L la fila completa. Se conservan las preferencias guardadas; el ancho efectivo se adapta al viewport. Las tarjetas se estiran dentro de su fila y las notificaciones tienen scroll interno acotado, accesible con teclado.

## Recursos de imagen

Se extrajeron de la aplicación cuatro capturas QA: vehículos, finanzas, mantenimiento y rentabilidad. La entrega incluye WebP 1440 × 900 y variantes de 960 y 640 px, además de poster WebP 1280 × 720. Respetar los límites de `asset-requirements.md` (150 KB por captura, 100 KB para poster).

Los 13 archivos WebP están versionados en `public/media/landing/` en el mismo PR. Se verificó la integridad de cada imagen, sus dimensiones y su peso. Las capturas maestras pesan de 67,666 a 79,992 bytes; el poster pesa 57,988 bytes. Desde la aplicación se referencian como `/media/landing/product-finance.webp`, etc., sin el prefijo `public`.

| Archivo | Dimensiones |
|---|---|
| `product-finance.webp` | 1440 × 900 |
| `product-vehicles.webp` | 1440 × 900 |
| `product-maintenance.webp` | 1440 × 900 |
| `product-profitability.webp` | 1440 × 900 |
| Variantes `-960.webp` de cada captura | 960 × 600 |
| Variantes `-640.webp` de cada captura | 640 × 400 |
| `product-demo-poster.webp` | 1280 × 720 |

La landing utiliza ahora `product-profitability` en el hero y `product-vehicles`, `product-finance` y `product-maintenance` en sus tres bloques de producto. El componente compartido sirve los WebP precomprimidos mediante `picture`/`srcset`, con dimensiones intrínsecas para reservar espacio y tamaños adaptados a cada bloque. Sólo el hero carga de inmediato con prioridad alta; los otros tres recursos usan carga diferida. Cada captura identifica sus datos como demostración y abre la imagen maestra en una pestaña nueva para consultar los detalles.

La comprobación en Preview detectó que `src/proxy.ts` redirigía estas imágenes al login. Se añadió una excepción exacta para los 13 nombres WebP públicos; no se habilita genéricamente `/media` ni se omite autenticación por tener una extensión de imagen. Las pruebas verifican el acceso anónimo a esos recursos y mantienen protegidas las rutas privadas similares.

Las capturas corresponden a la aplicación desplegada, no a un mockup del cambio. La imagen principal muestra la pantalla real de rentabilidad y no representa el nuevo orden del dashboard. Renovar la captura del dashboard después de validar el PR en Preview. El poster es un candidato para el video futuro; no se grabó ni se integró video en esta tarea. No publicar un reproductor sin el video real.

## Validación

- Prueba de empaquetado: combinaciones de S/M/L y 1 a 4 columnas, filas completas y orden preservado.
- TypeScript: verificado sin errores.
- Build con variables públicas existentes de Supabase: verificado.
- Suite completa tras conectar imágenes: 331 pruebas pasan, 5 fallan. Los mismos cinco fallos se reprodujeron en el checkout limpio `9ddae5a`: uno en `financial-metrics.test.ts` (límite inclusivo de fecha) y cuatro en `auth-persistence.test.ts` (almacenamiento simulado). No se modifican fórmulas ni autorización de rutas privadas en este PR.
- Pruebas específicas de proxy y dashboard: 58 correctas, incluyendo acceso anónimo a los 13 WebP y protección de rutas privadas con apariencia de imagen.
- `npm ci` falla en la base por entradas faltantes de `ajv`/`json-schema-traverse` en el lockfile. Para verificar se usó `npm install --package-lock=false --ignore-scripts`; no se cambia el lockfile.
- Pendiente: validación visual del cambio y del preset en Preview, móvil/tablet/escritorio, arrastre y recarga. No declarar el ajuste validado en producción antes de integrar y comprobarlo.

No se fusionó ni desplegó código a producción. La única modificación en la aplicación desplegada es la preparación autorizada de la empresa de pruebas y su selección local de indicadores.
