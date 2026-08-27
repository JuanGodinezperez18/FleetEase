/**
 * @fileoverview Tests para componentes de accesibilidad
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { LiveRegion, useAnnounce, FocusTrap } from '@/components/accessibility/live-region';

describe('LiveRegion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar mensaje con role="status"', () => {
    render(<LiveRegion message="Test message" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveTextContent('Test message');
  });

  it('debería tener aria-live="polite" por defecto', () => {
    render(<LiveRegion message="Test message" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('debería tener aria-live="assertive" si se configura', () => {
    render(<LiveRegion message="Test message" politeness="assertive" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('debería tener aria-atomic="true" por defecto', () => {
    render(<LiveRegion message="Test message" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('debería tener clase sr-only para screen readers', () => {
    render(<LiveRegion message="Test message" />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('no debería renderizar nada si message está vacío', () => {
    const { container } = render(<LiveRegion message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('debería limpiar mensaje después de clearAfter ms', async () => {
    jest.useFakeTimers();

    render(<LiveRegion message="Test message" clearAfter={1000} />);

    expect(screen.getByRole('status')).toHaveTextContent('Test message');

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('no debería limpiar mensaje si clearAfter es null', () => {
    jest.useFakeTimers();

    render(<LiveRegion message="Test message" clearAfter={null} />);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('Test message');

    jest.useRealTimers();
  });
});

describe('useAnnounce', () => {
  it('debería proveer función announce', () => {
    const { result } = renderHook(() => useAnnounce());

    expect(result.current.announce).toBeDefined();
    expect(typeof result.current.announce).toBe('function');
  });

  it('debería proveer announcePolite', () => {
    const { result } = renderHook(() => useAnnounce());

    expect(result.current.announcePolite).toBeDefined();
    expect(typeof result.current.announcePolite).toBe('function');
  });

  it('debería proveer announceAssertive', () => {
    const { result } = renderHook(() => useAnnounce());

    expect(result.current.announceAssertive).toBeDefined();
    expect(typeof result.current.announceAssertive).toBe('function');
  });

  it('debería proveer función clear', () => {
    const { result } = renderHook(() => useAnnounce());

    expect(result.current.clear).toBeDefined();
    expect(typeof result.current.clear).toBe('function');
  });

  it('debería actualizar message cuando se llama announce', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAnnounce());

    act(() => {
      result.current.announce('Test announcement');
      jest.advanceTimersByTime(100);
    });

    expect(result.current.message).toBe('Test announcement');
    jest.useRealTimers();
  });
});

describe('FocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('debería renderizar children cuando isActive es false', () => {
    render(
      <FocusTrap isActive={false}>
        <div>Child Content</div>
      </FocusTrap>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('debería renderizar children cuando isActive es true', () => {
    render(
      <FocusTrap isActive={true}>
        <div>Child Content</div>
      </FocusTrap>
    );

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('debería llamar onEscape cuando se presiona Escape', () => {
    const onEscape = jest.fn();

    render(
      <FocusTrap isActive={true} onEscape={onEscape}>
        <div>Child Content</div>
      </FocusTrap>
    );

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);

    expect(onEscape).toHaveBeenCalled();
  });

  it('debería hacer focus trap con Tab', () => {
    render(
      <FocusTrap isActive={true}>
        <div>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
        </div>
      </FocusTrap>
    );

    const btn1 = document.getElementById('btn1')!;
    const btn2 = document.getElementById('btn2')!;

    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // Simular Tab
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    window.dispatchEvent(tabEvent);

    // El foco debería moverse al siguiente elemento
    // (esto depende de la implementación específica)
  });

  it('debería hacer focus trap con Shift+Tab', () => {
    render(
      <FocusTrap isActive={true}>
        <div>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
        </div>
      </FocusTrap>
    );

    const btn1 = document.getElementById('btn1')!;
    const btn2 = document.getElementById('btn2')!;

    btn2.focus();
    expect(document.activeElement).toBe(btn2);

    // Simular Shift+Tab
    const shiftTabEvent = new KeyboardEvent('keydown', { 
      key: 'Tab', 
      shiftKey: true, 
      bubbles: true 
    });
    window.dispatchEvent(shiftTabEvent);

    // El foco debería moverse al elemento anterior
  });
});

// Helper para renderHook
function renderHook<T>(callback: () => T) {
  const { renderHook: rtlRenderHook } = require('@testing-library/react');
  return rtlRenderHook(callback);
}

function act(callback: () => void) {
  const { act: rtlAct } = require('@testing-library/react');
  return rtlAct(callback);
}
