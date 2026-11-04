import { headers } from 'next/headers';
import RootDocument from '@/components/layout/root-document';

export { metadata, viewport } from '@/components/layout/root-document';
export const dynamic = 'force-dynamic';

export default async function ProtectedRootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <RootDocument nonce={nonce}>{children}</RootDocument>;
}
