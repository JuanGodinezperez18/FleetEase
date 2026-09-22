import { GlobalLoader } from "@/components/common/GlobalLoader";

export default function Loading() {
  // Skeleton de navegación: se muestra al cambiar de módulo mientras Next
  // resuelve la nueva ruta. El splash queda reservado para el primer arranque.
  return <GlobalLoader />;
}
