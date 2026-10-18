import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
  referrer: 'no-referrer',
};

export default function SharedLinkLayout({ children }: { children: ReactNode }) {
  return children;
}
