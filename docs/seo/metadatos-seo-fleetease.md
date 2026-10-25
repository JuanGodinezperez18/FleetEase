# Metadatos SEO — www.fleetease.com.mx

Complemento de `auditoria-seo-fleetease.md`. Titles ≤ 60 chars (con template), descriptions ~140–155.

Root layout usa `title.template = "%s | FleetEase"`. En páginas, pasar el segmento **sin** `| FleetEase`, salvo `title.absolute` cuando el título completo ya lleva marca.

## Rutas

| Ruta | Title (segmento o absolute) | Canonical |
|------|-----------------------------|-----------|
| `/` | default layout | (home, metadataBase) |
| `/software-para-flotillas` | Software para Flotillas en México | www…/software-para-flotillas |
| `/software-para-renta-de-vehiculos` | Software para Renta de Vehículos | www…/software-para-renta-de-vehiculos |
| `/control-de-mantenimiento-de-flotillas` | Control de Mantenimiento de Flotillas | www…/control-de-mantenimiento-de-flotillas |
| `/funciones` | absolute: Funciones de FleetEase \| Rentabilidad y Mantenimiento | www…/funciones |
| `/soluciones` | Soluciones para Flotillas y Renta de Vehículos | www…/soluciones |
| `/contacto-ventas` | Contactar con Ventas | www…/contacto-ventas |
| `/registro` | (recomendado: Crea tu Cuenta Gratis) | www…/registro |

## JSON-LD (home)

`LandingJsonLd`: Organization + WebSite + SoftwareApplication (Free/Starter/Pro) + FAQPage (Free = 1 vehículo).

## Checklist anti-regresión

- [ ] HTML de `curl` contiene el H1 temático (sin JS)
- [ ] `rel=canonical` apunta a la propia URL (www)
- [ ] Title y description únicos; sin marca duplicada
- [ ] Un solo H1 por página; splash sin H1
- [ ] FAQ, precios y schema dicen lo mismo sobre el plan Free
