"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/hooks/use-data";
import type { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import { useStorage } from "@/hooks/use-storage";
import Image from "next/image";
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
import { supabase } from "@/lib/supabase";

interface DocumentField {
  key: keyof Vehicle;
  title: string;
  description: string;
  accept: string;
  required?: boolean;
}

const DOCUMENT_FIELDS: DocumentField[] = [
  { key: "imageUrl", title: "Foto del vehículo", description: "Imagen principal", accept: "image/*", required: true },
  { key: "circulationCardUrl", title: "Tarjeta de circulación", description: "Documento oficial", accept: "image/*,application/pdf", required: true },
  { key: "insurancePolicyDocumentUrl", title: "Póliza de seguro", description: "Seguro vigente", accept: "image/*,application/pdf", required: true },
];

const getFileNameFromUrl = (url: string, defaultName = "documento"): string => {
  if (!url) return defaultName;
  try {
    if (url.startsWith("data:")) {
      const mimeMatch = url.match(/data:([^;]+);/);
      const ext = mimeMatch?.[1]?.split("/")[1] || "bin";
      return `${defaultName.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
    }
    if (url.includes(".supabase.co/storage/v1/object/public/")) {
      const match = url.match(/\/object\/public\/[^/]+\/(.+?)(\?|$)/);
      if (match?.[1]) return decodeURIComponent(match[1]).split("/").pop() || defaultName;
    }
    const urlObj = new URL(url);
    const filename = urlObj.pathname.split("/").pop();
    if (filename?.includes(".")) return decodeURIComponent(filename);
    return defaultName;
  } catch {
    return defaultName;
  }
};

const validateFile = (file: File, accept: string): { valid: boolean; error?: string } => {
  const maxSizeMB = accept.includes("image") && !accept.includes("pdf") ? 5 : 10;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Máximo ${maxSizeMB}MB` };
  }
  const acceptTypes = accept.split(",").map((t) => t.trim());
  const isValidType = acceptTypes.some((type) => {
    if (type === "image/*") return file.type.startsWith("image/");
    if (type === "application/pdf") return file.type === "application/pdf";
    return file.type === type;
  });
  if (!isValidType) return { valid: false, error: `Tipo no válido: ${accept}` };
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
    () => (vehicles || []).find((v) => v.id === vehicleId && !v.isDeleted),
    [vehicles, vehicleId]
  );

  const documentCompletion = useMemo(() => {
    if (!vehicle) return { total: 0, completed: 0, percentage: 0 };
    const requiredFields = DOCUMENT_FIELDS.filter((f) => f.required);
    const completed = requiredFields.filter((f) => vehicle[f.key]).length;
    return {
      total: requiredFields.length,
      completed,
      percentage: Math.round((completed / requiredFields.length) * 100),
    };
  }, [vehicle]);

  const handleFileUpload = async (file: File, fieldKey: keyof Vehicle) => {
    if (!vehicle) return;
    const field = DOCUMENT_FIELDS.find((f) => f.key === fieldKey);
    if (!field) return;
    const validation = validateFile(file, field.accept);
    if (!validation.valid) {
      toast.error("Archivo no válido", { description: validation.error });
      return;
    }
    setUploadingState((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const oldFileUrl = vehicle[fieldKey] as string | undefined;
      const newFileUrl = await uploadFile(file, "driver_documents", true, vehicle.id);
      await updateVehicle(vehicle.id, { [fieldKey]: newFileUrl });
      if (oldFileUrl) {
        await deleteFileByUrl(oldFileUrl).catch((e) => console.warn(e));
      }
      toast.success("Documento actualizado", { description: `${field.title} subido` });
    } catch (error) {
      toast.error("Error al subir", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setUploadingState((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleDeleteDocument = async () => {
    if (!vehicle || !deleteDialog.fieldKey) return;
    const fieldKey = deleteDialog.fieldKey;
    const documentUrl = vehicle[fieldKey] as string | undefined;
    if (!documentUrl) {
      setDeleteDialog({ open: false });
      return;
    }
    setUploadingState((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      await deleteFileByUrl(documentUrl);
      await updateVehicle(vehicle.id, { [fieldKey]: null });
      toast.success("Documento eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setUploadingState((prev) => ({ ...prev, [fieldKey]: false }));
      setDeleteDialog({ open: false });
    }
  };

  const handleDownload = useCallback(async (url: string | undefined, defaultFilename: string) => {
    if (!url) {
      toast.error("Documento no encontrado");
      return;
    }
    setDownloadingState((prev) => ({ ...prev, [url]: true }));
    const toastId = toast.loading("Preparando descarga...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No hay sesión activa");
      const response = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileUrl: url }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || "Error de descarga");
      }
      const { signedUrl } = await response.json();
      const filename = getFileNameFromUrl(url, defaultFilename);
      const link = document.createElement("a");
      link.href = signedUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Descarga iniciada", { id: toastId });
    } catch (error: any) {
      toast.error("Error de descarga", { id: toastId, description: error.message });
    } finally {
      setDownloadingState((prev) => ({ ...prev, [url]: false }));
    }
  }, []);

  const handleShare = async (url: string, title: string) => {
    if (!navigator.share) {
      toast.info("No soportado en este navegador");
      return;
    }
    try {
      await navigator.share({ title, url, text: `Documento: ${title}` });
      toast.success("Compartido");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Error al compartir");
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-center text-white">
        <AlertTriangle className="h-12 w-12 text-rose-300/70" strokeWidth={1.5} />
        <h2 className="font-heading text-lg font-semibold">Vehículo no encontrado</h2>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/vehicles")}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a vehículos
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="relative z-10 space-y-5 sm:space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="h-9 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Volver
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.info("Próximamente", { description: "Exportación ZIP disponible pronto." })}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <Archive className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Exportar todo (.zip)
            </Button>
          </div>

          <header>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Flota · Documentos
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                  Documentos del vehículo
                </h1>
                <p className="mt-1 text-sm text-white/45">
                  {vehicle.plate} · {vehicle.make} {vehicle.model} {vehicle.year}
                </p>
              </div>
              <span
                className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  documentCompletion.percentage === 100
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/[0.06] text-white/55"
                }`}
              >
                {documentCompletion.percentage === 100 && (
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {documentCompletion.completed}/{documentCompletion.total} documentos
              </span>
            </div>
            {documentCompletion.percentage < 100 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-white/40">
                  <span>Completitud</span>
                  <span>{documentCompletion.percentage}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-[#d7ff3f] transition-all duration-500"
                    style={{ width: `${documentCompletion.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </header>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DOCUMENT_FIELDS.map((field) => {
              const documentUrl = vehicle[field.key] as string | undefined;
              const hasDocument = !!documentUrl;
              const isUploading = uploadingState[field.key] || false;
              const isDownloading = downloadingState[documentUrl || ""] || false;
              const isImage = documentUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i);

              return (
                <article
                  key={field.key}
                  className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_14px_40px_rgba(0,0,0,.2)]"
                >
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {field.accept === "image/*" ? (
                          <ImageIcon className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
                        ) : (
                          <FileText className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
                        )}
                        <h3 className="font-heading text-sm font-semibold text-white">{field.title}</h3>
                      </div>
                      {field.required && !hasDocument && (
                        <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          Requerido
                        </span>
                      )}
                      {hasDocument && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} />
                          Subido
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">{field.description}</p>
                  </div>

                  <div className="flex min-h-[160px] flex-grow flex-col p-4">
                    {isUploading ? (
                      <div className="flex flex-1 flex-col items-center justify-center text-white/40">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
                        <p className="text-xs">Subiendo...</p>
                      </div>
                    ) : hasDocument ? (
                      <div className="space-y-3">
                        <div
                          className="relative h-36 cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
                          onClick={() => setPreviewDialog({ open: true, url: documentUrl, title: field.title })}
                        >
                          {isImage ? (
                            <Image src={documentUrl!} alt={field.title} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FileText className="h-12 w-12 text-white/25" strokeWidth={1.25} />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/40 hover:opacity-100">
                            <Eye className="h-7 w-7 text-white" strokeWidth={1.75} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept={field.accept}
                              className="hidden"
                              disabled={isDownloading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, field.key);
                              }}
                            />
                            <span className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white">
                              <Upload className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                              Cambiar
                            </span>
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => handleDownload(documentUrl, getFileNameFromUrl(documentUrl!, field.title))}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
                            ) : (
                              <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                            )}
                            Descargar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => handleShare(documentUrl!, field.title)}
                          >
                            <Share2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                            Compartir
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 rounded-xl border-rose-400/20 bg-rose-400/[0.06] text-xs text-rose-300 hover:bg-rose-400/15"
                            onClick={() => setDeleteDialog({ open: true, fieldKey: field.key })}
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <label
                        className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-white/[0.02] transition hover:border-[#d7ff3f]/30 hover:bg-[#d7ff3f]/[0.04]"
                      >
                        <input
                          type="file"
                          accept={field.accept}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, field.key);
                          }}
                        />
                        <Upload className="mb-2 h-9 w-9 text-white/30" strokeWidth={1.5} />
                        <p className="text-xs font-medium text-white/50">Arrastra o haz clic</p>
                        <p className="mt-1 text-[10px] text-white/30">
                          {field.accept === "image/*" ? "Solo imágenes" : "Imágenes o PDF"}
                        </p>
                      </label>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open })}>
        <AlertDialogContent className="border-white/10 bg-[#0e1117] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Esta acción no se puede deshacer. El documento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/[0.03] text-white/70">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-rose-500 text-white hover:bg-rose-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open })}>
        <AlertDialogContent className="max-h-[90vh] max-w-4xl overflow-auto border-white/10 bg-[#0e1117] text-white">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>{previewDialog.title}</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setPreviewDialog({ open: false })} className="text-white/50">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogHeader>
          {previewDialog.url && (
            <div className="mt-4">
              {previewDialog.url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i) ? (
                <Image
                  src={previewDialog.url}
                  alt={previewDialog.title || "Preview"}
                  width={1200}
                  height={800}
                  className="max-h-[70vh] w-full rounded-lg object-contain"
                />
              ) : (
                <iframe src={previewDialog.url} className="h-[70vh] w-full rounded-lg border border-white/10" title={previewDialog.title} />
              )}
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
