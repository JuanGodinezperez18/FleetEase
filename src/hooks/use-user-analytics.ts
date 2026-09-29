
"use client";

import { useMemo, useRef } from 'react';
import type { UserProfile, FinancialRecord } from '@/types';

type PermissionLevel = 'Acceso Total' | 'Acceso de Edición' | 'Acceso Limitado';

export type UserMetric = {
  userId: string;
  
  // Activity & Engagement
  activityLevel: 'Alto' | 'Medio' | 'Bajo' | 'Inactivo';
  recordsCreated: number;

  // Permissions & Access
  permissionLevel: PermissionLevel;

  // Risk & Security
  riskLevel: 'Alto' | 'Medio' | 'Bajo';
  alerts: string[];
};

const useMemoDeep = <T,>(factory: () => T, deps: any[]): T => {
    const ref = useRef<{ deps: any[], value: T } | undefined>(undefined);
    const depsString = JSON.stringify(deps);

    if (!ref.current || JSON.stringify(ref.current.deps) !== depsString) {
      ref.current = { deps, value: factory() };
    }

    return ref.current.value;
};

/**
 * NOTE: This is a foundational version of the hook.
 * True activity requires event/audit logging, which is not available.
 * This hook uses a proxy metric for activity.
 */
export const useUserAnalytics = (
  users: UserProfile[],
  financialRecords: FinancialRecord[],
) => {

  const userMetrics: UserMetric[] = useMemoDeep(() => {
    if (!users.length) {
      return [];
    }

    // A more realistic proxy for "actions" could be a count of all records created.
    // However, without a `createdBy` field, we can only filter by company.
    // This is still a weak proxy but better than nothing.
    const recordsPerCompany = financialRecords.reduce((acc, record) => {
        if (record.companyId) {
            acc[record.companyId] = (acc[record.companyId] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);


    return users.map(user => {
      // --- Permission Level & Risk ---
      let permissionLevel: PermissionLevel;
      let riskLevel: UserMetric['riskLevel'];
      
      switch (user.role) {
        case 'superAdmin':
          permissionLevel = 'Acceso Total';
          riskLevel = 'Alto';
          break;
        case 'admin':
          permissionLevel = 'Acceso Total';
          riskLevel = 'Alto';
          break;
        case 'editor':
          permissionLevel = 'Acceso de Edición';
          riskLevel = 'Medio';
          break;
        case 'viewer':
        default:
          permissionLevel = 'Acceso Limitado';
          riskLevel = 'Bajo';
          break;
      }
      
      // --- Activity (Proxy) ---
      let recordsCreated = 0;
      if (user.role === 'superAdmin') {
          recordsCreated = financialRecords.length;
      } else if (user.companyId) {
          recordsCreated = recordsPerCompany[user.companyId] || 0;
      }

      let activityLevel: UserMetric['activityLevel'] = 'Bajo';
      if (user.isDeleted) {
        activityLevel = 'Inactivo';
      } else if (recordsCreated > 50) {
        activityLevel = 'Alto';
      } else if (recordsCreated > 10) {
        activityLevel = 'Medio';
      }


      // --- Alerts ---
      const alerts: string[] = [];
      if (user.isDeleted) {
          alerts.push("Usuario desactivado");
      }
      if ((user.role === 'admin' || user.role === 'superAdmin') && activityLevel === 'Inactivo') {
          alerts.push("Cuenta de administrador inactiva, posible riesgo de seguridad.");
      }


      return {
        userId: user.uid,
        activityLevel,
        recordsCreated,
        permissionLevel,
        riskLevel,
        alerts,
      };
    });

  }, [users, financialRecords]);

  return { userMetrics };
};
