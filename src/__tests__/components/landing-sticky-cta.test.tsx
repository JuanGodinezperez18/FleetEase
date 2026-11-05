import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LandingStickyCta } from '@/components/landing/landing-sticky-cta';

describe('mobile sticky registration action', () => {
  let intersect: IntersectionObserverCallback;

  beforeEach(() => {
    window.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback; }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver;
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 600 });
    const finalCta = document.createElement('div');
    finalCta.id = 'cta-final';
    document.body.append(finalCta);
  });

  afterEach(() => document.getElementById('cta-final')?.remove());

  it('stays hidden while the final action is visible, including subsequent scrolls', async () => {
    render(<LandingStickyCta />);
    expect(screen.getByRole('link', { name: 'Comenzar gratis' })).toBeInTheDocument();
    act(() => intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Comenzar gratis' })).not.toBeInTheDocument());
    fireEvent.scroll(window);
    expect(screen.queryByRole('link', { name: 'Comenzar gratis' })).not.toBeInTheDocument();
    act(() => intersect([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByRole('link', { name: 'Comenzar gratis' })).toBeInTheDocument();
  });
});
