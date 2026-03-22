
"use client";

import { useMemo } from 'react';
import { useData } from './use-data';
import { useFinancialAnalytics } from './use-financial-analytics';
import { useClientAnalytics } from './use-client-analytics';
import { useVehicleAnalytics } from './use-vehicle-analytics';
import { useNotificationsAnalytics } from './use-notifications-analytics';
import type { FinancialAnalytics } from './use-financial-analytics';


interface Insight {
    title: string;
    description: string;
    impact: 'Alto' | 'Medio' | 'Bajo';
    type: 'Opportunity' | 'Risk' | 'Finding';
}

// ✅ CORRECCIÓN: Definir un tipo para los valores por defecto que coincida con FinancialAnalytics
type DefaultFinancials = Omit<FinancialAnalytics, 'monthlyGrowth' | 'cashFlowAnalysis' | 'expenseCategories' | 'incomeCategories' | 'topClients' | 'topVehicles' | 'profitabilityAnalysis'> & {
  monthlyGrowth: { income: number; profit: number; expenses: number };
  cashFlowAnalysis: [];
  expenseCategories: [];
  incomeCategories: [];
  topClients: [];
  topVehicles: [];
  profitabilityAnalysis: [];
};


/**
 * A centralized analytics hook that provides a high-level overview of the entire business.
 * It consumes other specialized analytics hooks to aggregate key metrics.
 */
