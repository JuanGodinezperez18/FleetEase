jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/security/api-error', () => ({
  validationError: (message: unknown) => ({
    status: 400,
    json: async () => ({
      error: typeof message === 'string' ? message : 'validation error',
    }),
  }),
}));

import {
  materializeProviderFile,
  normalizeProviderFileMime,
  validateUploadFile,
} from '@/lib/security/validation';

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

  it('normaliza application/download y application/x-msdownload por extensión', () => {
    const file = new File(['pdf'], 'contrato.pdf', { type: 'application/download' });
    const result = validateUploadFile(file, ['application/pdf']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.type).toBe('application/pdf');
  });

  it('no permite extensiones desconocidas aunque el proveedor informe MIME genérico', () => {
    const file = new File(['binary-content'], 'payload.exe', { type: 'application/octet-stream' });

    expect(validateUploadFile(file, ['application/pdf', 'image/jpeg']).ok).toBe(false);
  });

  it('no reemplaza un MIME específico que no está permitido por la carpeta', () => {
    const file = new File(['html-content'], 'poliza.pdf', { type: 'text/html' });

    expect(validateUploadFile(file, ['application/pdf']).ok).toBe(false);
  });

  it('rechaza archivo vacío', () => {
    const file = new File([], 'vacio.pdf', { type: 'application/pdf' });
    expect(validateUploadFile(file, ['application/pdf']).ok).toBe(false);
  });
});

describe('normalizeProviderFileMime (cliente)', () => {
  it('deja intacto un MIME ya correcto', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(normalizeProviderFileMime(file)).toBe(file);
  });

  it('infiere image/jpeg desde octet-stream + .jpg', () => {
    const file = new File(['img'], 'foto.jpg', { type: 'application/octet-stream' });
    const normalized = normalizeProviderFileMime(file);
    expect(normalized.type).toBe('image/jpeg');
    expect(normalized.name).toBe('foto.jpg');
  });
});

describe('materializeProviderFile', () => {
  it('normaliza MIME genérico (octet-stream → application/pdf)', async () => {
    const file = new File(['contenido-pdf'], 'poliza.pdf', { type: 'application/octet-stream' });
    const materialized = await materializeProviderFile(file);
    expect(materialized.type).toBe('application/pdf');
    expect(materialized.name).toBe('poliza.pdf');
    expect(materialized.size).toBeGreaterThan(0);
  });

  it('conserva MIME ya correcto', async () => {
    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    const materialized = await materializeProviderFile(file);
    expect(materialized.type).toBe('image/jpeg');
    expect(materialized.name).toBe('foto.jpg');
    expect(materialized.size).toBeGreaterThan(0);
  });
});
