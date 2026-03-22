// Web Worker para procesamiento de exports sin bloquear UI
importScripts('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js');

self.onmessage = function(e) {
  const { data, filename, type = 'xlsx' } = e.data;
  
  try {
    console.log(`[Export Worker] Processing ${data.length} records...`);
    
    // Crear workbook
    const wb = XLSX.utils.book_new();
    
    // Procesar datos en chunks para evitar bloqueos
    const CHUNK_SIZE = 1000;
    let processedData = [];
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      processedData = processedData.concat(chunk);
      
      // Reportar progreso
      const progress = Math.min(((i + CHUNK_SIZE) / data.length) * 100, 100);
      self.postMessage({ 
        type: 'progress', 
        progress: Math.round(progress) 
      });
    }
    
    // Crear worksheet
    const ws = XLSX.utils.json_to_sheet(processedData);
    
    // Agregar al workbook
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    
    // Generar buffer
    const buffer = XLSX.write(wb, { 
      bookType: type, 
      type: 'array',
      compression: true 
    });
    
    // Enviar resultado
    self.postMessage({ 
      type: 'complete',
      buffer: buffer, 
      filename: filename,
      mimeType: type === 'csv' 
        ? 'text/csv' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message 
    });
  }
};