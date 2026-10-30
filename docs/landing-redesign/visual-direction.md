# FleetEase — Dirección visual y UX de la landing

**Estado:** propuesta para revisión; no autoriza implementación visual.  
**Fecha:** 2026-10-30  
**Enfoque:** evolución de la landing existente (alternativa A).  
**Modo Anti-Slop:** DURING — revisión crítica mientras se diseña e implementa.

## 1. Decisión de diseño

FleetEase debe presentarse como una plataforma mexicana de operación y control financiero de flotillas de renta, no como una plantilla genérica de SaaS ni como una empresa de telemetría/GPS.

La dirección será **industrial, editorial y orientada al producto**: jerarquía tipográfica contundente, superficies oscuras sobrias, líneas divisorias precisas, composición asimétrica y capturas reales del producto como evidencia principal. El color lima identifica acciones y datos relevantes; no debe convertirse en decoración omnipresente.

La landing actual ya tiene una identidad reconocible y un sistema de tokens. Se refina esa identidad; no se reemplaza por otro sistema visual.

## 2. Evidencia del estado actual

Revisión estática del código en `master` (`c67397351fd99ade80faf37add4d65aacc9845b5`):

- La home está implementada en `src/app/page.tsx` y compone componentes de `src/components/landing/`.
- El hero utiliza `HeroDashboard`, una demostración conceptual explícitamente etiquetada como ilustrativa, no una captura de la aplicación.
- El contenido principal ya cubre gestión, rentabilidad, mantenimiento, flujo de trabajo, visión, servicio presencial en Monterrey, precios, FAQ y CTA final.
- `LandingSocialProof` comunica beneficios y no testimonios ni resultados de clientes; su nombre interno no debe confundirse con prueba social verificable.
- `LandingMotionBand` combina una banda animada de capacidades con cifras/afirmaciones. Debe revisarse para evitar repetición, movimiento sin función y afirmaciones no demostradas.
- `LandingPricing` ya lee `plans` desde `src/config/plans.ts` y publica Free, Starter y Pro. Enterprise está excluido del marketing público; se conserva así.
- `LandingHeader`, `LandingStickyCta`, FAQ y formularios tienen interacciones existentes que deben preservarse.
- `framer-motion` ya está instalado. No se justifica añadir GSAP u otra librería de animación para esta fase.
- Los assets públicos localizados son principalmente marca/OG/favicon. No se identificó un set de capturas reales de producto ni un video de producto listo para publicación.

Esta revisión fue de código y estructura. No equivale a una auditoría visual completa de todas las rutas en navegador.

## 3. Dirección visual

### Paleta y superficies

Respetar `DESIGN.md` y `src/app/fleetease-ui.css`:

- Lima FleetEase: `--fe-lime: #d7ff3f`; usar para CTA primario, estados activos y énfasis puntual.
- Fondo principal: `--fe-ink: #080a0f`.
- Superficie oscura: `--fe-dark-surface: #0e1117`.
- Bordes finos y superficies de bajo contraste para separar grupos sin convertir cada elemento en una tarjeta.
- No introducir una paleta paralela, gradientes decorativos dominantes ni colores hardcodeados nuevos.

### Tipografía y composición

- Mantener una escala tipográfica editorial con títulos grandes, frases breves y ancho de lectura controlado.
- Combinar bloques de texto compactos con grandes superficies de producto.
- Usar grillas asimétricas y ritmo vertical deliberado; evitar una secuencia interminable de tarjetas idénticas.
- Mantener el contenido escaneable: problema operativo → producto que lo resuelve → evidencia visual → capacidades → conversión.
- La interfaz real de FleetEase debe ser el elemento visual protagonista, no ilustraciones abstractas.

### Fotografía y video

Prioridad de activos:
1. Capturas reales y sanitizadas de FleetEase.
2. Grabación real de un flujo de trabajo en una cuenta demo segura.
3. Fotografía contextual propia del entorno de vehículos/renta, únicamente si aporta contexto real.
4. No utilizar stock genérico de dashboards, mapas, vehículos o personas como sustituto del producto.

No capturar ni publicar nombres, teléfonos, placas, documentos, importes, empresas, identificadores ni datos de clientes reales. Utilizar cuenta demo y datos sintéticos claramente identificados.

El video de producto se plantea como una pieza breve (aprox. 30–45 s), con recorrido real por: vista general → vehículo/operación → ingresos y gastos → mantenimiento/alertas → reporte. Guion y secuencia sujetos a validar contra las pantallas disponibles. Incluir subtítulos o transcripción, poster optimizado y controles. No autoplay con audio. En móvil, priorizar poster/captura y carga bajo demanda.

## 4. Arquitectura propuesta de la página

La propuesta reduce repetición y hace que cada bloque cumpla una función comercial clara:

1. **Header compacto:** logo, Producto, Cómo funciona, Precios y FAQ; CTA primario “Comenzar gratis”. Conservar acceso a login.
2. **Hero de producto:** promesa principal concreta; CTA primario a `/registro`, secundario a `/contacto-ventas`; a la derecha/abajo una captura real del dashboard, no un mock que parezca dato real.
3. **Banda de contexto breve:** 2–3 hechos verificables y útiles (por ejemplo, plan Free, sin tarjeta, operación para renta en México). No llamarla prueba social.
4. **Demo del producto:** video corto o recorrido visual con capturas reales y controles accesibles.
5. **Tres pilares operativos:**
   - Control de operación: vehículos, clientes, asignaciones, socios y cobranza.
   - Control financiero: ingresos, gastos, pagos, créditos y rentabilidad por unidad.
   - Continuidad operativa: kilometraje, mantenimiento, documentos y vencimientos.
   Cada pilar debe mostrar una pantalla o recorte real y explicar una tarea/resultado verificable.
