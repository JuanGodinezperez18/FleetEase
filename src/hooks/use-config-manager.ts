
"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// Placeholder for what the system configuration might look like.
// In a real app, this would be fetched from a secure source.
const mockSystemConfig = {
    appName: "FleetEase Pro",
    theme: "system",
    notificationSettings: {
        maintenanceThreshold: 1500,
        insuranceThreshold: 30,
        licenseThreshold: 30,
    },
    securityPolicies: {
        passwordMinLength: 8,
        enforceMFA: false,
    },
    version: "1.0.0",
};

/**
 * A mock hook to manage system configuration actions like import, export, and reset.
 * In a real-world scenario, this would interact with a secure backend service
 * to manage sensitive configuration data.
 */
export const useConfigManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // --- EXPORT CONFIGURATION ---
  const exportConfiguration = useCallback(() => {
    setIsProcessing(true);
    const toastId = toast.loading("Exportando configuración...");

    // Simulate async operation
    setTimeout(() => {
      try {
        const configToExport = {
          ...mockSystemConfig,
          exportDate: new Date().toISOString(),
        };
        const configBlob = new Blob([JSON.stringify(configToExport, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(configBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleetease_config_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Configuración Exportada", {
            id: toastId,
            description: "El archivo JSON se ha descargado correctamente.",
        });

      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Error al Exportar", {
            id: toastId,
            description: "No se pudo generar el archivo de configuración.",
        });
      } finally {
        setIsProcessing(false);
      }
    }, 1000);
  }, []);

  // --- IMPORT CONFIGURATION ---
  const importConfiguration = useCallback((file: File) => {
    setIsProcessing(true);
    const toastId = toast.loading("Importando configuración...");

    const reader = new FileReader();
    reader.onload = (e) => {
        // Simulate async processing
        setTimeout(() => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') {
                    throw new Error("El archivo no es válido.");
                }
                const newConfig = JSON.parse(content);
                
                // --- VALIDATION (EXAMPLE) ---
                if (!newConfig.appName || !newConfig.version) {
                    throw new Error("El archivo de configuración tiene un formato incorrecto.");
                }
                if (newConfig.appName !== "FleetEase Pro") {
                    throw new Error("Este archivo no parece ser una configuración de FleetEase Pro.");
                }

                console.log("Simulating applying new configuration:", newConfig);

                toast.success("Configuración Importada", {
                    id: toastId,
                    description: "La configuración se ha aplicado (simulado).",
                });
            } catch (error) {
                console.error("Import failed:", error);
                 toast.error("Error al Importar", {
                    id: toastId,
                    description: error instanceof Error ? error.message : "El archivo no pudo ser procesado.",
                });
            } finally {
                setIsProcessing(false);
            }
        }, 1500);
    };

    reader.onerror = () => {
        toast.error("Error al leer el archivo.", { id: toastId });
        setIsProcessing(false);
    };

    reader.readAsText(file);
  }, []);

  // --- RESET TO DEFAULTS ---
  const resetToDefaults = useCallback(() => {
    const userInput = window.prompt(
      'Esta acción restaurará la configuración por defecto. Esto no se puede deshacer.\n\nEscribe "RESET" para confirmar.'
    );
    
    if (userInput !== 'RESET') {
      toast.info('Operación cancelada');
      return;
    }
    
    setIsProcessing(true);
    const toastId = toast.loading("Restaurando configuración...");

    setTimeout(() => {
      console.log("Simulating reset to default configuration...");
      toast.success("Configuración Restaurada", {
          id: toastId,
          description: "El sistema ha vuelto a sus valores por defecto (simulado)."
      });
      setIsProcessing(false);
    }, 1500);
  }, []);

  return {
    isProcessing,
    exportConfiguration,
    importConfiguration,
    resetToDefaults,
  };
};
