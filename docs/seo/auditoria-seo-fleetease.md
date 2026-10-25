# Auditoría SEO — www.fleetease.com.mx

**Fecha:** 26 de octubre de 2026  
**Alcance:** rastreo técnico, on-page, datos estructurados y presencia en buscadores.

> Implementación de fixes críticos: rama `seo/critical-fixes` (octubre 2026).

Ver también: `docs/seo/metadatos-seo-fleetease.md`.

## Resumen ejecutivo

| Severidad | Hallazgos |
|---|---|
| Crítico | 4 |
| Alto | 4 |
| Medio | 6 |
| Bajo / bien hecho | 8 |

**Diagnóstico:** la home está bien construida, pero las landings de keyword históricamente compartían canonical al home, títulos duplicados y/o contenido débil para crawlers. Solo la home aparecía indexada (`site:fleetease.com.mx`).

## Problemas críticos (estado)

1. **Contenido SSR en landings** — Las rutas de marketing son Server Components con H1 y copy en el HTML. Validar post-deploy con `curl -s URL | grep h1`.
2. **Canonical al home** — Corregido: cada landing tiene `alternates.canonical` a su propia URL `https://www.fleetease.com.mx/...`. Se eliminó el canonical global `/` del root layout.
3. **Title/description idénticos** — Corregido: metadata única por ruta; el template `%s | FleetEase` ya no duplica la marca en `/contacto-ventas` ni en títulos que usan `absolute`.
4. **Cloudflare challenge a crawlers** — **Fuera de código.** En Cloudflare: permitir Verified Bots; excluir `/sitemap.xml`, `/robots.txt` y previews de redes del challenge.

## Problemas altos (estado)

5. **H1 del splash** — El overlay `#fe-boot` ya no usa `<h1>`; usa `.fe-boot-title`. Un solo H1 temático por página de marketing.
6. **Plan Free 1 vs 3 vehículos** — Unificado a **1 vehículo · 1 usuario** en FAQ visible, JSON-LD, cards de precios y copy de landings.
7. **robots vs sitemap `/registro`** — `/registro` ya no está en `Disallow`; sitemap lo incluye.
8. **Sitemap incompleto** — Incluye landings, contacto-ventas, registro y páginas legales.

## Plan de verificación post-deploy

```bash
curl -s https://www.fleetease.com.mx/software-para-flotillas | grep -o '<h1[^>]*>.*</h1>'
curl -s https://www.fleetease.com.mx/software-para-flotillas | grep -o 'rel="canonical"[^>]*'
curl -s https://www.fleetease.com.mx/funciones | grep -o '<title>.*</title>'
```

Search Console: Inspección de URL → Ver en vivo en cada landing; solicitar indexación.
