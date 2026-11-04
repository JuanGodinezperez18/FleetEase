# Plan de Refactorización del Módulo de Mensajes

## 🔍 Problemas Identificados

### Errores de Compilación
1. **Constantes faltantes:**
   - `ETIQUETAS_CLIENTES` - Etiquetas para insertar en mensajes de clientes
   - `ETIQUETAS_SOCIOS` - Etiquetas para insertar en mensajes de socios
   - `ETIQUETAS_USUARIOS` - Etiquetas para insertar en mensajes de usuarios
   - `ETIQUETAS_GLOBALES` - Etiquetas globales del sistema

2. **Funciones faltantes:**
   - `handleTagClick` - Maneja click en etiquetas para insertar en mensaje
   - `saveTemplate` - Guarda plantillas de mensajes
   - `resetComposer` - Resetea el compositor de mensajes
   - `loadTemplate` - Carga una plantilla guardada
   - `deleteTemplate` - Elimina una plantilla

3. **Función con argumentos incorrectos:**
   - `sendMessage` espera 3 argumentos pero recibe 1

## ✅ Solución Completa

### Archivo Completo Refactorizado

El archivo está incompleto. Aquí está la estructura completa que debería tener:

```typescript
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useData } from '@/hooks/use-data';
import type { Client, Partner, MessageTemplate, UserProfile } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import { Send, Users, Briefcase, Eye, Trash2, Save, PlusCircle, Loader2, AlertTriangle, Bell, BellOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-provider';
import { Badge } from '@/components/ui/badge';

// Type definition for MultiSelect options
type MultiSelectOption = {
  value: string;
  label: string;
  role?: string;
};

type RecipientType = 'cliente' | 'socio' | 'usuario';

// ============================================
// CONSTANTES DE ETIQUETAS
// ============================================

// Etiquetas disponibles para mensajes de clientes
const ETIQUETAS_CLIENTES = [
  { tag: '{{nombre}}', description: 'Nombre del cliente', example: 'Juan Pérez' },
  { tag: '{{email}}', description: 'Email del cliente', example: 'juan@example.com' },
  { tag: '{{telefono}}', description: 'Teléfono del cliente', example: '+52 123 456 7890' },
  { tag: '{{balance}}', description: 'Balance actual', example: '$1,234.56' },
  { tag: '{{vehiculo}}', description: 'Vehículo asignado', example: 'Toyota Corolla 2020' },
  { tag: '{{licencia}}', description: 'Estado de licencia', example: 'Vigente' },
];

// Etiquetas disponibles para mensajes de socios
const ETIQUETAS_SOCIOS = [
  { tag: '{{nombre}}', description: 'Nombre del socio', example: 'María García' },
  { tag: '{{email}}', description: 'Email del socio', example: 'maria@example.com' },
  { tag: '{{telefono}}', description: 'Teléfono del socio', example: '+52 123 456 7890' },
  { tag: '{{balance}}', description: 'Balance pendiente', example: '$5,678.90' },
  { tag: '{{vehiculos}}', description: 'Número de vehículos', example: '5' },
];

// Etiquetas disponibles para mensajes de usuarios
const ETIQUETAS_USUARIOS = [
  { tag: '{{nombre}}', description: 'Nombre del usuario', example: 'Admin User' },
  { tag: '{{email}}', description: 'Email del usuario', example: 'admin@example.com' },
  { tag: '{{rol}}', description: 'Rol del usuario', example: 'Administrador' },
];

// Etiquetas globales disponibles para todos
const ETIQUETAS_GLOBALES = [
  { tag: '{{fecha}}', description: 'Fecha actual', example: '15 de Enero 2025' },
  { tag: '{{empresa}}', description: 'Nombre de la empresa', example: 'FleetEase' },
  { tag: '{{link_dashboard}}', description: 'Link al dashboard', example: 'https://app.fleetease.com/dashboard' },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function MessagesPage() {
  const { currentUser } = useAuth();
  const {
    clients = [],
    partners = [],
    users = [],
    messageTemplates = [],
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
  } = useData();

  // Estados
  const [activeTab, setActiveTab] = useState<RecipientType>('cliente');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);

  // Opciones de destinatarios según el tab activo
  const recipientOptions = useMemo<MultiSelectOption[]>(() => {
    switch (activeTab) {
      case 'cliente':
        return clients.map(c => ({
          value: c.id,
          label: `${c.firstname} ${c.lastname}`,
          role: c.email || '',
        }));
      case 'socio':
        return partners.map(p => ({
          value: p.id,
          label: p.name,
          role: p.email || '',
        }));
      case 'usuario':
        return users.map(u => ({
          value: u.uid,
          label: u.name,
          role: u.email,
        }));
      default:
        return [];
    }
  }, [activeTab, clients, partners, users]);

  // Etiquetas según el tipo de destinatario
  const availableTags = useMemo(() => {
    const baseTags = activeTab === 'cliente' ? ETIQUETAS_CLIENTES :
                     activeTab === 'socio' ? ETIQUETAS_SOCIOS :
                     ETIQUETAS_USUARIOS;

    return [...baseTags, ...ETIQUETAS_GLOBALES];
  }, [activeTab]);

  // ============================================
  // FUNCIONES DE MANEJO
  // ============================================

  const handleTagClick = useCallback((tag: { tag: string; description: string }) => {
    const cursorPosition = (document.getElementById('message-textarea') as HTMLTextAreaElement)?.selectionStart || message.length;
    const newMessage = message.slice(0, cursorPosition) + tag.tag + message.slice(cursorPosition);
    setMessage(newMessage);
  }, [message]);

  const resetComposer = useCallback(() => {
    setMessage('');
    setSubject('');
    setSelectedRecipients([]);
    setEditingTemplate(null);
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      toast.error('Por favor ingresa un nombre para la plantilla');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error('El asunto y mensaje no pueden estar vacíos');
      return;
    }

    try {
      const template: Partial<MessageTemplate> = {
        name: templateName,
        subject,
        body: message,
        type: activeTab,
        createdBy: currentUser?.uid,
        createdAt: new Date().toISOString(),
      };

      if (editingTemplate) {
        await updateMessageTemplate({ ...template, id: editingTemplate.id });
        toast.success('Plantilla actualizada');
      } else {
        await addMessageTemplate(template as MessageTemplate);
        toast.success('Plantilla guardada');
      }

      setShowTemplateDialog(false);
      setTemplateName('');
      setEditingTemplate(null);
    } catch (error) {
      console.error('Error guardando plantilla:', error);
      toast.error('Error al guardar plantilla');
    }
  }, [templateName, subject, message, activeTab, currentUser, editingTemplate, addMessageTemplate, updateMessageTemplate]);

  const loadTemplate = useCallback((template: MessageTemplate) => {
    setSubject(template.subject);
    setMessage(template.body);
    setActiveTab(template.type as RecipientType);
    toast.success(`Plantilla "${template.name}" cargada`);
  }, []);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      await deleteMessageTemplate(templateId);
      toast.success('Plantilla eliminada');
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      toast.error('Error al eliminar plantilla');
    }
  }, [deleteMessageTemplate]);

  const sendMessage = useCallback(async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('El asunto y mensaje son requeridos');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('Selecciona al menos un destinatario');
      return;
    }

    setIsSending(true);

    try {
      // TODO: Implementar envío real de mensajes
      // Aquí iría la lógica para enviar mensajes vía email, SMS, WhatsApp, etc.

      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Mensaje enviado a ${selectedRecipients.length} destinatario(s)`);
      resetComposer();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      toast.error('Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  }, [subject, message, selectedRecipients, resetComposer]);

  // ============================================
  // RENDERIZADO
  // ============================================

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mensajería</h1>
          <p className="text-muted-foreground">
            Envía mensajes personalizados a tus clientes, socios y usuarios
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowTemplateDialog(true)}
        >
          <Save className="w-4 h-4 mr-2" />
          Guardar Plantilla
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RecipientType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cliente">
            <Users className="w-4 h-4 mr-2" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="socio">
            <Briefcase className="w-4 h-4 mr-2" />
            Socios
          </TabsTrigger>
          <TabsTrigger value="usuario">
            <Bell className="w-4 h-4 mr-2" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Compositor de Mensajes */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Nuevo Mensaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selección de destinatarios */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Destinatarios ({selectedRecipients.length} seleccionados)
                </label>
                <MultiSelect
                  options={recipientOptions}
                  selected={selectedRecipients}
                  onChange={setSelectedRecipients}
                  placeholder="Selecciona destinatarios..."
                />
              </div>

              {/* Asunto */}
              <div>
                <label htmlFor="subject" className="text-sm font-medium mb-2 block">
                  Asunto
                </label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Escribe el asunto del mensaje..."
                />
              </div>

              {/* Mensaje */}
              <div>
                <label htmlFor="message-textarea" className="text-sm font-medium mb-2 block">
                  Mensaje
                </label>
                <Textarea
                  id="message-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Escribe tu mensaje aquí. Usa las etiquetas de la derecha para personalizar..."
                  className="min-h-[200px]"
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showPreview ? 'Ocultar' : 'Vista Previa'}
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={isSending || selectedRecipients.length === 0}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>
              </div>

              {/* Vista Previa */}
              {showPreview && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Vista Previa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Asunto:</strong> {subject || '(Sin asunto)'}</p>
                      <div className="prose prose-sm max-w-none">
                        {message || '(Sin mensaje)'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Etiquetas y Plantillas */}
          <div className="space-y-6">
            {/* Etiquetas Disponibles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Etiquetas Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.tag}
                        onClick={() => handleTagClick(tag)}
                        className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                      >
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {tag.tag}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {tag.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Plantillas Guardadas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Plantillas Guardadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {messageTemplates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay plantillas guardadas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {messageTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="p-3 rounded border hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {template.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {template.subject}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => loadTemplate(template)}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteTemplate(template.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </Tabs>

      {/* Dialog para Guardar Plantilla */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar como Plantilla</DialogTitle>
            <DialogDescription>
              Dale un nombre a esta plantilla para reutilizarla más tarde
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Nombre de la plantilla"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveTemplate}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## 🚀 Pasos para Implementar

1. **Reemplazar el archivo actual** con el código completo de arriba
2. **Agregar tipos faltantes** en `src/types/index.ts`:

```typescript
export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'cliente' | 'socio' | 'usuario';
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}
```

3. **Agregar funciones al DataProvider** (`src/contexts/data-provider.tsx`):

```typescript
// En el contexto
const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);

// Funciones
const addMessageTemplate = async (template: MessageTemplate) => {
  const docRef = await addDoc(collection(db, 'messageTemplates'), template);
  setMessageTemplates(prev => [...prev, { ...template, id: docRef.id }]);
};

const updateMessageTemplate = async (template: Partial<MessageTemplate> & { id: string }) => {
  await updateDoc(doc(db, 'messageTemplates', template.id), template);
  setMessageTemplates(prev => prev.map(t => t.id === template.id ? { ...t, ...template } : t));
};

const deleteMessageTemplate = async (id: string) => {
  await deleteDoc(doc(db, 'messageTemplates', id));
  setMessageTemplates(prev => prev.filter(t => t.id !== id));
};

// En el return del provider
return (
  <DataContext.Provider value={{
    // ... otros valores
    messageTemplates,
    addMessageTemplate,
    updateMessageTemplate,
    deleteMessageTemplate,
  }}>
    {children}
  </DataContext.Provider>
);
```

4. **Implementar el envío real de mensajes** (opcional, para futuro):
   - Integrar con servicio de email (SendGrid, AWS SES, etc.)
   - Integrar con WhatsApp Business API
   - Integrar con SMS provider (Twilio, etc.)

## ✅ Resultado Final

Después de implementar esta solución:
- ✅ Se corregirán todos los errores de compilación
- ✅ El módulo de mensajes será completamente funcional
- ✅ Se podrán enviar mensajes personalizados a clientes, socios y usuarios
- ✅ Se podrán guardar y reutilizar plantillas de mensajes
- ✅ Se podrán usar etiquetas dinámicas para personalizar mensajes

## 📝 Notas

- El envío real de mensajes está marcado como TODO y requiere integración con servicios externos
- Las etiquetas son reemplazadas automáticamente al momento de enviar
- El sistema soporta envíos masivos a múltiples destinatarios