export const useDashboardAnalytics = () => {
  const { 
    vehicles = [],
    clients = [],
    financialRecords = [],
    partners = [],
    loadingData,
    notifications = [],
    clientBalances = []
  } = useData() || {}; // ✅ Añadir un objeto vacío como fallback

  // Consume specialized hooks
  const financial = useFinancialAnalytics(financialRecords, clients, vehicles, partners);
  const { clientMetrics = [] } = useClientAnalytics(clients, financialRecords, vehicles) || {};
  const { vehicleMetrics = [] } = useVehicleAnalytics(vehicles, financialRecords, []) || {};
  
  const { analyzedNotifications = [] } = useNotificationsAnalytics(
    notifications,
    clients,
    vehicles,
    partners,
    financialRecords,
    clientBalances
  ) || {};


  // Derive high-level metrics from the consumed hooks
  const { insights, ...currentMetrics} = useMemo(() => {
    // ✅ CORRECCIÓN: Manejar el caso de carga o datos faltantes
    if (loadingData || !clientMetrics || !vehicleMetrics || !analyzedNotifications) {
        const defaultReturn = {
            insights: [],
            businessHealthScore: 0,
            healthScoreBreakdown: { financial: 0, operations: 0, clients: 0 },
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
            profitMargin: 0,
            avgRevenuePerVehicle: 0,
            avgRevenuePerClient: 0,
            activeVehicles: 0,
            totalVehicles: 0,
            activeClients: 0,
            vehicleUtilizationRate: 0,
            fleetValue: 0,
            highRiskClients: 0,
            overdueMaintenances: 0,
            criticalAlerts: 0,
            atRiskClients: 0,
        };
        // ✅ CORRECCIÓN: Añadir 'financial' al objeto de retorno
        return { ...defaultReturn, financial };
    }
      
    const operationalVehicles = vehicles.filter(v => v.status !== 'sold' && !v.isDeleted);
    const activeClientsList = clients.filter(c => c.status === 'active' && !c.isDeleted);
    
    const activeVehiclesCount = operationalVehicles.filter(v => v.status === 'rented').length;

    const { totalIncome, netProfit, profitMargin } = financial;
    const avgRevenuePerVehicle = operationalVehicles.length > 0 ? totalIncome / operationalVehicles.length : 0;
    const avgRevenuePerClient = activeClientsList.length > 0 ? totalIncome / activeClientsList.length : 0;

    const vehicleUtilizationRate = operationalVehicles.length > 0 ? (activeVehiclesCount / operationalVehicles.length) * 100 : 0;
    const fleetValue = operationalVehicles.reduce((sum, v) => sum + (v.cost || 0), 0);

    const highRiskClients = clientMetrics.filter(cm => cm.currentBalance > 6000).length;
    const atRiskClients = clientMetrics.filter(cm => cm.activityLevel === 'Inactivo' && cm.currentBalance > 0).length;
    const overdueMaintenances = vehicleMetrics.filter(vm => (vm.kmToNextMaintenance ?? 0) <= 0).length;
    const criticalAlerts = analyzedNotifications.filter(n => n.priority === 'Crítica').length;

    // --- Business Health Score Breakdown (out of 100) ---
    // Financial Health (40 points): Based on profit margin. 100% at 25% margin.
    const financialScore = Math.max(0, Math.min(40, (profitMargin / 25) * 40));

    // Operations Health (30 points): Based on fleet utilization and maintenance status.
    const utilizationSubScore = (vehicleUtilizationRate / 100) * 15; // 15 points
    const maintPenalty = Math.min(15, overdueMaintenances * 5); // 5 points penalty per overdue vehicle
    const maintenanceSubScore = Math.max(0, 15 - maintPenalty); // 15 points
    const operationsScore = utilizationSubScore + maintenanceSubScore;

    // Client/Risk Health (30 points): Based on client risk factors.
    const clientRiskPenalty = Math.min(30, (highRiskClients * 5) + (atRiskClients * 10)); // Heavier penalty for at-risk clients
    const clientScore = Math.max(0, 30 - clientRiskPenalty);
    
    const businessHealthScore = Math.round(financialScore + operationsScore + clientScore);

    const healthScoreBreakdown = {
        financial: Math.round(financialScore),
        operations: Math.round(operationsScore),
        clients: Math.round(clientScore),
    };
    
    // --- Automated Insights Generation ---
    const insights: Insight[] = [];

    if (profitMargin > 20) {
        insights.push({ 
            title: 'Excelente Margen de Beneficio', 
            description: `Con un ${profitMargin.toFixed(1)}% de margen, hay una fuerte capacidad para reinversión.`,
            impact: 'Alto',
            type: 'Opportunity'
        });
    }
    
    if (vehicleUtilizationRate < 50 && operationalVehicles.length > 0) {
        insights.push({
            title: 'Baja Utilización de Flota',
            description: `La flota está utilizada al ${vehicleUtilizationRate.toFixed(1)}%. Existe una oportunidad para aumentar la ocupación o reducir la flota inactiva.`,
            impact: 'Medio',
            type: 'Risk'
        });
    }

    if (highRiskClients > 5) {
        insights.push({
            title: 'Elevado Número de Clientes de Alto Riesgo',
            description: `${highRiskClients} clientes tienen un comportamiento de pago pobre o crítico, lo que representa un riesgo para el flujo de caja.`,
            impact: 'Alto',
            type: 'Risk'
        });
    }
    
    if (atRiskClients > 0) {
        insights.push({
            title: 'Clientes en Riesgo de Abandono',
            description: `${atRiskClients} cliente(s) con deuda están inactivos por más de 30 días. Se recomienda iniciar acciones de cobranza.`,
            impact: 'Alto',
            type: 'Risk'
        });
    }

     if (overdueMaintenances > 2) {
        insights.push({
            title: 'Mantenimientos Vencidos',
            description: `${overdueMaintenances} vehículos han superado su kilometraje de servicio, aumentando el riesgo de fallas costosas.`,
            impact: 'Alto',
            type: 'Risk'
        });
    }
    
    if (financial.monthlyGrowth.profit > 10) {
        insights.push({
            title: 'Fuerte Crecimiento en Beneficios',
            description: `El beneficio ha crecido un ${financial.monthlyGrowth.profit.toFixed(1)}% este mes. Analizar los impulsores de este crecimiento.`,
            impact: 'Alto',
            type: 'Finding'
        })
    }


    return {
      // Financial
      totalRevenue: totalIncome,
      totalExpenses: financial.totalExpenses,
      netProfit,
      profitMargin,
      avgRevenuePerVehicle,
      avgRevenuePerClient,

      // Operational
      activeVehicles: activeVehiclesCount,
      totalVehicles: operationalVehicles.length,
      activeClients: activeClientsList.length,
      vehicleUtilizationRate,
      fleetValue,
      
      // Risk
      highRiskClients,
      overdueMaintenances,
      criticalAlerts,
      atRiskClients,

      // Overall Score
      businessHealthScore,
      healthScoreBreakdown,
      
      // Insights
      insights,
      // ✅ CORRECCIÓN: Asegurarse de devolver el objeto 'financial' completo
      financial,
    };
  }, [
    loadingData,
    financial,
    clientMetrics,
    vehicleMetrics,
    analyzedNotifications,
    vehicles,
    clients,
  ]);

  // ✅ CORRECCIÓN: Devolver 'financial' junto con los demás datos
  return { ...currentMetrics, insights, financial, analyzedNotifications };
};
