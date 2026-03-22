# 🧪 Guía de Testing para FleetEase Manager

## Configuración

### Dependencias Requeridas

```bash
# Cuando haya espacio en disco, instalar:
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @types/jest @types/testing-library__jest-dom
```

### Comandos Disponibles

```bash
# Ejecutar tests en modo watch (desarrollo)
npm run test

# Ejecutar tests una vez (CI/CD)
npm run test:ci

# Ejecutar tests con reporte de cobertura
npm run test:coverage
```

## Estructura de Tests

```
src/
├── __tests__/
│   ├── components/     # Tests de componentes
│   │   ├── button.test.tsx
│   │   └── form.test.tsx
│   ├── hooks/          # Tests de hooks
│   │   └── hooks.test.ts
│   └── utils/          # Tests de utilidades
│       ├── validators.test.ts
│       └── utils.test.ts
├── components/
│   └── ui/
│       └── button.tsx
```

## Ejemplos de Tests

### 1. Test de Utilidad (validators.test.ts)

```typescript
import { validators } from '@/lib/validators';

describe('Validators', () => {
  it('debería validar emails correctos', () => {
    expect(validators.email('test@example.com')).toBeNull();
  });

  it('debería rechazar emails inválidos', () => {
    expect(validators.email('invalid')).toBe('Email inválido');
  });
});
```

### 2. Test de Componente (button.test.tsx)

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

it('debería llamar al onClick cuando se hace click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  screen.getByRole('button', { name: /click me/i }).click();
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### 3. Test de Hook (useAuth.test.ts)

```typescript
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/contexts/auth-provider';

it('debería proveer el contexto de autenticación', () => {
  const { result } = renderHook(() => useAuth());
  
  expect(result.current.currentUser).toBeDefined();
  expect(result.current.login).toBeDefined();
  expect(result.current.logout).toBeDefined();
});
```

## Mejores Prácticas

### 1. Nombres Descriptivos

```typescript
// ❌ MAL
it('should work', () => {});

// ✅ BIEN
it('debería validar emails con formato correcto', () => {});
```

### 2. AAA Pattern (Arrange-Act-Assert)

```typescript
it('debería sumar dos números', () => {
  // Arrange
  const a = 2;
  const b = 3;

  // Act
  const result = add(a, b);

  // Assert
  expect(result).toBe(5);
});
```

### 3. Tests Aislados

```typescript
// ✅ BIEN - Cada test es independiente
it('test 1', () => {
  const data = createTestData();
  expect(process(data)).toBe(expected);
});

it('test 2', () => {
  const data = createTestData(); // Nueva instancia
  expect(process(data)).toBe(expected);
});
```

### 4. Mock de Dependencias Externas

```typescript
// jest.setup.js
jest.mock('firebase/firestore', () => ({
  getDocs: jest.fn(),
  addDoc: jest.fn(),
}));
```

## Cobertura de Tests

### Archivos Prioritarios

1. **Críticos** (Debe tener tests):
   - `src/lib/validators.ts` ✅
   - `src/lib/utils.ts` ✅
   - `src/contexts/auth-provider.tsx`
   - `src/contexts/data-provider.tsx`
   - `src/middleware.ts`

2. **Importantes**:
   - Componentes UI reutilizables
   - Hooks personalizados
   - Funciones de cálculo financiero

3. **Secundarios**:
   - Componentes de presentación puros
   - Utilidades simples

## Debugging de Tests

```bash
# Ejecutar un test específico
npm run test -- validators.test.ts

# Ejecutar tests que matcheen un patrón
npm run test -- -t "debería validar emails"

# Ver logs de console.log en tests
npm run test -- --verbose
```

## Integración Continua

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Recursos

- [Testing Library Docs](https://testing-library.com/docs/)
- [Jest Docs](https://jestjs.io/docs/getting-started)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Meta de Cobertura:** 60% para Fase 1, 80% para producción
