/**
 * @fileoverview Tests para componentes React
 * 
 * Nota: Estos tests son ejemplos básicos. Para ejecutarlos:
 * 1. Instalar dependencias: npm install -D @testing-library/react @testing-library/jest-dom
 * 2. Ejecutar: npm run test
 */

import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Components', () => {
  describe('Button', () => {
    it('debería renderizar el botón con el texto correcto', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('debería estar deshabilitado cuando se pasa disabled', () => {
      render(<Button disabled>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeDisabled();
    });

    it('debería mostrar estado de loading', () => {
      render(<Button loading>Cargando</Button>);
      const button = screen.getByRole('button', { name: /cargando/i });
      expect(button).toHaveAttribute('disabled');
    });

    it('debería llamar al onClick cuando se hace click', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      screen.getByRole('button', { name: /click me/i }).click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('debería soportar diferentes variantes', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');

      rerender(<Button variant="destructive">Destructive</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');

      rerender(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toHaveClass('border');
    });

    it('debería soportar diferentes tamaños', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-9');

      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11');
    });
  });
});
