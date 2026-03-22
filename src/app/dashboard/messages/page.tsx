"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { useData } from '@/hooks/use-data';
import type { Client, Partner, VehicleWithMileage, MessageTemplate } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import { Send, Users, Briefcase, Eye, Trash2, Save, PlusCircle, Loader2, AlertTriangle, Bell, BellOff } from 'lucide-react';

// Type definition for MultiSelect options
type MultiSelectOption = {
  value: string;
  label: string;
  role?: string;
};
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { useClientAnalytics } from '@/hooks/use-client-analytics';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMileageAnalytics } from '@/hooks/use-mileage-analytics';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RecipientType = 'cliente' | 'socio' | 'usuario';

interface MessagePreview {
  recipientName: string;
  message: string;
}

// Etiquetas disponibles para mensajes
const ETIQUETAS_CLIENTES = [
  { key: 'nombre', label: 'Nombre del cliente', description: 'Nombre completo del cliente' },
  { key: 'saldo', label: 'Saldo pendiente', description: 'Monto adeudado por el cliente' },
  { key: 'vehiculo', label: 'Vehículo asignado', description: 'Vehículo del cliente' },
  { key: 'placa', label: 'Placa del vehículo', description: 'Número de placa' },
  { key: 'diasVencido', label: 'Días vencido', description: 'Días de atraso en pagos' },
  { key: 'proximoPago', label: 'Próximo pago', description: 'Fecha del próximo pago' },
  { key: 'montoProximoPago', label: 'Monto próximo pago', description: 'Monto del próximo pago' },
];

const ETIQUETAS_SOCIOS = [
  { key: 'nombre', label: 'Nombre del socio', description: 'Nombre completo del socio' },
  { key: 'balance', label: 'Balance', description: 'Balance actual del socio' },
  { key: 'vehiculos', label: 'Vehículos', description: 'Número de vehículos' },
  { key: 'ingresos', label: 'Ingresos totales', description: 'Total de ingresos' },
  { key: 'gastos', label: 'Gastos totales', description: 'Total de gastos' },
];

const ETIQUETAS_USUARIOS = [
  { key: 'nombre', label: 'Nombre del usuario', description: 'Nombre completo del usuario' },
  { key: 'email', label: 'Email', description: 'Correo electrónico' },
  { key: 'rol', label: 'Rol', description: 'Rol del usuario en el sistema' },
];

const ETIQUETAS_GLOBALES = [
  { key: 'empresa', label: 'Nombre de la empresa', description: 'Nombre de la empresa' },
  { key: 'fecha', label: 'Fecha actual', description: 'Fecha de hoy' },
  { key: 'hora', label: 'Hora actual', description: 'Hora actual' },
];

