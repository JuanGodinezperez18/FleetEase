import Image from 'next/image';

export function FleetEaseLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/web-app-manifest-512x512.png"
      alt="FleetEase Logo"
      width={512}
      height={512}
      className={`h-12 w-auto ${className ?? ''}`}
      priority
    />
  );
}
