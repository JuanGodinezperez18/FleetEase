"use client";

import Image from 'next/image';

/**
 * Brand logo rendered from /public so the same asset can be shared by the
 * dashboard, PWA and splash screen without importing a binary at build time.
 */
export function FleetEaseLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="FleetEase Logo"
      width={512}
      height={512}
      className={`h-12 w-auto object-contain ${className ?? ''}`}
    />
  );
}
