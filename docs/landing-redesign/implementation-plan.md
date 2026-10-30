# FleetEase — Plan técnico de evolución de la landing

**Estado:** plan propuesto; requiere aprobación antes de iniciar cambios de UI.  
**Rama de documentación:** `docs/landing-industrial-design-plan-2026-10-30`  
**Base revisada:** `master` en `c67397351fd99ade80faf37add4d65aacc9845b5`  
**Estrategia:** alternativa A — evolución in-place de la landing actual.

## 1. Objetivo

Mejorar claridad, percepción de producto, confianza y conversión de la landing pública mediante una intervención acotada. Se conservarán rutas, SEO, formularios, lógica comercial, componentes funcionales y contratos existentes.

La implementación futura se realizará en una rama de trabajo separada y desplegará únicamente a Preview de Vercel para revisión. No se hará merge ni deploy a producción sin autorización explícita del usuario.

## 2. Inventario técnico de partida

| Área | Estado observado | Tratamiento |
|---|---|---|
| Página | `src/app/page.tsx` | Reorganizar composición sin cambiar rutas/acciones |
| Header | `landing-header.tsx` | Refinar navegación y jerarquía; conservar login/registro |
| Hero | `hero-dashboard.tsx` | Sustituir progresivamente demo conceptual por captura real aprobada |
| Banda | `landing-motion-band.tsx` | Auditar redundancia, ticker y claims; reducir o retirar solo con validación |
| Beneficios | `landing-social-proof.tsx` | Renombrar conceptualmente como proof/beneficios; no inventar prueba social |
| Cómo funciona | `landing-how-it-works.tsx` | Conservar el flujo si sigue siendo exacto |
| Pricing | `landing-pricing.tsx` | Mantener fuente `src/config/plans.ts`; no alterar planes ni Stripe |
| FAQ | `landing-faq.tsx` | Actualizar solo respuestas aprobadas y verificadas |
| CTA sticky | `landing-sticky-cta.tsx` | Verificar solapamiento, reduced motion y safe-area |
| Contacto | `sales-contact-form.tsx` + ruta/API actual | No cambiar payload, endpoint ni comportamiento |
| Estilos | `src/app/fleetease-ui.css` | Consumir tokens existentes; evitar nuevo sistema |
| Motion | Framer Motion ya instalado | No añadir dependencia sin necesidad demostrable |
| SEO | Metadata, JSON-LD y rutas actuales | Preservar canonical, metadata, schema y enlaces |

Assets públicos identificados: logos/íconos/OG y recursos de marca. No se encontró un paquete de capturas reales ni video de producto en el inventario revisado.

## 3. Plan por fases

### Fase 0 — Preparación y validación de activos

- Obtener aprobación de este documento.
- Recibir capturas sanitizadas y/o autorización de una cuenta demo segura.
- Confirmar pantallas, capacidades y afirmaciones comerciales que pueden mostrarse.
- Confirmar el claim de experiencia operativa de más de 8 años.
- Definir la grabación del recorrido de producto y sus subtítulos.
- Comprobar que no se expongan datos reales.

**Salida:** paquete de activos aprobado y matriz de claims permitidos.

### Fase 1 — Estructura y narrativa

- Ajustar el orden de las secciones de `src/app/page.tsx`.
- Resolver redundancias entre hero, banda de movimiento, beneficios y bloques de producto.
- Establecer el hero con CTA principal y evidencia visual real.
- Diseñar la sección de demo y los tres pilares de valor.
- Preservar visión, servicio de Monterrey, pricing, FAQ, CTA y footer.
- Mantener rutas y anchors que estén enlazados externamente; si algún anchor cambia, conservar alias o actualizar todos sus usos de forma controlada.

**Salida:** landing con arquitectura y narrativa aprobadas, sin cambios en la lógica de negocio.

### Fase 2 — Sistema visual y medios

- Aplicar composición industrial/editorial sobre tokens FleetEase existentes.
- Crear componentes visuales reutilizables solo cuando eviten duplicación real.
- Integrar capturas con optimización, tamaños y alt text.
- Integrar video con poster, controles, subtítulos/transcripción y carga diferida.
- Aplicar microinteracciones selectivas con Framer Motion.
- Asegurar fallback estático y respeto total a `prefers-reduced-motion`.