const MessagePreviewDialog = ({
  isOpen,
  onClose,
  previews
}: {
  isOpen: boolean;
  onClose: () => void;
  previews: MessagePreview[];
}) => {
  const handleShare = async () => {
    const fullText = previews.map(p => `Para: ${p.recipientName}\n${p.message}`).join('\n\n---\n\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mensajes a Clientes/Socios',
          text: fullText,
        });
        toast.success('Mensajes compartidos exitosamente.');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error('Error al compartir los mensajes.');
        }
      }
    } else {
      await navigator.clipboard.writeText(fullText);
      toast.success('Mensajes copiados al portapapeles.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Vista Previa de Mensajes</DialogTitle>
          <DialogDescription>
            Revisa cómo se verán los mensajes antes de compartirlos.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] my-4">
          <div className="space-y-4 pr-6">
            {previews.map((preview, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/50">
                <p className="font-semibold text-sm">{preview.recipientName}</p>
                <p className="text-sm whitespace-pre-wrap mt-1">{preview.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleShare}>
            <Send className="mr-2 h-4 w-4" /> Compartir / Copiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ... (mantener todas las constantes ETIQUETAS_CLIENTES, ETIQUETAS_SOCIOS, etc.)

const MessageSender = ({
  type,
  options,
  allClients,
  allPartners,
  allVehicles,
  allCompanies,
  clientMetrics,
}: {
  type: RecipientType;
  options: MultiSelectOption[];
  allClients: Client[];
  allPartners: Partner[];
  allVehicles: VehicleWithMileage[];
  allCompanies: any[];
  clientMetrics: ReturnType<typeof useClientAnalytics>['clientMetrics'];
}) => {
  const { messageTemplates, addMessageTemplate, updateMessageTemplate, deleteMessageTemplate, sendInternalMessage } = useData();
  const { currentUser } = useAuth();

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA NOTIFICACIONES PUSH
  const [sendPushNotification, setSendPushNotification] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [pushPriority, setPushPriority] = useState<'normal' | 'high'>('normal');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messageStats = useMemo(() => {
    const length = message.length;
    const smsCount = Math.ceil(length / 160) || 1;
    const remaining = (smsCount * 160) - length;
    return { length, smsCount, remaining };
  }, [message]);

  const templatesForType = useMemo(() =>
    messageTemplates.filter(t => t.type === type && t.companyId === currentUser?.companyId),
    [messageTemplates, type, currentUser?.companyId]
  );

  const etiquetas = useMemo(() => {
    const baseEtiquetas = type === 'cliente' ? ETIQUETAS_CLIENTES :
                          type === 'socio' ? ETIQUETAS_SOCIOS :
                          ETIQUETAS_USUARIOS;

    if (type !== 'usuario') {
      return [...baseEtiquetas, ...ETIQUETAS_GLOBALES];
    }
    return baseEtiquetas;
  }, [type]);

  const handleTagClick = useCallback((tagKey: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const tagText = `{{${tagKey}}}`;

    const newMessage = message.substring(0, start) + tagText + message.substring(end);
    setMessage(newMessage);

    // Move cursor after inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tagText.length, start + tagText.length);
    }, 0);
  }, [message]);

  const saveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error('Por favor ingresa un nombre para la plantilla');
      return;
    }

    if (!message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    if (!currentUser?.companyId) {
      toast.error('Error: No se encontró la empresa');
      return;
    }

    try {
      if (editingTemplate) {
        await updateMessageTemplate(editingTemplate.id, {
          name: templateName,
          content: message,
          type,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Plantilla actualizada correctamente');
      } else {
        const template: Omit<MessageTemplate, 'id'> = {
          name: templateName,
          content: message,
          type,
          companyId: currentUser.companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
        };
        await addMessageTemplate(template);
        toast.success('Plantilla guardada correctamente');
      }

      setTemplateName('');
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar la plantilla');
    }
  }, [templateName, message, type, currentUser, editingTemplate, updateMessageTemplate, addMessageTemplate]);

  const loadTemplate = useCallback((template: MessageTemplate) => {
    setMessage(template.content);
    setTemplateName(template.name);
    setEditingTemplate(template);
    toast.success(`Plantilla "${template.name}" cargada`);
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      await deleteMessageTemplate(templateId);
      toast.success('Plantilla eliminada correctamente');

      if (editingTemplate?.id === templateId) {
        setEditingTemplate(null);
        setTemplateName('');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Error al eliminar la plantilla');
    }
  }, [deleteMessageTemplate, editingTemplate]);

  const resetComposer = useCallback(() => {
    setMessage('');
    setSelectedRecipients([]);
    setTemplateName('');
    setEditingTemplate(null);
    setSendPushNotification(false);
    setNotificationTitle('');
    setPushPriority('normal');
  }, []);

  // ✅ FUNCIÓN MEJORADA PARA ENVIAR CON NOTIFICACIONES PUSH
  const generatePreview = useCallback(async () => {
    // Si es mensaje para usuarios Y tiene notificación push habilitada
    if (type === 'usuario' && sendPushNotification) {
      if (!message.trim()) {
        toast.error('El mensaje no puede estar vacío');
        return;
      }

      if (!notificationTitle.trim()) {
        toast.error('El título de la notificación es obligatorio');
        return;
      }

      setIsSending(true);
      try {
        // Enviar a través de la API de broadcast
        const response = await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notificationTitle,
            message: message,
            recipientType: 'specific',
            selectedUsers: selectedRecipients,
            sendPush: true,
            priority: pushPriority,
            senderName: currentUser?.name || currentUser?.email,
            companyId: currentUser?.companyId,
          }),
        });

        if (!response.ok) {
          throw new Error('Error al enviar notificación');
        }

        const data = await response.json();
        
        toast.success(
          `Notificación enviada a ${data.recipientCount} usuario(s)`,
          {
            description: `${data.pushSent} notificaciones push enviadas`
          }
        );

        // Resetear
        setSelectedRecipients([]);
        setMessage('');
        setNotificationTitle('');
      } catch (error) {
        toast.error('Error al enviar notificaciones push');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Mensajes internos sin push (lógica original)
    if (type === 'usuario') {
      if (!message.trim()) {
        toast.error('El mensaje no puede estar vacío');
        return;
      }

      setIsSending(true);
      try {
        await sendInternalMessage(selectedRecipients, 'Mensaje del Administrador', message);
        toast.success("Mensajes internos enviados correctamente");
        setSelectedRecipients([]);
        setMessage('');
      } catch (error) {
        toast.error('Error al enviar mensajes internos');
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Validación de límite para WhatsApp/SMS
    if (selectedRecipients.length > 100) {
      toast.error('Límite excedido', {
        description: 'Solo puedes enviar a máximo 100 destinatarios por operación'
      });
      return;
    }

    // Generar previews para clientes y socios
    const previews: MessagePreview[] = [];

    selectedRecipients.forEach((recipientId) => {
      let recipientName = '';
      let personalizedMessage = message;

      if (type === 'cliente') {
        const client = allClients.find((c) => c.id === recipientId);
        if (!client) return;

        recipientName = `${client.firstname} ${client.lastname}`;
        const vehicle = allVehicles.find((v) => v.clientId === client.id);
        const company = allCompanies.find((c) => c.id === currentUser?.companyId);
        const metric = clientMetrics.find((m) => m.clientId === client.id);

        // Reemplazar etiquetas
        personalizedMessage = personalizedMessage
          .replace(/\{\{nombre\}\}/g, recipientName)
          .replace(/\{\{saldo\}\}/g, formatCurrency(client.balance || 0))
          .replace(/\{\{vehiculo\}\}/g, vehicle ? `${vehicle.make} ${vehicle.model}` : 'Sin vehículo')
          .replace(/\{\{placa\}\}/g, vehicle?.plate || 'Sin placa')
          .replace(/\{\{diasVencido\}\}/g, metric?.daysSinceLastPayment?.toString() || '0')
          .replace(/\{\{proximoPago\}\}/g, 'N/A')
          .replace(/\{\{montoProximoPago\}\}/g, 'N/A')
          .replace(/\{\{empresa\}\}/g, company?.name || 'FleetEase')
          .replace(/\{\{fecha\}\}/g, formatDate(new Date().toISOString()))
          .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));

      } else if (type === 'socio') {
        const partner = allPartners.find((p) => p.id === recipientId);
        if (!partner) return;

        recipientName = partner.name;
        const partnerVehicles = allVehicles.filter((v) => v.partnerId === partner.id);
        const company = allCompanies.find((c) => c.id === currentUser?.companyId);

        // Reemplazar etiquetas
        personalizedMessage = personalizedMessage
          .replace(/\{\{nombre\}\}/g, recipientName)
          .replace(/\{\{balance\}\}/g, formatCurrency(partner.balance || 0))
          .replace(/\{\{vehiculos\}\}/g, partnerVehicles.length.toString())
          .replace(/\{\{ingresos\}\}/g, 'N/A')
          .replace(/\{\{gastos\}\}/g, 'N/A')
          .replace(/\{\{empresa\}\}/g, company?.name || 'FleetEase')
          .replace(/\{\{fecha\}\}/g, formatDate(new Date().toISOString()))
          .replace(/\{\{hora\}\}/g, new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      }

      previews.push({ recipientName, message: personalizedMessage });
    });

    setMessagePreviews(previews);
    setIsPreviewOpen(true);
  }, [
    selectedRecipients,
    message,
    type,
    allClients,
    allPartners,
    allVehicles,
    allCompanies,
    clientMetrics,
    currentUser,
    sendInternalMessage,
    sendPushNotification,
    notificationTitle,
    pushPriority
  ]);

  const handlePreview = () => {
    if (selectedRecipients.length === 0) {
      toast.error(`Selecciona al menos un ${type} para continuar`);
      return;
    }

    if (!message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    // Validación adicional para notificaciones push
    if (sendPushNotification && type === 'usuario' && !notificationTitle.trim()) {
      toast.error('El título de la notificación es obligatorio');
      return;
    }

    generatePreview();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compositor de Mensajes
          </CardTitle>
          <CardDescription>
            {type === 'usuario'
              ? 'Envía mensajes internos o notificaciones push a los usuarios de tu empresa'
              : 'Crea mensajes personalizados usando las etiquetas disponibles'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selección de Destinatarios */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Destinatarios</label>
            <MultiSelect
              options={options}
              selected={selectedRecipients}
              onChange={setSelectedRecipients}
              placeholder={`Selecciona ${type}s...`}
            />
            {selectedRecipients.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedRecipients.length} {selectedRecipients.length === 1 ? 'destinatario seleccionado' : 'destinatarios seleccionados'}
              </p>
            )}
          </div>

          {/* ✅ OPCIONES DE NOTIFICACIÓN PUSH (solo para usuarios) */}
          {type === 'usuario' && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="push-notification"
                    checked={sendPushNotification}
                    onCheckedChange={(checked) => setSendPushNotification(checked as boolean)}
                  />
                  <label
                    htmlFor="push-notification"
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    {sendPushNotification ? (
                      <>
                        <Bell className="h-4 w-4 text-blue-600" />
                        Enviar como Notificación Push
                      </>
                    ) : (
                      <>
                        <BellOff className="h-4 w-4" />
                        Mensaje Interno (sin notificación)
                      </>
                    )}
                  </label>
                </div>
              </div>

              {sendPushNotification && (
                <div className="space-y-4 pl-6 border-l-2 border-blue-500">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título de la Notificación*</label>
                    <Input
                      value={notificationTitle}
                      onChange={(e) => setNotificationTitle(e.target.value)}
                      placeholder="Ej: Actualización Importante"
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      {notificationTitle.length}/50 caracteres
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridad</label>
                    <Select value={pushPriority} onValueChange={(value: any) => setPushPriority(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Normal
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            Alta (Requiere interacción)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Bell className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      La notificación se enviará a los dispositivos con la app instalada. 
                      {pushPriority === 'high' && ' Con prioridad alta, requerirá interacción del usuario.'}
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          {/* Área de Mensaje */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {sendPushNotification && type === 'usuario' ? 'Contenido de la Notificación' : 'Contenido del Mensaje'}
            </label>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                sendPushNotification && type === 'usuario'
                  ? "Escribe el cuerpo de la notificación push..."
                  : type === 'usuario' 
                    ? "Escribe tu mensaje interno aquí..." 
                    : "Escribe tu mensaje aquí... Usa las etiquetas para insertar datos dinámicos."
              }
              rows={10}
              className="text-base font-mono resize-none"
            />
            
            {/* Estadísticas del Mensaje */}
            {!sendPushNotification && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>{messageStats.length} caracteres</span>
                  <span>•</span>
                  <span>{messageStats.smsCount} SMS</span>
                  {messageStats.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{messageStats.remaining} restantes en este SMS</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {sendPushNotification && (
              <p className="text-xs text-muted-foreground">
                {message.length}/500 caracteres (recomendado para notificaciones)
              </p>
            )}

            {!sendPushNotification && messageStats.smsCount > 3 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Este mensaje ocupará {messageStats.smsCount} SMS. Considera acortarlo para reducir costos.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Etiquetas Disponibles (solo para clientes/socios, o para usuarios sin notificación push) */}
          {(type !== 'usuario' || !sendPushNotification) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Etiquetas Disponibles</label>
                <Badge variant="secondary" className="text-xs">
                  Click para insertar
                </Badge>
              </div>
              <ScrollArea className="h-48 border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {etiquetas.map((tag) => (
                    <Button
                      key={tag.key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleTagClick(tag.key)}
                      title={tag.description}
                      className="justify-start text-left h-auto py-2"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium text-xs">{tag.label}</span>
                        <code className="text-[10px] text-muted-foreground">{`{{${tag.key}}}`}</code>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Gestión de Plantillas (solo si no es notificación push) */}
          {!sendPushNotification && type !== 'usuario' && (
            <div className="space-y-3">
              <Separator />
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Nombre de la plantilla..."
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={saveTemplate}
                    variant="secondary"
                    disabled={!templateName.trim() || !message.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingTemplate ? 'Actualizar' : 'Guardar'}
                  </Button>
                  {editingTemplate && (
                    <Button
                      onClick={resetComposer}
                      variant="outline"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Nuevo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            onClick={handlePreview}
            disabled={selectedRecipients.length === 0 || !message.trim() || isSending}
            size="lg"
            className="min-w-[200px]"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                {sendPushNotification && type === 'usuario' ? (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enviar Notificación Push
                  </>
                ) : type === 'usuario' ? (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensaje Interno
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Vista Previa y Compartir
                  </>
                )}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Plantillas Guardadas (solo si no es notificación push) */}
      {!sendPushNotification && type !== 'usuario' && templatesForType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plantillas Guardadas</CardTitle>
            <CardDescription>
              Plantillas de {type}s guardadas en tu empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {templatesForType.map(t => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors",
                      editingTemplate?.id === t.id && "bg-accent border-primary"
                    )}
                    onClick={() => loadTemplate(t)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(t.id);
                      }}
                      className="h-8 w-8 p-0 ml-2"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Vista Previa (mantener el componente original MessagePreviewDialog) */}
      <MessagePreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previews={messagePreviews}
      />
    </div>
  );
};

export default function MessagesPage() {
  const { clients, partners, vehicles, companies, users } = useData();
  const { clientMetrics } = useClientAnalytics(clients, [], vehicles);

  const clientOptions: MultiSelectOption[] = useMemo(() =>
    clients.filter(c => !c.isDeleted && c.status === 'active').map(c => ({
      value: c.id,
      label: `${c.firstname} ${c.lastname}`,
    })), [clients]);

  const partnerOptions: MultiSelectOption[] = useMemo(() =>
    partners.filter(p => !p.isDeleted).map(p => ({
      value: p.id,
      label: p.name,
    })), [partners]);

  const userOptions: MultiSelectOption[] = useMemo(() =>
    users.filter(u => !u.isDeleted).map(u => ({
      value: u.uid,
      label: u.name,
    })), [users]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Centro de Mensajería</CardTitle>
          <CardDescription>
            Crea y envía comunicaciones personalizadas a tus clientes, socios y usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="clients">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="clients"><Users className="mr-2 h-4 w-4"/>Clientes</TabsTrigger>
              <TabsTrigger value="partners"><Briefcase className="mr-2 h-4 w-4"/>Socios</TabsTrigger>
              <TabsTrigger value="users"><Users className="mr-2 h-4 w-4"/>Usuarios</TabsTrigger>
            </TabsList>
            <TabsContent value="clients" className="pt-4">
              <MessageSender
                type="cliente"
                options={clientOptions}
                allClients={clients}
                allPartners={partners}
                allVehicles={vehicles}
                allCompanies={companies}
                clientMetrics={clientMetrics}
              />
            </TabsContent>
            <TabsContent value="partners" className="pt-4">
              <MessageSender
                type="socio"
                options={partnerOptions}
                allClients={clients}
                allPartners={partners}
                allVehicles={vehicles}
                allCompanies={companies}
                clientMetrics={clientMetrics}
              />
            </TabsContent>
            <TabsContent value="users" className="pt-4">
              <MessageSender
                type="usuario"
                options={userOptions}
                allClients={clients}
                allPartners={partners}
                allVehicles={vehicles}
                allCompanies={companies}
                clientMetrics={clientMetrics}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}