
import Image from 'next/image';
import logo from '@/../public/logo.png';

export function FleetEaseLogo({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="FleetEase Logo"
      className={`h-12 w-auto ${className}`}
    />
  );
}
