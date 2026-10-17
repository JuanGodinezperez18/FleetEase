import { validateUploadFile } from '@/lib/security/validation';

describe('validateUploadFile: MIME genérico de proveedores externos', () => {
  it('normaliza un PDF de Google Drive/Android cuando el navegador informa octet-stream', () => {
    const file = new File(['pdf-content'], 'poliza.pdf', { type: 'application/octet-stream' });

    const result = validateUploadFile(file, ['application/pdf']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.type).toBe('application/pdf');
      expect(result.data.name).toBe('poliza.pdf');
    }
  });

  it('normaliza imágenes con MIME vacío solo si la extensión está permitida', () => {
    const file = new File(['image-content'], 'vehiculo.jpg', { type: '' });

    const result = validateUploadFile(file, ['image/jpeg']);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.type).toBe('image/jpeg');
  });

  it('no permite extensiones desconocidas aunque el proveedor informe MIME genérico', () => {
    const file = new File(['binary-content'], 'payload.exe', { type: 'application/octet-stream' });

    expect(validateUploadFile(file, ['application/pdf', 'image/jpeg']).ok).toBe(false);
  });

  it('no reemplaza un MIME específico que no está permitido por la carpeta', () => {
    const file = new File(['html-content'], 'poliza.pdf', { type: 'text/html' });

    expect(validateUploadFile(file, ['application/pdf']).ok).toBe(false);
  });
});