6. **Cómo funciona:** conservar el flujo de tres pasos, simplificando texto y conectándolo con la evidencia del producto.
7. **Por qué existe FleetEase:** mantener la visión y experiencia operativa, sin inventar clientes, testimonios, porcentajes o resultados.
8. **Servicio de administración de vehículos en Monterrey:** mantenerlo como oferta distinta del SaaS, con CTA y asunto específico hacia `/contacto-ventas?tipo=administracion`.
9. **Precios:** conservar Free, Starter y Pro alimentados desde `src/config/plans.ts`; no duplicar importes ni capacidades en otra fuente. No publicar Enterprise como producto terminado.
10. **FAQ:** responder límites, alcance real, GPS y capacidades actuales sin prometer integraciones que estén en coming soon.
11. **CTA final y footer:** mantener rutas legales, SEO y navegación existentes.

El orden definitivo puede ajustarse durante la implementación si la revisión de contenido revela redundancias, pero no se añadirán secciones para alargar la página.

## 5. Movimiento y microinteracciones

- Movimiento con intención: entrada breve de elementos, transiciones de estado y énfasis del producto.
- Usar Framer Motion existente solo donde añada comprensión o respuesta.
- Respetar `prefers-reduced-motion` en todas las animaciones; asegurar que el contenido esté disponible sin movimiento.
- Evitar loops infinitos, parallax pesado, cursores personalizados, contadores falsos, scroll hijacking y animación de cada tarjeta.
- Eliminar o simplificar la banda ticker si no supera una prueba clara de utilidad.
- No introducir autoplay de video en móvil ni cargar recursos pesados antes de que sean necesarios.

## 6. Responsive, accesibilidad y rendimiento

- Diseñar primero el hero y la demo para móvil; tablet no será una versión de escritorio comprimida.
- Mantener targets táctiles de al menos 44 px donde sea práctico.
- Preservar navegación por teclado, foco visible, landmarks, orden semántico de encabezados, labels y estados de formularios.
- Las capturas tendrán texto alternativo contextual; los videos tendrán subtítulos/transcripción.
- Usar imágenes optimizadas y tamaños explícitos; lazy-load de medios fuera del primer viewport.
- Evitar que el video afecte LCP; el poster debe ser ligero y servir como fallback.
- Validar contraste en los fondos oscuros y en el CTA lima.
- Respetar safe-area en CTA móvil y evitar que tape contenido o controles.

## 7. Copy y exactitud comercial

- Hablar de rentas, vehículos, ingresos, gastos, socios, pagos, mantenimiento y rentabilidad.
- No afirmar que FleetEase ofrece GPS propio, integraciones, automatizaciones o funciones que no estén operativas.
- Mantener los estados coming soon fuera de promesas de disponibilidad.
- No fabricar testimonios, logos de clientes, ratings, volumen de flota administrada ni porcentajes de ahorro.
- Cualquier nueva afirmación factual requiere validación del propietario antes de publicarse.
- Conservar la afirmación de experiencia operativa existente únicamente si el usuario confirma que puede respaldarla públicamente.

## 8. Límites de alcance

Incluido:
- Landing pública y componentes dedicados a ella.
- Jerarquía, composición, copy comercial sujeto a validación, imágenes/video, motion y responsive.
- Mejoras locales de accesibilidad y rendimiento de la landing.

Excluido:
- Dashboard autenticado y portales admin/partner/client.
- Lógica de negocio, cálculos financieros, consultas de datos, autenticación y autorización.
- Stripe, planes/precios fuente, checkout y límites de suscripción.
- Supabase, RLS, esquema, migraciones y datos.
- Formularios/API comerciales, salvo cambios visuales sin alterar contrato, payload ni comportamiento.
- SEO/rutas legales existentes: no eliminarlos ni cambiar URLs canónicas sin aprobación específica.

## 9. Activos necesarios antes de implementar la demo final

Solicitar y aprobar:
- 4–6 capturas sanitizadas: dashboard, ficha de vehículo, movimientos financieros, rentabilidad/reporte, mantenimiento y alertas.
- Una cuenta demo segura para grabar el flujo, o un video ya producido por el usuario.
- Confirmación de qué pantallas y capacidades pueden mostrarse públicamente.
- Confirmación de la afirmación “más de 8 años de experiencia” para el bloque de administración en Monterrey.

Si no están disponibles, se puede implementar la estructura visual con placeholders explícitos; no se simularán capturas ni se presentará un mock como producto real.

## 10. Criterios de aceptación visual

- La primera pantalla comunica qué es FleetEase, para quién es y qué acción tomar.
- Una captura real y verificable del producto ocupa el papel visual principal.
- Cada sección tiene una función distinta y no repite la misma cuadrícula de tarjetas.
- Precios y límites coinciden con `src/config/plans.ts`; Enterprise sigue fuera del escaparate público.
- El servicio de administración de vehículos sigue claramente diferenciado y localizado en Monterrey.
- La landing es utilizable con teclado, lectores de pantalla y movimiento reducido.
- No se publican datos personales ni de clientes.
- El rendimiento no se degrada por video, animación o imágenes grandes.
- No se modifica el comportamiento de registro, login, contacto, pricing, analytics, SEO ni rutas legales.

---
**Pendiente de aprobación del usuario.** Este documento define dirección y criterios; no es autorización para modificar componentes de la landing.
