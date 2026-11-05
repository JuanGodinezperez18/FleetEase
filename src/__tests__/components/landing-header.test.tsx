import { render } from '@testing-library/react';
import { LandingHeader } from '@/components/landing/landing-header';

jest.mock('next/image', () => ({ __esModule: true, default: () => <span /> }));

it('honors an incoming section link after public content mounts', () => {
  window.history.replaceState({}, '', '/#pricing');
  const scroll = jest.fn();
  const target = document.createElement('section');
  target.id = 'pricing';
  target.scrollIntoView = scroll;
  document.body.append(target);
  try {
    render(<LandingHeader />);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  } finally {
    target.remove();
    window.history.replaceState({}, '', '/');
  }
});
