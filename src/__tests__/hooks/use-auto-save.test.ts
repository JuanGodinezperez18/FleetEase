/**
 * @fileoverview Tests para useAutoSave hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSave } from '@/hooks/use-auto-save';

// Mock de localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock de toast
jest.mock('sonner', () => ({
  toast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería guardar en localStorage después del delay', async () => {
    const testData = { name: 'Test', value: 123 };
    const onSave = jest.fn();

    renderHook(() =>
      useAutoSave({
        data: testData,
        storageKey: 'test-draft',
        onSave,
        saveDelay: 1000,
      })
    );

    // Avanzar tiempo
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Verificar que se guardó en localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'test-draft',
      JSON.stringify(testData)
    );
  });

  it('debería llamar onSave callback si se proporciona', async () => {
    const testData = { name: 'Test' };
    const onSave = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoSave({
        data: testData,
        storageKey: 'test-draft',
        onSave,
        saveDelay: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(testData);
    });
  });

  it('debería cargar borrador guardado', () => {
    const testData = { name: 'Test', value: 456 };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(testData));

    const { result } = renderHook(() =>
      useAutoSave({
        data: {} as any,
        storageKey: 'test-draft',
      })
    );

    const draft = result.current.loadDraft();

    expect(draft).toEqual(testData);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-draft');
  });

  it('debería limpiar borrador', () => {
    const { result } = renderHook(() =>
      useAutoSave({
        data: {} as any,
        storageKey: 'test-draft',
      })
    );

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-draft');
  });

  it('debería guardar inmediatamente con saveNow', () => {
    const testData = { name: 'Immediate' };
    const onSave = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useAutoSave({
        data: testData,
        storageKey: 'test-draft',
        onSave,
        isDirty: true,
      })
    );

    act(() => {
      result.current.saveNow();
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });

  it('no debería guardar si isDirty es false', () => {
    const testData = { name: 'Test' };

    renderHook(() =>
      useAutoSave({
        data: testData,
        storageKey: 'test-draft',
        isDirty: false,
        saveDelay: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('debería mostrar toast cuando enableToast es true', () => {
    const testData = { name: 'Test' };
    const { toast } = require('sonner');

    renderHook(() =>
      useAutoSave({
        data: testData,
        storageKey: 'test-draft',
        enableToast: true,
        saveDelay: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(toast.info).toHaveBeenCalledWith('Borrador guardado automáticamente', {
      duration: 2000,
    });
  });
});
