import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LandingProductShowcase } from '@/components/landing/landing-product-showcase';

beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

describe('landing product explorer', () => {
  it('shows one product view and switches to the selected category', async () => {
    const user = userEvent.setup();
    render(<LandingProductShowcase />);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'La operación de cada vehículo' })).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Finanzas' }));
    expect(screen.getByRole('tab', { name: 'Finanzas' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Los números de tu flotilla' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'La operación de cada vehículo' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ampliar captura/ })).toHaveAttribute('href', '/media/landing/product-finance.webp');
    expect(screen.getByRole('link', { name: 'Ver todas las funciones' })).toHaveAttribute('href', '/funciones');
  });

  it('supports arrow-key selection without a pointer', async () => {
    const user = userEvent.setup();
    render(<LandingProductShowcase />);
    screen.getByRole('tab', { name: 'Operación' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Finanzas' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Finanzas' })).toHaveAttribute('aria-selected', 'true');
  });
});
