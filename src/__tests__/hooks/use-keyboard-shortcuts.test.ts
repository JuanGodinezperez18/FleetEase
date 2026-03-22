/**
 * @fileoverview Tests para useKeyboardShortcuts hook
 */

import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, useFormKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería registrar listener para keydown', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const shortcuts = [
      { key: 'escape', handler: jest.fn(), description: 'Close' },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('debería ejecutar handler cuando se presiona la tecla correcta', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'escape', handler, description: 'Close' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('debería ejecutar handler con Ctrl+Enter', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'ctrl+enter', handler, description: 'Save', preventDefault: true },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('debería ejecutar handler con Cmd+Enter (Mac)', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'cmd+enter', handler, description: 'Save', preventDefault: true },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true });
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  it('no debería ejecutar handler si enabled es false', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'escape', handler, description: 'Close' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, { enabled: false }));

    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });

  it('debería ignorar input fields si ignoreInputFields es true', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'escape', handler, description: 'Close' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts, { ignoreInputFields: true }));

    // Simular evento en input
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    input.dispatchEvent(event);

    // Escape siempre debería funcionar
    expect(handler).toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('debería hacer preventDefault si está configurado', () => {
    const handler = jest.fn();
    const shortcuts = [
      { key: 'ctrl+s', handler, description: 'Save', preventDefault: true },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(handler).toHaveBeenCalled();
  });
});

describe('useFormKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería llamar onSave con Ctrl+Enter', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    renderHook(() => useFormKeyboardShortcuts({ onSave, onClose }));

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);

    expect(onSave).toHaveBeenCalled();
  });

  it('debería llamar onClose con Escape', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    renderHook(() => useFormKeyboardShortcuts({ onSave, onClose }));

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(event);

    expect(onClose).toHaveBeenCalled();
  });

  it('debería llamar onReset con Ctrl+Shift+R', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const onReset = jest.fn();

    renderHook(() => useFormKeyboardShortcuts({ onSave, onClose, onReset }));

    const event = new KeyboardEvent('keydown', { 
      key: 'r', 
      ctrlKey: true, 
      shiftKey: true,
      bubbles: true 
    });
    window.dispatchEvent(event);

    expect(onReset).toHaveBeenCalled();
  });

  it('no debería hacer nada si enabled es false', () => {
    const onSave = jest.fn();
    const onClose = jest.fn();

    renderHook(() => useFormKeyboardShortcuts({ onSave, onClose, enabled: false }));

    const event = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);

    expect(onSave).not.toHaveBeenCalled();
  });
});
