/**
 * 🚀 HOOK OPTIMIZADO: useUserProfile
 *
 * Hook para cargar perfil de usuario con React Query (sin onSnapshot)
 *
 * Optimizaciones:
 * - ✅ Usa getDoc en lugar de onSnapshot (reduce lecturas continuas)
 * - ✅ Caché de 10 minutos con React Query
 * - ✅ Invalidación manual cuando se actualiza el perfil
 * - ✅ Carga automática de token claims
 *
 * Ahorro estimado: ~50-200 lecturas/día por usuario
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/types';
import type { User as FirebaseUser } from 'firebase/auth';

export const USER_PROFILE_QUERY_KEY = 'userProfile';

interface UseUserProfileOptions {
  enabled?: boolean;
}

export function useUserProfile(
  firebaseUser: FirebaseUser | null,
  options?: UseUserProfileOptions
) {
  return useQuery({
    queryKey: [USER_PROFILE_QUERY_KEY, firebaseUser?.uid],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!firebaseUser) return null;

      try {
        // Cargar documento de perfil
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          console.log('⚠️ [UserProfile] Documento de usuario no existe');
          return null;
        }

        // Cargar token claims
        const token = await firebaseUser.getIdTokenResult(false); // false = usa caché
        const claims = token.claims;

        const data = snap.data() as Partial<UserProfile>;
        const user: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          name: data.name || firebaseUser.displayName || "Usuario",
          phone: data.phone,
          role: (claims.role as UserRole) || data.role || "client",
          companyId: (claims.companyId as string) || data.companyId,
          partnerAccess: (claims.partnerAccess as string[]) || data.partnerAccess || [],
          isDeleted: data.isDeleted || false,
          notificationSettings: data.notificationSettings,
          createdAt: data.createdAt
        };

        console.log('✅ [UserProfile] Usuario cargado desde Firestore:', {
          uid: user.uid,
          role: user.role,
          companyId: user.companyId
        });

        return user;
      } catch (error) {
        console.error('❌ [UserProfile] Error cargando perfil:', error);
        throw error;
      }
    },
    enabled: !!firebaseUser && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // ✅ 10 minutos - El perfil cambia raramente
    gcTime: 30 * 60 * 1000, // 30 minutos en memoria
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Hook para invalidar el caché del perfil de usuario
 * Usar después de actualizar el perfil
 */
export function useInvalidateUserProfile() {
  const queryClient = useQueryClient();

  return (userId: string) => {
    console.log('🔄 [UserProfile] Invalidando caché para:', userId);
    queryClient.invalidateQueries({ queryKey: [USER_PROFILE_QUERY_KEY, userId] });
  };
}

/**
 * Hook para actualizar el perfil en caché sin refetch
 * Útil para updates optimistas
 */
export function useUpdateUserProfileCache() {
  const queryClient = useQueryClient();

  return (userId: string, updater: (old: UserProfile | null) => UserProfile | null) => {
    queryClient.setQueryData([USER_PROFILE_QUERY_KEY, userId], updater);
  };
}
