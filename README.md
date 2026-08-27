# 🚗 FleetEase Manager

> **Control de Rentabilidad para Flotas de Vehículos en México**

[![Next.js](https://img.shields.io/badge/Next.js-16.0.10-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.1-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

---

## 🎯 ¿Qué es FleetEase?

**FleetEase NO es otro sistema de gestión de flotas.**

Es la plataforma que te dice **exactamente qué vehículo gana dinero y cuál pierde** en tu flota de renta de vehículos.

### 🎯 Casos de Uso Principales

| Nicho | Problema que Resolvemos |
|-------|------------------------|
| **Renta de autos para Uber/Didi** | Control de choferes, cortes semanales, deudas, SAT |
| **Flotillas empresariales** | Control de gastos, mantenimiento, rentabilidad por unidad |
| **Empresas con flota propia** | Optimización de costos, decisiones de compra/venta |

---

## 📦 Módulos Principales

### Gestión Operativa
- **Clientes**: Registro, scoring, historial, deudas
- **Vehículos**: Flota, mantenimiento, documentos, inspecciones
- **Partners**: Socios propietarios, comisiones, rentabilidad
- **Choferes**: Control de operadores, cortes semanales, retenciones

### Gestión Financiera
- **Ingresos**: Rentas, pagos, depósitos
- **Gastos**: Mantenimiento, seguros, multas, operativos
- **Créditos**: Financiamiento, cronogramas, pagos parciales
- **Rentabilidad**: Por vehículo, por cliente, por partner

### Inteligencia de Negocio
- **Dashboards**: KPIs en tiempo real
- **Alertas**: Notificaciones proactivas
- **Reportes**: Exportación a Excel/PDF
- **Tendencias**: Análisis histórico

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 16** (App Router, Turbopack)
- **React 19** con Server Components
- **TypeScript** (strict mode)
- **Tailwind CSS** + Shadcn/ui
- **TanStack Query** + **TanStack Table**
- **React Hook Form** + **Zod**
- **Recharts**, **Framer Motion**, **@dnd-kit**

### Backend & Base de Datos
- **Supabase** (PostgreSQL, Auth, Storage) — backend principal
- **Vercel Cron Jobs** — tareas programadas (`/api/cron/*`: mantenimiento, seguros, licencias, limpieza de inspecciones)
- **Stripe** — suscripciones y pagos

> El proyecto migró por completo de Firebase/Google Cloud a Supabase + Vercel. Se removieron las Firebase Cloud Functions, Firebase Data Connect, la configuración de Firebase App Hosting y el CORS de Firebase Storage. El único resto es soporte de lectura para documentos antiguos que aún viven en `firebasestorage.googleapis.com` (no se suben archivos nuevos ahí).

### Testing & Calidad
- **Jest** + React Testing Library
- **ESLint 9**
- **TypeScript** en modo estricto

---

## 🚀 Quick Start

### Requisitos Previos
```bash
Node.js >= 18.17.0
npm >= 9.0.0
Proyecto de Supabase configurado
```

### Instalación

```bash
git clone https://github.com/JuanGodinezperez18/FleetEase.git
cd FleetEase

npm install

cp .env.local.template .env.local
# Editar .env.local con tus credenciales de Supabase, Stripe y Google Maps

npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📁 Estructura del Proyecto

```
FleetEase/
├── src/
│   ├── app/                # App Router (rutas, API routes, dashboard, portales)
│   ├── components/         # Componentes React (ui, dashboard, forms, layout...)
│   ├── contexts/           # React Contexts (auth, data)
│   ├── hooks/              # Custom hooks
│   ├── lib/                # supabase.ts, validators, logger, utils
│   ├── types/              # Definiciones TypeScript
│   └── __tests__/          # Tests unitarios
├── supabase/migrations/    # Migraciones SQL de Supabase
├── docs/                    # Documentación de módulos específicos
├── scripts/                   # Scripts de utilidad (bundle analysis, setup)
└── package.json
```

---

## 🔧 Comandos Disponibles

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # ESLint
npm run type-check       # Verificar tipos de TypeScript
npm test                 # Tests en watch mode
npm run test:ci          # Tests para CI
npm run test:coverage    # Tests con coverage
npm run analyze:bundle   # Análisis de bundle size
npm run lighthouse       # Lighthouse audit local
```

---

## 🌍 Variables de Entorno

Copiar `.env.local.template` a `.env.local` y completar. Grupos principales:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, precios por plan
- **Google Maps**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Notificaciones push**: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Firebase (legacy)**: `FIREBASE_ADMIN_*` — solo necesarias si aún se usan las Cloud Functions o FCM

⚠️ **Nunca commitear `.env.local` ni archivos con credenciales reales al repositorio.**

---

## 🚀 Deployment

El proyecto se despliega en **Vercel**. Ver [VERCEL-DEPLOY-GUIDE.md](./VERCEL-DEPLOY-GUIDE.md) para el detalle completo.

```bash
npm i -g vercel
vercel --prod
```

Deploy automático en cada push a `master`.

---

## 📚 Documentación

- [🚀 Guía de Deployment (Vercel)](./VERCEL-DEPLOY-GUIDE.md)
- [🗺️ Roadmap](./ROADMAP-FUTURAS-MEJORAS.md)
- [🔒 Seguridad — Quick Start](./SECURITY_QUICK_START.md)
- [🔑 Rotación de Credenciales](./SECURITY_CREDENTIAL_ROTATION.md)
- [📖 Referencia Firebase vs Supabase](./SUPABASE_REFERENCE.md)
- [🗄️ Políticas RLS de Supabase Storage](./SUPABASE_STORAGE_RLS.md)
- [💳 Configuración de Stripe](./STRIPE_CONFIG.md)
- [🗺️ Configuración de Google Maps](./GOOGLE_MAPS_SETUP.md)
- [🔐 Configuración SSL](./SSL_CONFIG.md)
- [📝 Guía de Testing](./TESTING_GUIDE.md)
- [📊 Estructura de KPIs](./docs/KPI_STRUCTURE.md)
- [📈 Módulo de Reportes](./docs/REPORTS_MODULE.md)
- [🪪 Escáner de INE](./docs/INE_SCANNER.md)
- [🚙 Escáner de Tarjeta de Circulación](./docs/CIRCULATION_CARD_SCANNER.md)

---

## 🧪 Testing

```bash
src/__tests__/
├── components/
├── hooks/
└── utils/
```

Ejecutar `npm run test:coverage` para ver el reporte de cobertura actualizado.

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

## 👨‍💻 Autor

**Juan Godinez** — [@JuanGodinezperez18](https://github.com/JuanGodinezperez18)

---

**Última actualización**: Agosto 2026
