/**
 * @fileoverview Tests para ErrorBoundary component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary, FunctionalErrorBoundary } from '@/components/error-boundary';

// Componente que lanza error
const BrokenComponent = () => {
  throw new Error('Something went wrong!');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debería renderizar children cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <div>Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('debería mostrar UI de error cuando hay error', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
  });

  it('debería mostrar nombre del componente en el título si se proporciona', () => {
    render(
      <ErrorBoundary componentName="TestComponent">
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error en TestComponent/i)).toBeInTheDocument();
  });

  it('debería usar fallback customizado si se proporciona', () => {
    const CustomFallback = <div data-testid="custom-fallback">Custom Error UI</div>;

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('debería llamar onError callback cuando hay error', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
  });

  it('debería mostrar botón de Recargar', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recargar')).toBeInTheDocument();
  });

  it('debería mostrar botón de Ir al Dashboard', () => {
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ir al Dashboard')).toBeInTheDocument();
  });

  it('debería mostrar detalles del error en modo desarrollo', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'development' },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Ver detalles del error')).toBeInTheDocument();

    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
      configurable: true,
    });
  });

  it('no debería mostrar detalles del error en modo producción', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: 'production' },
      writable: true,
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Ver detalles del error')).not.toBeInTheDocument();

    Object.defineProperty(process, 'env', {
      value: { ...process.env, NODE_ENV: originalEnv },
      writable: true,
      configurable: true,
    });
  });
});

describe('FunctionalErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('debería renderizar children normalmente', () => {
    render(
      <FunctionalErrorBoundary>
        <div>Normal Content</div>
      </FunctionalErrorBoundary>
    );

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('debería usar fallback function cuando hay error', () => {
    const fallbackFn = jest.fn((error, reset) => (
      <div>
        <span>Error occurred</span>
        <button onClick={reset}>Reset</button>
      </div>
    ));

    render(
      <FunctionalErrorBoundary fallback={fallbackFn}>
        <BrokenComponent />
      </FunctionalErrorBoundary>
    );

    expect(fallbackFn).toHaveBeenCalled();
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
  });

  it('debería llamar onError cuando hay error', () => {
    const onError = jest.fn();

    render(
      <FunctionalErrorBoundary onError={onError}>
        <BrokenComponent />
      </FunctionalErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });
});
