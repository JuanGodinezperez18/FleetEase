
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  FileSpreadsheet,
  FileText,
  File,
  Download,
  Loader2,
} from 'lucide-react';
import type { Client, ClientWithMetrics } from '@/types';
import type { ExportOptions } from '@/hooks/use-export-data';

type ExportFormat = 'xlsx' | 'csv' | 'pdf';

interface ExportDialogProps {
  clients: ClientWithMetrics[];
  balances?: Record<string, number>;
  onExport: (options: ExportOptions) => void;
  onExportTemplate: () => void;
  isExporting?: boolean;
  children: React.ReactNode;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  clients,
  balances = {},
  onExport,
  onExportTemplate,
  isExporting = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeVehicles, setIncludeVehicles] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(false); // Placeholder for future use

  const formatOptions = [
    {
      value: 'xlsx' as ExportFormat,
      label: 'Excel (.xlsx)',
      description: 'Ideal para análisis detallado y reportes.',
      icon: FileSpreadsheet,
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      description: 'Formato simple, compatible universalmente.',
      icon: File,
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      description: 'Perfecto para compartir e imprimir.',
      icon: FileText,
    },
  ];

  const handleExport = () => {
    onExport({
      type: format,
      includeBalance,
      includeVehicles,
      filename: `clientes_${new Date().toISOString().split('T')[0]}`
    });
  };
  
  const handleCheckedChange = (setter: React.Dispatch<React.SetStateAction<boolean>>) => (checked: boolean | 'indeterminate') => {
      if(typeof checked === 'boolean') {
          setter(checked);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Datos de Clientes</DialogTitle>
          <DialogDescription>
            Configura las opciones para exportar {clients.length} cliente
            {clients.length !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formato de Archivo</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
                className="space-y-4"
              >
                {formatOptions.map((option) => (
                   <Label key={option.value} htmlFor={option.value} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-accent/50 cursor-pointer">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <option.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido a Incluir</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                    <Checkbox id="include-balance" checked={includeBalance} onCheckedChange={handleCheckedChange(setIncludeBalance)} />
                    <Label htmlFor="include-balance" className="cursor-pointer">Incluir información de balance</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="include-vehicles" checked={includeVehicles} onCheckedChange={handleCheckedChange(setIncludeVehicles)} />
                    <Label htmlFor="include-vehicles" className="cursor-pointer">Incluir vehículos asignados</Label>
                </div>
                 <div className="flex items-center space-x-2">
                    <Checkbox id="include-documents" checked={includeDocuments} onCheckedChange={handleCheckedChange(setIncludeDocuments)} disabled />
                    <Label htmlFor="include-documents" className="text-muted-foreground cursor-not-allowed">Incluir estado de documentos (Próximamente)</Label>
                </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar Datos
            </Button>
            <Button variant="outline" onClick={onExportTemplate} className="w-full">
              Descargar Plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
