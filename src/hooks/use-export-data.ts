
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ExportOptions {
  filename: string;
  type?: 'xlsx' | 'csv' | 'pdf';
  showProgress?: boolean;
  includeBalance?: boolean;
  includeVehicles?: boolean;
}

export const useExportData = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportToExcel = useCallback(async (
    data: any[], 
    options: ExportOptions
  ) => {
    if (!data || data.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    setIsExporting(true);
    setProgress(0);

    try {
      // Verificar soporte de Web Worker
      if (!window.Worker) {
        throw new Error("Web Workers no soportados en este navegador");
      }

      const worker = new Worker('/export-worker.js');
      
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("Export timeout - datos demasiado grandes"));
        }, 60000); // 1 minuto timeout

        worker.onmessage = (e) => {
          const { type, progress: workerProgress, buffer, filename, mimeType, error } = e.data;
          
          switch (type) {
            case 'progress':
              setProgress(workerProgress);
              if (options.showProgress) {
                toast.loading(`Exportando... ${workerProgress}%`, {
                  id: 'export-progress'
                });
              }
              break;
              
            case 'complete':
              clearTimeout(timeout);
              
              // Crear blob y descargar
              const blob = new Blob([buffer], { type: mimeType });
              const url = URL.createObjectURL(blob);
              
              const link = document.createElement('a');
              link.href = url;
              link.download = `${filename}.${options.type || 'xlsx'}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              URL.revokeObjectURL(url);
              worker.terminate();
              
              toast.dismiss('export-progress');
              toast.success(`Archivo ${filename} descargado exitosamente`);
              
              setIsExporting(false);
              setProgress(0);
              resolve();
              break;
              
            case 'error':
              clearTimeout(timeout);
              worker.terminate();
              
              toast.dismiss('export-progress');
              toast.error(`Error exportando: ${error}`);
              
              setIsExporting(false);
              setProgress(0);
              reject(new Error(error));
              break;
          }
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          worker.terminate();
          
          toast.dismiss('export-progress');
          toast.error("Error en Web Worker");
          
          setIsExporting(false);
          setProgress(0);
          reject(error);
        };

        // Enviar datos al worker
        worker.postMessage({
          data,
          filename: options.filename,
          type: options.type || 'xlsx'
        });
      });

    } catch (error) {
      console.error('Export error:', error);
      
      // Fallback a método síncrono
      toast.warning("Usando método de export alternativo...");
      await exportSynchronous(data, options);
      
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, []);

  // Método fallback síncrono
  const exportSynchronous = async (data: any[], options: ExportOptions) => {
    const XLSX = await import('xlsx');
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    
    XLSX.writeFile(workbook, `${options.filename}.${options.type || 'xlsx'}`);
    
    toast.success("Archivo exportado exitosamente");
  };

  return {
    exportToExcel,
    isExporting,
    progress
  };
};
