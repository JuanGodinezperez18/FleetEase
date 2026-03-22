
import { FleetEaseLogo } from '@/components/icons/fleet-ease-logo';

export function AppTitle({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FleetEaseLogo />
      <span className="text-xl font-bold">FleetEase</span>
    </div>
  );
}
