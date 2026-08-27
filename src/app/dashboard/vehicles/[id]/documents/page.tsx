
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/use-storage';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabase';

type FileValue = File | string;

interface DocumentField {
  key: keyof Vehicle;
  title: string;
  description: string;
  accept: string;
  icon: React.ReactNode;
  required?: boolean;
}

const DOCUMENT_FIELDS: DocumentField[] = [
  {
    key: 'imageUrl',
    title: 'Foto del Vehículo',
    description: 'Imagen principal del vehículo',
    accept: 'image/*',
    icon: <ImageIcon className="h-5 w-5" />,
    required: true
  },
  {
    key: 'circulationCardUrl',
    title: 'Tarjeta de Circulación',
    description: 'Documento oficial de circulación',
    accept: 'image/*,application/pdf',
    icon: <FileText className="h-5 w-5" />,
    required: true
  },
  {
    key: 'insurancePolicyDocumentUrl',
    title: 'Póliza de Seguro',
    description: 'Documento de seguro vigente',
    accept: 'image/*,application/pdf',
    icon: <FileText className="h-5 w-5" />,
    required: true
  },
];

const getFileNameFromUrl = (url: string, defaultName: string = 'documento'): string => {
  if (!url) return defaultName;
  
  try {
    // Caso 1: Data URI
    if (url.startsWith('data:')) {
      const mimeMatch = url.match(/data:([^;]+);/);
      const ext = mimeMatch?.[1]?.split('/')[1] || 'bin';
      return `${defaultName.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
    }
    
    // Caso 2: Supabase Storage URL
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
      const match = url.match(/\/object\/public\/[^\/]+\/(.+?)(\?|$)/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        const filename = decodedPath.split('/').pop();
        return filename || defaultName;
      }
    }
    
    // Caso 3: Firebase Storage URL (legacy)
    if (url.includes('firebasestorage.googleapis.com')) {
      const match = url.match(/\/o\/(.+?)\?/);
      if (match && match[1]) {
        const decodedPath = decodeURIComponent(match[1]);
        const filename = decodedPath.split('/').pop();
        return filename || defaultName;
      }
    }
    
    // Caso 4: URL normal
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    if (filename && filename.includes('.')) {
      return decodeURIComponent(filename);
    }
    
    return defaultName;
  } catch (error) {
    console.warn('Could not parse URL to extract filename:', error);
    return defaultName;
  }
};


// ✅ Validación de archivos
const validateFile = (file: File, accept: string): { valid: boolean; error?: string } => {
  const maxSizeMB = accept.includes('image') && !accept.includes('pdf') ? 5 : 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `El archivo debe ser menor a ${maxSizeMB}MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`
    };
  }
  
  const acceptTypes = accept.split(',').map(t => t.trim());
  const isValidType = acceptTypes.some(type => {
    if (type === 'image/*') return file.type.startsWith('image/');
    if (type === 'application/pdf') return file.type === 'application/pdf';
    return file.type === type;
  });
  
  if (!isValidType) {
    return {
      valid: false,
      error: `Tipo de archivo no válido. Se aceptan: ${accept}`
    };
  }
  
  return { valid: true };
};

export default function VehicleDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  const { vehicles, loadingData, updateVehicle } = useData();
  const { uploadFile, deleteFileByUrl } = useStorage();
  
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [downloadingState, setDownloadingState] = useState<Record<string, boolean>>({});
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; fieldKey?: keyof Vehicle }>({ open: false });
  const [previewDialog, setPreviewDialog] = useState<{ open: boolean; url?: string; title?: string }>({ open: false });
  
  const vehicle = useMemo(
    () => (vehicles || []).find(v => v.id === vehicleId && !v.isDeleted),
    [vehicles, vehicleId]
  );
  
  // ✅ Calcular completitud de documentos
  const documentCompletion = useMemo(() => {
    if (!vehicle) return { total: 0, completed: 0, percentage: 0 };
    
    const requiredFields = DOCUMENT_FIELDS.filter(f => f.required);
    const completed = requiredFields.filter(f => vehicle[f.key]).length;
    
    return {
      total: requiredFields.length,
      completed,
      percentage: Math.round((completed / requiredFields.length) * 100)
    };
  }, [vehicle]);
  
  // ✅ Manejo de subida de archivo
  const handleFileUpload = async (file: File, fieldKey: keyof Vehicle) => {
    if (!vehicle) return;
    
    const field = DOCUMENT_FIELDS.find(f => f.key === fieldKey);
    if (!field) return;
    
    // Validar archivo
    const validation = validateFile(file, field.accept);
    if (!validation.valid) {
      toast.error('Archivo no válido', { description: validation.error });
      return;
    }
    
    setUploadingState(prev => ({ ...prev, [fieldKey]: true }));
    
    try {
      const oldFileUrl = vehicle[fieldKey] as string | undefined;
      
      // Pasar vehicleId a la función de subida
      const newFileUrl = await uploadFile(file, 'driver_documents', true, vehicle.id);

      await updateVehicle(vehicle.id, { [fieldKey]: newFileUrl });

      // Eliminar el archivo antiguo solo DESPUÉS de que el nuevo se haya subido y guardado exitosamente
      if (oldFileUrl) {
          await deleteFileByUrl(oldFileUrl).catch(e => 
              console.warn(`Could not delete old file, but continuing: ${oldFileUrl}`, e)
          );
      }
      
      toast.success('Documento Actualizado', {
        description: `${field.title} subido correctamente`,
      });
    } catch (error) {
      console.error(`Failed to upload ${fieldKey}:`, error);
      toast.error('Error al Subir', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldKey]: false }));
    }
  };
  
  // ✅ Confirmación y eliminación de documento
  const handleDeleteDocument = async () => {
    if (!vehicle || !deleteDialog.fieldKey) return;
    
    const fieldKey = deleteDialog.fieldKey;
    const documentUrl = vehicle[fieldKey] as string | undefined;
    
    if (!documentUrl) {
      setDeleteDialog({ open: false });
      return;
    }
    
    setUploadingState(prev => ({ ...prev, [fieldKey]: true }));
    
    try {
      await deleteFileByUrl(documentUrl);
      await updateVehicle(vehicle.id, { [fieldKey]: null });
      
      toast.success('Documento Eliminado', {
        description: 'El documento ha sido eliminado correctamente',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al Eliminar', {
        description: 'No se pudo eliminar el documento',
      });
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldKey]: false }));
      setDeleteDialog({ open: false });
    }
  };
  
  const handleDownload = useCallback(async (url: string | undefined, defaultFilename: string) => {
    if (!url) {
      toast.error("Error", { description: "Documento no encontrado." });
      return;
    }
    
    setDownloadingState(prev => ({ ...prev, [url]: true }));
    const toastId = toast.loading("Preparando descarga...");

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const response = await fetch('/api/download-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fileUrl: url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || 'No se pudo obtener el enlace de descarga.');
        }

        const { signedUrl } = await response.json();

        const filename = getFileNameFromUrl(url, defaultFilename);
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Descarga Iniciada", { id: toastId, description: `Descargando ${filename}...` });

    } catch (error: any) {
        toast.error("Error de Descarga", { id: toastId, description: error.message });
    } finally {
        setDownloadingState(prev => ({ ...prev, [url]: false }));
    }
  }, []);
  
  const handleShare = async (url: string, title: string) => {
    if (!navigator.share) {
      toast.info('No Soportado', { 
        description: 'La función de compartir no está disponible en este navegador' 
      });
      return;
    }
    
    try {
      await navigator.share({
        title,
        url,
        text: `Documento: ${title}`
      });
      toast.success('Compartido', { description: 'Documento compartido exitosamente' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return; // Usuario canceló
      }
      console.error('Error sharing:', error);
      toast.error('Error al Compartir', { description: 'No se pudo compartir el documento' });
    }
  };
  
  const handleExportAll = async () => {
    toast.info("Próximamente", {
        description: "La exportación de todos los documentos en un ZIP estará disponible pronto."
    });
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">Vehículo no encontrado</h2>
        <p className="text-muted-foreground">El vehículo puede haber sido eliminado o la URL es incorrecta</p>
        <Button onClick={() => router.push('/dashboard/vehicles')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Vehículos
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button variant="outline" onClick={handleExportAll}>
             <Archive className="h-4 w-4 mr-2" />
             Exportar Todo (.zip)
          </Button>
        </div>
        
        {/* Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Documentos del Vehículo</CardTitle>
                <CardDescription className="mt-2">
                  {vehicle.plate} • {vehicle.make} {vehicle.model} {vehicle.year}
                </CardDescription>
              </div>
              
              {/* Badge de completitud */}
              <div className="flex items-center gap-2">
                <Badge 
                  variant={documentCompletion.percentage === 100 ? 'default' : 'secondary'}
                  className="text-lg px-4 py-2"
                >
                  {documentCompletion.percentage === 100 && (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {documentCompletion.completed}/{documentCompletion.total} Documentos
                </Badge>
              </div>
            </div>
            
            {/* Progress Bar */}
            {documentCompletion.percentage < 100 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span>Completitud de Documentos</span>
                  <span>{documentCompletion.percentage}%</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${documentCompletion.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
        
        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOCUMENT_FIELDS.map((field) => (
            <DocumentCard
              key={field.key}
              field={field}
              vehicle={vehicle}
              isUploading={uploadingState[field.key] || false}
              isDownloading={downloadingState[(vehicle[field.key] as string) || ''] || false}
              onUpload={(file) => handleFileUpload(file, field.key)}
              onDelete={() => setDeleteDialog({ open: true, fieldKey: field.key })}
              onPreview={(url) => setPreviewDialog({ open: true, url, title: field.title })}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar Documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El documento será eliminado permanentemente del servidor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Preview Dialog */}
      <AlertDialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open })}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>{previewDialog.title}</AlertDialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewDialog({ open: false })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogHeader>
          {previewDialog.url && (
            <div className="mt-4">
              {previewDialog.url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i) ? (
                 <Image
                  src={previewDialog.url}
                  alt={previewDialog.title || 'Preview'}
                  width={1200}
                  height={800}
                  className="w-full h-auto rounded-lg object-contain max-h-[70vh]"
                />
              ) : (
                <iframe
                  src={previewDialog.url}
                  className="w-full h-[70vh] rounded-lg border"
                  title={previewDialog.title}
                />
              )}
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ✅ Componente DocumentCard Modernizado
interface DocumentCardProps {
  field: DocumentField;
  vehicle: Vehicle;
  isUploading: boolean;
  isDownloading: boolean;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onPreview: (url: string) => void;
  onDownload: (url: string, filename: string) => void;
  onShare: (url: string, title: string) => void;
}

function DocumentCard({
  field,
  vehicle,
  isUploading,
  isDownloading,
  onUpload,
  onDelete,
  onPreview,
  onDownload,
  onShare
}: DocumentCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const documentUrl = vehicle[field.key] as string | undefined;
  const hasDocument = !!documentUrl;
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      onUpload(file);
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };
  
  const isImage = documentUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i);
  const isPdf = documentUrl?.match(/\.pdf(\?|$)/i) || documentUrl?.includes('application/pdf');
  
  return (
    <Card className={`relative overflow-hidden transition-all ${isDragging ? 'ring-2 ring-primary scale-[1.02]' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {field.icon}
            <CardTitle className="text-lg">{field.title}</CardTitle>
          </div>
          {field.required && !hasDocument && (
            <Badge variant="destructive" className="text-xs">
              Requerido
            </Badge>
          )}
          {hasDocument && (
            <Badge variant="default" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Subido
            </Badge>
          )}
        </div>
        <CardDescription className="text-sm">{field.description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isUploading ? (
          <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Subiendo...</p>
            </div>
          </div>
        ) : hasDocument ? (
          <div className="space-y-4">
            {/* Preview */}
            <div 
              className="relative h-48 bg-muted rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => onPreview(documentUrl)}
            >
              {isImage ? (
                <Image
                  src={documentUrl}
                  alt={field.title}
                  fill
                  className="object-cover w-full h-full transition-transform group-hover:scale-105"
                />
              ) : isPdf ? (
                <div className="flex items-center justify-center h-full">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Eye className="h-8 w-8 text-white" />
              </div>
            </div>
            
            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDownloading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Cambiar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(documentUrl, getFileNameFromUrl(documentUrl, field.title))}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Download className="h-4 w-4 mr-2" />}
                Descargar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare(documentUrl, field.title)}
                disabled={isDownloading}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Compartir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
                disabled={isDownloading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`relative h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors cursor-pointer ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary hover:bg-muted'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">
              {isDragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para subir'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {field.accept === 'image/*' ? 'Solo imágenes' : 'Imágenes o PDF'}
            </p>
          </div>
        )}
        
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={field.accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
}
