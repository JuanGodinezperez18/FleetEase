
"use client";

import { useMemo, useRef } from 'react';
import type { UserProfile, FinancialCategory, Company, FinancialRecord } from '@/types';
import { useData } from './use-data';

export type SystemHealthMetric = {
  // Health Scores (0-100)
  overallHealthScore: number;
  securityScore: number;
  maintenanceScore: number;
  configurationScore: number;
  
  // Component-specific Health
  usersHealth: {
    totalUsers: number;
    inactiveAdmins: number;
    inactiveUsers: number;
  };
  categoriesHealth: {
    totalCategories: number;
    unusedCategories: number;
  };
  companiesHealth: {
    totalCompanies: number;
    companiesWithoutContract: number;
  };

  // Actionable Insights
  alerts: string[];
  recommendations: string[];
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
 * Analyzes the overall health of the system based on configuration, usage, and security posture.
 * This is a foundational version that can be expanded as more data points (e.g., audit logs) become available.
 */
export const useSystemSettingsAnalytics = () => {
  const { users, financialCategories, companies, financialRecords } = useData();

  const systemHealthMetrics = useMemoDeep(() => {
    // --- User Health ---
    const totalUsers = users ? users.length : 0;
    const inactiveUsers = users ? users.filter(u => u.isDeleted).length : 0;
    const inactiveAdmins = users ? users.filter(u => u.isDeleted && (u.role === 'admin' || u.role === 'superAdmin')).length : 0;
    
    // User score: 100 is perfect. Penalize for inactive admins.
    const userScore = Math.max(0, 100 - (inactiveAdmins * 20));

    // --- Category Health ---
    const totalCategories = financialCategories ? financialCategories.length : 0;
    const usedCategoryNames = new Set(financialRecords.map(r => r.category));
    const unusedCategories = financialCategories ? financialCategories.filter(c => !c.isDefault && !usedCategoryNames.has(c.name)).length : 0;
    
    // Category score: 100 is perfect. Penalize for each unused custom category.
    const categoryScore = Math.max(0, 100 - (unusedCategories * 10));
    
    // --- Company Configuration Health ---
    const totalCompanies = companies ? companies.filter(c => !c.isDeleted).length : 0;
    const companiesWithoutContract = companies ? companies.filter(c => !c.isDeleted && !c.contractTemplateUrl).length : 0;
    
    // Configuration score: 100 is perfect. Penalize for each company missing a contract.
    const configScore = totalCompanies > 0 ? ((totalCompanies - companiesWithoutContract) / totalCompanies) * 100 : 100;

    // --- Overall Scores & Recommendations ---
    const maintenanceScore = categoryScore; // Maintenance is currently just about category hygiene
    const securityScore = userScore; // Security is currently just about user status
    
    const overallHealthScore = Math.round(
      (securityScore * 0.4) + 
      (maintenanceScore * 0.3) + 
      (configScore * 0.3)
    );

    const alerts: string[] = [];
    const recommendations: string[] = [];

    if (inactiveAdmins > 0) {
      alerts.push(`${inactiveAdmins} cuenta(s) de administrador está(n) inactiva(s).`);
      recommendations.push("Revisar y eliminar cuentas de administrador que ya no se necesiten para reducir riesgos de seguridad.");
    }
    if (unusedCategories > 0) {
      alerts.push(`${unusedCategories} categoría(s) financiera(s) no se está(n) utilizando.`);
      recommendations.push("Depurar categorías no utilizadas para simplificar la entrada de datos y mejorar la consistencia.");
    }
     if (companiesWithoutContract > 0) {
      alerts.push(`${companiesWithoutContract} empresa(s) no tiene(n) una plantilla de contrato.`);
      recommendations.push("Subir plantillas de contrato para estandarizar y agilizar la creación de nuevos acuerdos.");
    }

    return {
      overallHealthScore,
      securityScore,
      maintenanceScore,
      configurationScore: Math.round(configScore),
      usersHealth: {
        totalUsers,
        inactiveAdmins,
        inactiveUsers,
      },
      categoriesHealth: {
        totalCategories,
        unusedCategories,
      },
      companiesHealth: {
        totalCompanies,
        companiesWithoutContract
      },
      alerts,
      recommendations,
    };
  }, [users, financialCategories, companies, financialRecords]);

  return { systemHealthMetrics };
};
