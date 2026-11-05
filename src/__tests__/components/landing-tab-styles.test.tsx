import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { LandingProductShowcase } from '@/components/landing/landing-product-showcase';

it('does not apply dark CTA ink to an inactive product tab', () => {
  const style = document.createElement('style');
  style.textContent = 'button { color: inherit; }' + fs.readFileSync(path.join(process.cwd(), 'src/app/landing-text.css'), 'utf8');
  document.head.append(style);
  try {
    render(<div className="fe-landing"><LandingProductShowcase /></div>);
    expect(getComputedStyle(screen.getByRole('tab', { name: 'Finanzas' })).color).not.toBe('rgb(8, 10, 15)');
  } finally {
    style.remove();
  }
});