**Salida:** landing visual completa en rama de trabajo.

### Fase 3 — Responsive, accesibilidad y rendimiento

- Validar 360/390 px, tablet ~768 px, laptop ~1280 px y escritorio ancho.
- Comprobar menú móvil, CTA sticky, safe-area y ausencia de overflow horizontal.
- Revisar teclado, foco, contraste, encabezados, labels y lector de pantalla.
- Comprobar LCP/CLS y carga diferida de medios.
- Evitar que video o animaciones afecten el primer render.

**Salida:** matriz de QA con incidencias resueltas o documentadas.

### Fase 4 — Regresión funcional y Preview

- Confirmar navegación a `/registro`, `/login`, `/contacto-ventas` y `/contacto-ventas?tipo=administracion`.
- Verificar anchors, footer, políticas legales, canonical, Open Graph y JSON-LD.
- Comprobar que el pricing coincide con `src/config/plans.ts` y que Enterprise no aparece.
- Probar envío de formularios sin alterar endpoint ni payload.
- Ejecutar lint/type-check/build y pruebas aplicables del repositorio.
- Generar Preview de Vercel y revisar capturas desktop + móvil en una ronda consolidada.
- Presentar URL de Preview, cambios, resultados de CI y cualquier limitación.

**Salida:** PR listo para revisión, sin merge ni producción.

## 4. Controles de riesgo y límites

1. No editar `master`.
2. No tocar `src/config/plans.ts`, IDs de Stripe, checkout ni gating.
3. No modificar Auth, middleware, Supabase, RLS, tablas, consultas ni lógica multiempresa.
4. No modificar cálculos financieros ni lógica de operación.
5. No cambiar endpoints ni payloads de formularios.
6. No eliminar metadatos, JSON-LD, canonical, sitemap, páginas SEO o enlaces legales.
7. No publicar datos reales de clientes/empresas/vehículos.
8. No inventar métricas, logos, testimonios o capacidades.
9. No añadir librerías de animación ni video player sin análisis de coste/beneficio.
10. No fusionar ni desplegar a producción sin aprobación explícita.

## 5. Estrategia de ramas y entregas

- Esta rama contiene únicamente documentación de diseño y planificación.
- Tras aprobación del diseño, crear una rama de implementación desde el `master` vigente, no desde esta rama documental.
- Implementar en PR pequeño y revisable.
- Preview de Vercel para validación visual.
- Corregir regresiones antes de solicitar aprobación.
- El usuario decide si el PR se fusiona.

## 6. Validación técnica prevista

Comandos disponibles en `package.json`:
- `npm run type-check`
- `npm run build`
- `npm run test:ci`
- `npm run lint` (verificar que el script sea compatible con Next.js 16 antes de usarlo; no asumir que `next lint` siga disponible).

Además:
- Verificar links internos y anchors.
- Revisar errores de consola y requests fallidos en Preview.
- Comprobar imágenes, poster y video en desktop/móvil.
- Ejecutar Lighthouse/medición equivalente sobre Preview y comparar con baseline reciente, sin prometer una puntuación fija antes de medir.
- Comprobar visualmente el modo de movimiento reducido.

## 7. Criterios de salida de la fase de implementación

- Landing coherente con dirección visual aprobada.
- Producto mostrado mediante activos reales y sanitizados.
- Responsive sin overflow ni elementos tapados.
- Accesibilidad básica verificada.
- Sin cambios fuera del alcance autorizado.
- Pricing/SEO/forms/routes intactos.
- Build, type-check y pruebas aplicables correctos.
- Preview disponible y PR listo para revisión.
- Sin merge ni producción hasta aprobación del usuario.

## 8. Pendientes para el usuario

1. Entregar 4–6 capturas sanitizadas del producto o autorizar una cuenta demo segura.
2. Proporcionar video real o aprobar la grabación de un recorrido con datos sintéticos.
3. Confirmar que el claim de “más de 8 años de experiencia” puede publicarse.
4. Aprobar este plan y la dirección visual antes de iniciar modificaciones de componentes.

---
**Nota:** la documentación no cambia el producto. El siguiente paso, después de la aprobación, será preparar activos y crear una rama de implementación desde el `master` actualizado.
