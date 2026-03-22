#!/usr/bin/env node

/**
 * Script para análisis de bundle size
 * Genera reporte detallado del tamaño del bundle de producción
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUILD_DIR = path.join(__dirname, '..', '.next');
const REPORT_FILE = path.join(__dirname, '..', 'bundle-analysis-report.json');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getSize(bytes) {
  const kb = bytes / 1024;
  const mb = kb / 1024;
  
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  return `${kb.toFixed(2)} KB`;
}

function getSeverity(size) {
  const kb = size / 1024;
  if (kb > 500) return 'critical';
  if (kb > 200) return 'warning';
  return 'ok';
}

function analyzeDirectory(dir, baseDir = dir) {
  const results = [];
  
  if (!fs.existsSync(dir)) {
    return results;
  }

  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'cache') {
        results.push(...analyzeDirectory(filePath, baseDir));
      }
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      const content = fs.readFileSync(filePath);
      const gzipSize = zlib.gzipSync(content).length;
      const brotliSize = zlib.brotliCompressSync(content).length;
      
      const relativePath = path.relative(baseDir, filePath);
      results.push({
        file: relativePath,
        size: stat.size,
        gzipSize,
        brotliSize,
        severity: getSeverity(stat.size),
      });
    }
  }
  
  return results;
}

function generateReport(files) {
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalGzip = files.reduce((sum, f) => sum + f.gzipSize, 0);
  const totalBrotli = files.reduce((sum, f) => sum + f.brotliSize, 0);
  
  const criticalFiles = files.filter(f => f.severity === 'critical');
  const warningFiles = files.filter(f => f.severity === 'warning');
  
  // Agrupar por tipo
  const byType = {
    js: files.filter(f => f.file.endsWith('.js')),
    css: files.filter(f => f.file.endsWith('.css')),
  };
  
  // Top 10 archivos más grandes
  const top10 = [...files].sort((a, b) => b.size - a.size).slice(0, 10);
  
  return {
    summary: {
      totalFiles: files.length,
      totalSize,
      totalGzip,
      totalBrotli,
      criticalFiles: criticalFiles.length,
      warningFiles: warningFiles.length,
    },
    byType: {
      js: {
        count: byType.js.length,
        totalSize: byType.js.reduce((sum, f) => sum + f.size, 0),
      },
      css: {
        count: byType.css.length,
        totalSize: byType.css.reduce((sum, f) => sum + f.size, 0),
      },
    },
    top10Largest: top10,
    criticalFiles,
    warningFiles,
    recommendations: generateRecommendations(criticalFiles, warningFiles, totalSize),
  };
}

function generateRecommendations(critical, warning, totalSize) {
  const recommendations = [];
  
  if (critical.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: `${critical.length} archivos exceden 500KB`,
      suggestion: 'Considerar code splitting o lazy loading para estos archivos',
    });
  }
  
  if (totalSize > 2 * 1024 * 1024) {
    recommendations.push({
      priority: 'HIGH',
      issue: `Bundle total excede 2MB (${getSize(totalSize)})`,
      suggestion: 'Revisar dependencias, eliminar unused code, implementar tree shaking',
    });
  }
  
  if (warning.length > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      issue: `${warning.length} archivos entre 200-500KB`,
      suggestion: 'Optimizar imports, considerar dynamic imports',
    });
  }
  
  return recommendations;
}

function printReport(report) {
  log('\n📊 BUNDLE ANALYSIS REPORT\n', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  log('\n📈 SUMMARY\n', 'blue');
  log(`Total Files: ${report.summary.totalFiles}`);
  log(`Total Size: ${getSize(report.summary.totalSize)}`);
  log(`Gzip Size: ${getSize(report.summary.totalGzip)}`);
  log(`Brotli Size: ${getSize(report.summary.totalBrotli)}`);
  
  if (report.summary.criticalFiles > 0) {
    log(`\n⚠️  Critical Files: ${report.summary.criticalFiles}`, 'red');
  }
  if (report.summary.warningFiles > 0) {
    log(`⚠️  Warning Files: ${report.summary.warningFiles}`, 'yellow');
  }
  
  log('\n📦 BY TYPE\n', 'blue');
  log(`JavaScript: ${report.byType.js.count} files, ${getSize(report.byType.js.totalSize)}`);
  log(`CSS: ${report.byType.css.count} files, ${getSize(report.byType.css.totalSize)}`);
  
  log('\n🔝 TOP 10 LARGEST FILES\n', 'blue');
  report.top10Largest.forEach((file, index) => {
    const severity = file.severity === 'critical' ? colors.red : 
                     file.severity === 'warning' ? colors.yellow : colors.green;
    log(`${index + 1}. ${file.file} - ${severity}${getSize(file.size)}${colors.reset}`);
  });
  
  if (report.recommendations.length > 0) {
    log('\n💡 RECOMMENDATIONS\n', 'blue');
    report.recommendations.forEach((rec, index) => {
      const priorityColor = rec.priority === 'HIGH' ? colors.red : colors.yellow;
      log(`${index + 1}. [${priorityColor}${rec.priority}${colors.reset}] ${rec.issue}`);
      log(`   → ${rec.suggestion}`);
    });
  }
  
  log('\n' + '='.repeat(50), 'cyan');
  log(`\nReport guardado en: bundle-analysis-report.json\n`, 'green');
}

// Main execution
try {
  log('🔍 Analyzing bundle...', 'cyan');
  
  // Verificar si existe el build
  if (!fs.existsSync(BUILD_DIR)) {
    log('❌ Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }
  
  // Analizar archivos
  const files = analyzeDirectory(BUILD_DIR);
  
  if (files.length === 0) {
    log('⚠️  No files found to analyze', 'yellow');
    process.exit(0);
  }
  
  // Generar reporte
  const report = generateReport(files);
  
  // Guardar reporte JSON
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  
  // Imprimir reporte
  printReport(report);
  
  // Exit con error si hay archivos críticos
  if (report.summary.criticalFiles > 0) {
    process.exit(1);
  }
  
} catch (error) {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(1);
}
