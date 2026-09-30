// Exports for Reports Module

export {
  PDFReportGenerator,
  generatePDFReport,
  downloadPDF,
  type ReportData,
  type ReportKpi,
  type KpiFormat,
} from './pdf-generator';

export {
  ExcelReportGenerator,
  generateExcelReport,
  downloadExcel,
} from './excel-generator';

export {
  ReportAnalyticsService,
  type VehicleMetric,
  type ClientMetric,
  type PartnerMetric,
} from './analytics-service';
