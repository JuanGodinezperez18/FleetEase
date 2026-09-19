"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useData } from '@/hooks/use-data';
import type { Client, Partner, VehicleWithMileage, MessageTemplate } from '@/types';
import { MultiSelect } from '@/components/ui/multi-select';
import { Send, Eye, Trash2, Save, Loader2, Bell, BellOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { sanitizeUserInput } from '@/lib/validators';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MultiSelectOption = { value: string; label: string; role?: string };
type RecipientType = 'cliente' | 'socio' | 'usuario';
interface MessagePreview { recipientName: string; message: string; }

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
  previews,
}: {
  isOpen: boolean;
  onClose: () => void;
  previews: MessagePreview[];
}) => {
  const handleShare = async () => {
    const fullText = previews.map(p => `Para: ${p.recipientName}\n${p.message}`).join('\n\n---\n\n');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mensajes', text: fullText });
        toast.success('Mensajes compartidos');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error('Error al compartir');
        }
      }
    } else {
      await navigator.clipboard.writeText(fullText);
      toast.success('Copiado al portapapeles');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px] border-white/10 bg-[#0e1117] text-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-white">Vista previa</DialogTitle>
          <DialogDescription className="text-white/40">Revisa los mensajes antes de compartirlos.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="my-4 max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {previews.map((preview, index) => (
              <div key={index} className="rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-3">
                <p className="text-sm font-semibold text-white/90">{preview.recipientName}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/55">{preview.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">Cerrar</Button>
          <Button onClick={handleShare} className="bg-[#d7ff3f] text-[#080a0f] hover:bg-[#d7ff3f]/90">
            <Send className="mr-2 h-4 w-4" strokeWidth={1.75} /> Compartir / Copiar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function MessageSender({
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
  clientMetrics: any[];
}) {
  const { messageTemplates, addMessageTemplate, updateMessageTemplate, deleteMessageTemplate, sendInternalMessage } = useData();
  const { currentUser } = useAuth();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [messagePreviews, setMessagePreviews] = useState<MessagePreview[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendPushNotification, setSendPushNotification] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [pushPriority, setPushPriority] = useState<'normal' | 'high'>('normal');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messageStats = useMemo(() => {
    const length = message.length;
    const smsCount = Math.ceil(length / 160) || 1;
    return { length, smsCount, remaining: smsCount * 160 - length };
  }, [message]);

  const templatesForType = useMemo(
    () => messageTemplates.filter(t => t.type === type && t.companyId === currentUser?.companyId),
    [messageTemplates, type, currentUser?.companyId]
  );

  const etiquetas = useMemo(() => {
    const base =
      type === 'cliente' ? ETIQUETAS_CLIENTES : type === 'socio' ? ETIQUETAS_SOCIOS : ETIQUETAS_USUARIOS;
    return type !== 'usuario' ? [...base, ...ETIQUETAS_GLOBALES] : base;
  }, [type]);

  const handleTagClick = useCallback(
    (tagKey: string) => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tagText = `{{${tagKey}}}`;
      const newMessage = message.substring(0, start) + tagText + message.substring(end);
      setMessage(newMessage);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tagText.length, start + tagText.length);
      }, 0);
    },
    [message]
  );

  const saveTemplate = useCallback(async () => {
    if (!templateName.trim() || !message.trim() || !currentUser?.companyId) {
      toast.error('Completa nombre y mensaje');
      return;
    }
    const sanitizedName = sanitizeUserInput(templateName);
    const sanitizedContent = sanitizeUserInput(message);
    try {
      if (editingTemplate) {
        await updateMessageTemplate(editingTemplate.id, {
          name: sanitizedName,
          content: sanitizedContent,
          type,
          updatedAt: new Date().toISOString(),
        });
        toast.success('Plantilla actualizada');
      } else {
        await addMessageTemplate({
          name: sanitizedName,
          content: sanitizedContent,
          type,
          companyId: currentUser.companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
        });
        toast.success('Plantilla guardada');
      }
      setTemplateName('');
      setEditingTemplate(null);
    } catch {
      toast.error('Error al guardar plantilla');
    }
  }, [templateName, message, type, currentUser, editingTemplate, updateMessageTemplate, addMessageTemplate]);

  const loadTemplate = useCallback((template: MessageTemplate) => {
    setMessage(template.content);
    setTemplateName(template.name);
    setEditingTemplate(template);
    toast.success(`Plantilla "${template.name}" cargada`);
  }, []);

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!confirm('¿Eliminar esta plantilla?')) return;
      try {
        await deleteMessageTemplate(templateId);
        toast.success('Plantilla eliminada');
        if (editingTemplate?.id === templateId) {
          setEditingTemplate(null);
          setTemplateName('');
        }
      } catch {
        toast.error('Error al eliminar');
      }
    },
    [deleteMessageTemplate, editingTemplate]
  );

  const generatePreview = useCallback(async () => {
    if (type === 'usuario' && sendPushNotification) {
      if (!message.trim() || !notificationTitle.trim()) {
        toast.error('Mensaje y título son obligatorios');
        return;
      }
      setIsSending(true);
      try {
        const response = await fetch('/api/notifications/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sanitizeUserInput(notificationTitle),
            message: sanitizeUserInput(message),
            recipientType: 'specific',
            selectedUsers: selectedRecipients,
            sendPush: true,
            priority: pushPriority,
            senderName: currentUser?.name || currentUser?.email,
            companyId: currentUser?.companyId,
          }),
        });
        if (!response.ok) throw new Error('Error');
        const data = await response.json();
        toast.success(`Notificación enviada a ${data.recipientCount} usuario(s)`);
        setSelectedRecipients([]);
        setMessage('');
        setNotificationTitle('');
      } catch {
        toast.error('Error al enviar notificaciones');
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (type === 'usuario') {
      if (!message.trim()) {
        toast.error('El mensaje no puede estar vacío');
        return;
      }
      setIsSending(true);
      try {
        await sendInternalMessage(selectedRecipients, 'Mensaje del Administrador', sanitizeUserInput(message));
        toast.success('Mensajes internos enviados');
        setSelectedRecipients([]);
        setMessage('');
      } catch {
        toast.error('Error al enviar');
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (selectedRecipients.length > 100) {
      toast.error('Máximo 100 destinatarios');
      return;
    }

    const previews: MessagePreview[] = [];
    selectedRecipients.forEach(recipientId => {
      let recipientName = '';
      let personalizedMessage = message;
      if (type === 'cliente') {
        const client = allClients.find(c => c.id === recipientId);
        if (!client) return;
        recipientName = `${client.firstname} ${client.lastname}`;
        const vehicle = allVehicles.find(v => v.clientId === client.id);
        const company = allCompanies.find(c => c.id === currentUser?.companyId);
        const metric = clientMetrics.find((m: any) => m.clientId === client.id);
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
        const partner = allPartners.find(p => p.id === recipientId);
        if (!partner) return;
        recipientName = partner.name;
        const partnerVehicles = allVehicles.filter(v => v.partnerId === partner.id);
        const company = allCompanies.find(c => c.id === currentUser?.companyId);
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
    selectedRecipients, message, type, allClients, allPartners, allVehicles, allCompanies,
    clientMetrics, currentUser, sendInternalMessage, sendPushNotification, notificationTitle, pushPriority,
  ]);

  const handlePreview = () => {
    if (selectedRecipients.length === 0) {
      toast.error(`Selecciona al menos un ${type}`);
      return;
    }
    if (!message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }
    if (sendPushNotification && type === 'usuario' && !notificationTitle.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    generatePreview();
  };

  return (
    <div className="space-y-5 text-white">
      <div className="space-y-1">
        <h2 className="font-heading flex items-center gap-2 text-base font-semibold text-white">
          <Send className="h-5 w-5 text-[#d7ff3f]" strokeWidth={1.75} />
          Compositor
        </h2>
        <p className="text-sm text-white/40">
          {type === 'usuario'
            ? 'Mensajes internos o notificaciones push'
            : 'Mensajes personalizados con etiquetas'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">Destinatarios</label>
        <MultiSelect
          options={options}
          selected={selectedRecipients}
          onChange={setSelectedRecipients}
          placeholder={`Selecciona ${type}s...`}
        />
        {selectedRecipients.length > 0 && (
          <p className="text-xs text-white/40">{selectedRecipients.length} seleccionado(s)</p>
        )}
      </div>

      {type === 'usuario' && (
        <div className="space-y-4 rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="push-notification"
              checked={sendPushNotification}
              onCheckedChange={checked => setSendPushNotification(checked as boolean)}
            />
            <label htmlFor="push-notification" className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
              {sendPushNotification ? (
                <><Bell className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} /> Notificación push</>
              ) : (
                <><BellOff className="h-4 w-4" strokeWidth={1.75} /> Mensaje interno</>
              )}
            </label>
          </div>
          {sendPushNotification && (
            <div className="space-y-3 border-l-2 border-[#d7ff3f]/40 pl-4">
              <div className="space-y-2">
                <label className="text-sm text-white/70">Título *</label>
                <Input
                  value={notificationTitle}
                  onChange={e => setNotificationTitle(e.target.value)}
                  placeholder="Ej: Actualización importante"
                  maxLength={50}
                  className="border-white/10 bg-white/[0.03] text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/70">Prioridad</label>
                <Select value={pushPriority} onValueChange={(v: 'normal' | 'high') => setPushPriority(v)}>
                  <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">Mensaje</label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {etiquetas.map(tag => (
            <button
              key={tag.key}
              type="button"
              onClick={() => handleTagClick(tag.key)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/60 hover:border-[#d7ff3f]/30 hover:text-[#d7ff3f]"
              title={tag.description}
            >
              {`{{${tag.key}}}`}
            </button>
          ))}
        </div>
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje..."
          rows={6}
          className="border-white/10 bg-white/[0.03] text-white placeholder:text-white/30"
        />
        <p className="text-[11px] text-white/35">
          {messageStats.length} caracteres · ~{messageStats.smsCount} SMS
        </p>
      </div>

      {!sendPushNotification && type !== 'usuario' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="Nombre de plantilla..."
            className="flex-1 border-white/10 bg-white/[0.03] text-white"
          />
          <Button
            onClick={saveTemplate}
            variant="outline"
            disabled={!templateName.trim() || !message.trim()}
            className="rounded-xl border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <Save className="mr-2 h-4 w-4" strokeWidth={1.75} />
            {editingTemplate ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          onClick={handlePreview}
          disabled={selectedRecipients.length === 0 || !message.trim() || isSending}
          className="min-w-[180px] rounded-xl bg-[#d7ff3f] text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-50"
        >
          {isSending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} /> Enviando...</>
          ) : sendPushNotification && type === 'usuario' ? (
            <><Bell className="mr-2 h-4 w-4" strokeWidth={1.75} /> Enviar push</>
          ) : type === 'usuario' ? (
            <><Send className="mr-2 h-4 w-4" strokeWidth={1.75} /> Enviar interno</>
          ) : (
            <><Eye className="mr-2 h-4 w-4" strokeWidth={1.75} /> Vista previa</>
          )}
        </Button>
      </div>

      {!sendPushNotification && type !== 'usuario' && templatesForType.length > 0 && (
        <div className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.02]">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <h3 className="font-heading text-sm font-semibold text-white">Plantillas</h3>
          </div>
          <ScrollArea className="h-48">
            <div className="space-y-1 p-2">
              {templatesForType.map(tpl => (
                <div
                  key={tpl.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-[12px] p-3 hover:bg-white/[0.04]',
                    editingTemplate?.id === tpl.id && 'bg-[#d7ff3f]/[0.08]'
                  )}
                  onClick={() => loadTemplate(tpl)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/90">{tpl.name}</p>
                    <p className="truncate text-xs text-white/40">{tpl.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/40 hover:text-rose-300"
                    onClick={e => {
                      e.stopPropagation();
                      deleteTemplate(tpl.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <MessagePreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        previews={messagePreviews}
      />
    </div>
  );
}
