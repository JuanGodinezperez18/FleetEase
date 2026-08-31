export default function Loading() {
  // Keep Next.js route-level loading lightweight. Authentication is handled by
  // DashboardLayout; rendering a second global auth loader here can make a
  // route transition look permanently stuck when the layout is still resolving.
  return null;
}
