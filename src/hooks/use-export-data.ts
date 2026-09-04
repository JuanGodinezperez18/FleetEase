'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'png';

export interface ExportOptions {
  filename: string;
  type?: ExportFormat;
  showProgress?: boolean;
  includeBalance?: boolean;
  includeVehicles?: boolean;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv;charset=utf-8',
  pdf: 'application/pdf',
  png: 'image/png',
};

const downloadBlob = (blob: Blob, filename: string, type: ExportFormat) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${type}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const normalizeRows = (data: unknown[]): Record<string, unknown>[] =>
  data.map((row) => (row && typeof row === 'object' ? row as Record<string, unknown> : { value: row }));

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const createDesignedPng = async (data: unknown[], filename: string): Promise<void> => {
  const rows = normalizeRows(data);
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 10);
  const visibleRows = rows.slice(0, 100);
  const width = 1800;
  const rowHeight = 44;
  const headerHeight = 150;
  const tableHeaderHeight = 54;
  const footerHeight = 56;
  const height = Math.max(360, headerHeight + tableHeaderHeight + visibleRows.length * rowHeight + footerHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No fue posible crear el lienzo de exportación.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#111827';
  ctx.font = '700 34px Arial';
  ctx.fillText(filename.replace(/[-_]+/g, ' '), 70, 58);
  ctx.fillStyle = '#6b7280';
  ctx.font = '18px Arial';
  ctx.fillText(`Reporte generado el ${new Date().toLocaleString('es-MX')}`, 70, 92);
  ctx.fillText(`${rows.length} registro${rows.length === 1 ? '' : 's'} · formato PNG diseñado`, 70, 120);

  const tableX = 50;
  const tableY = headerHeight;
  const tableWidth = width - 100;
  const columnWidth = tableWidth / Math.max(columns.length, 1);

  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(tableX, tableY, tableWidth, tableHeaderHeight);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.strokeRect(tableX, tableY, tableWidth, tableHeaderHeight + visibleRows.length * rowHeight);

  ctx.font = '700 17px Arial';
  ctx.fillStyle = '#111827';
  columns.forEach((column, index) => {
    const x = tableX + index * columnWidth;
    ctx.fillText(column.slice(0, 24), x + 14, tableY + 34);
    ctx.beginPath();
    ctx.moveTo(x, tableY);
    ctx.lineTo(x, tableY + tableHeaderHeight + visibleRows.length * rowHeight);
    ctx.stroke();
  });

  ctx.font = '16px Arial';
  visibleRows.forEach((row, rowIndex) => {
    const y = tableY + tableHeaderHeight + rowIndex * rowHeight;
    if (rowIndex % 2 === 1) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(tableX, y, tableWidth, rowHeight);
    }
    ctx.fillStyle = '#374151';
    columns.forEach((column, columnIndex) => {
      const text = formatCell(row[column]).slice(0, 30);
      ctx.fillText(text, tableX + columnIndex * columnWidth + 14, y + 28);
    });
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(tableX, y + rowHeight);
    ctx.lineTo(tableX + tableWidth, y + rowHeight);
    ctx.stroke();
  });

  ctx.fillStyle = '#6b7280';
  ctx.font = '14px Arial';
  const footer = rows.length > visibleRows.length
    ? `Vista de imagen: ${visibleRows.length} de ${rows.length} registros. Para el conjunto completo usa Excel o PDF.`
    : 'FleetEase · Exportación visual generada a partir de datos, no una captura de pantalla.';
  ctx.fillText(footer, 70, height - 20);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, MIME_TYPES.png));
  if (!blob) throw new Error('No fue posible generar la imagen.');
  downloadBlob(blob, filename, 'png');
};

const createDesignedPdf = async (data: unknown[], filename: string): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const rows = normalizeRows(data);
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 12);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(filename.replace(/[-_]+/g, ' '), 40, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`FleetEase · ${new Date().toLocaleString('es-MX')} · ${rows.length} registros`, 40, 60);

  autoTable(doc, {
    startY: 78,
    head: [columns.map((column) => column)],
    body: rows.map((row) => columns.map((column) => formatCell(row[column]))),
    styles: { fontSize: 7, cellPadding: 5, overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 40, right: 40 },
    didDrawPage: (page) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`FleetEase · Página ${page.pageNumber}`, 40, pageHeight - 20);
    },
  });

  downloadBlob(doc.output('blob'), filename, 'pdf');
};

export const useExportData = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const exportToExcel = useCallback(async (data: unknown[], options: ExportOptions) => {
    if (!data || data.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const type = options.type || 'xlsx';
    setIsExporting(true);
    setProgress(0);

    try {
      if (type === 'pdf') {
        setProgress(30);
        await createDesignedPdf(data, options.filename);
        setProgress(100);
      } else if (type === 'png') {
        setProgress(30);
        await createDesignedPng(data, options.filename);
        setProgress(100);
      } else {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet(normalizeRows(data));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
        const output = XLSX.write(workbook, { bookType: type, type: 'array', compression: true });
        downloadBlob(new Blob([output], { type: MIME_TYPES[type] }), options.filename, type);
        setProgress(100);
      }

      toast.success(`Archivo ${options.filename}.${type} generado correctamente`);
    } catch (error) {
      console.error('[Export] Error:', error);
      toast.error('No se pudo generar la exportación', {
        description: error instanceof Error ? error.message : 'Error inesperado.',
      });
      throw error;
    } finally {
      setIsExporting(false);
      setProgress(0);
    }
  }, []);

  return {
    exportToExcel,
    isExporting,
    progress,
  };
};
