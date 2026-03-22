# Splash Screen - Guía Rápida

## 🚀 Inicio Rápido

El splash screen ya está integrado y funcionando automáticamente. No necesitas hacer nada más.

### ¿Qué incluye?

- ✅ Logo con animación de pulso y brillo
- ✅ 30 partículas flotantes en el fondo
- ✅ Barra de progreso animada con gradiente
- ✅ Nombre "FleetEase Manager" con fadeIn
- ✅ Tagline "Gestión Inteligente de Flotas"
- ✅ Dots de carga animados
- ✅ Gradiente púrpura profesional
- ✅ Responsive (móvil, tablet, desktop)
- ✅ Accesible (ARIA, reduced motion, high contrast)

---

## 📋 Estructura de Archivos

```
src/components/splash/
├── splash-screen.tsx              # Componente principal
├── splash-screen.module.css       # Estilos con animaciones
├── splash-screen-wrapper.tsx      # Wrapper con sincronización
└── README.md                       # Esta guía

src/contexts/
└── splash-provider.tsx             # Context provider

docs/
└── SPLASH_SCREEN.md                # Documentación completa
```

---

## ⚙️ Configuración Actual

En `src/components/common/providers.tsx`:

```tsx
<SplashProvider minDuration={2500} enabled={true}>
  {/* Tu app */}
</SplashProvider>
```

- **minDuration**: 2500ms (2.5 segundos mínimo)
- **enabled**: true (activado)

---

## 🎨 Personalizar

### 1. Cambiar duración

```tsx
// En providers.tsx
<SplashProvider minDuration={3000} enabled={true}>
```

### 2. Deshabilitar splash

```tsx
// En providers.tsx
<SplashProvider minDuration={2500} enabled={false}>
```

### 3. Cambiar colores

Editar `splash-screen.module.css`:

```css
.splashContainer {
  /* Tus colores */
  background: linear-gradient(135deg, #tu-color-1 0%, #tu-color-2 100%);
}
```

### 4. Cambiar logo

Reemplazar `/public/logo.png` con tu logo (512x512px recomendado).

### 5. Cambiar textos

Editar `splash-screen.tsx`:

```tsx
<h1 className={styles.appName}>
  Tu Nombre
</h1>

<p className={styles.tagline}>
  Tu Tagline
</p>
```

---

## 🔧 Configuración Avanzada

### Props disponibles en SplashProvider

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `minDuration` | number | 2000 | Duración mínima (ms) |
| `enabled` | boolean | true | Habilitar/deshabilitar |
| `children` | ReactNode | - | Contenido de la app |

### Props disponibles en SplashScreen

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `duration` | number | 3000 | Duración total (ms) |
| `onFinish` | function | - | Callback al terminar |
| `forceHide` | boolean | false | Forzar ocultar |

---

## 🧪 Probar el Splash

1. **Modo incógnito**: El splash aparece cada vez
2. **Modo normal**: El splash aparece solo una vez por sesión
3. **Limpiar sesión**:
   ```javascript
   sessionStorage.clear();
   location.reload();
   ```

---

## 📱 Responsive Testing

```bash
# Tamaños a probar:
- 📱 Móvil:  375px (iPhone SE)
- 📱 Móvil:  390px (iPhone 12)
- 📱 Tablet:  768px (iPad)
- 💻 Desktop: 1920px (Full HD)
```

---

## 🐛 Troubleshooting

### El splash no aparece
```javascript
// En consola del navegador:
sessionStorage.clear();
location.reload();
```

### El splash no desaparece
Verificar en consola si hay errores de carga de datos.

### Animaciones con lag
Reducir partículas en `splash-screen.tsx`:
```tsx
{Array.from({ length: 15 }).map(...)} // Cambiar de 30 a 15
```

---

## 📚 Documentación Completa

Ver `docs/SPLASH_SCREEN.md` para:
- Guía detallada de personalización
- Todas las animaciones disponibles
- Test de accesibilidad
- Métricas de performance
- Ejemplos avanzados

---

## 💡 Tips

1. **Logo**: Usar PNG con transparencia, 512x512px
2. **Colores**: Mantener buen contraste (4.5:1 mínimo)
3. **Duración**: 2-4 segundos es ideal
4. **Testing**: Probar en modo incógnito siempre

---

## ✅ Checklist de Implementación

- [x] Splash screen integrado
- [x] Animaciones funcionando
- [x] Responsive en todos los dispositivos
- [x] Accesibilidad implementada
- [x] Sincronizado con carga de datos
- [x] Documentación completa

---

¡Listo para usar! 🎉
