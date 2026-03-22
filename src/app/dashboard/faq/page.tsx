"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  Car, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield,
  Settings,
  FileText,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const faqCategories = [
  { id: 'all', label: 'Todas', icon: HelpCircle },
  { id: 'vehicles', label: 'Vehículos', icon: Car },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'financial', label: 'Finanzas', icon: DollarSign },
  { id: 'profitability', label: 'Rentabilidad', icon: TrendingUp },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'reports', label: 'Reportes', icon: FileText },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
  { id: 'messages', label: 'Mensajería', icon: MessageSquare },
];

const faqs = [
  // Vehículos
  {
    category: 'vehicles',
    question: '¿Cómo agrego un nuevo vehículo a mi flota?',
    answer: 'Ve a la sección "Vehículos" en el menú lateral y haz clic en "Nuevo Vehículo". Completa el formulario con la información del vehículo: marca, modelo, año, placa, número de serie, y fecha de adquisición. También puedes subir documentos como tarjeta de circulación y póliza de seguro.',
  },
  {
    category: 'vehicles',
    question: '¿Qué significa el estado de un vehículo?',
    answer: 'Los vehículos pueden tener los siguientes estados: Activo (disponible para renta), Rentado (asignado a un cliente), Mantenimiento (en reparación), Inactivo (no disponible temporalmente), o Vendido (ya no pertenece a la flota).',
  },
  {
    category: 'vehicles',
    question: '¿Cómo asigno un vehículo a un cliente?',
    answer: 'Desde la página del vehículo, selecciona "Editar" y en el campo "Cliente" elige el cliente al que deseas asignarlo. También puedes hacerlo desde la página del cliente en la sección de vehículo asignado.',
  },
  {
    category: 'vehicles',
    question: '¿Qué es el kilometraje de mantenimiento?',
    answer: 'Es el kilometraje estimado en el que el vehículo requerirá su próximo mantenimiento. El sistema te alertará cuando el vehículo se acerque a este kilometraje basándose en el registro diario de kilometraje.',
  },
  
  // Clientes
  {
    category: 'clients',
    question: '¿Qué es el Client Score?',
    answer: 'El Client Score es una calificación automática (0-100) que evalúa el comportamiento del cliente basándose en: historial de pagos, saldo actual, días de mora, y frecuencia de pagos. Un score alto indica un cliente confiable.',
  },
  {
    category: 'clients',
    question: '¿Cómo se calcula el saldo de un cliente?',
    answer: 'El saldo se calcula automáticamente sumando todos los ingresos (rentas, cargos) y restando los pagos realizados. El sistema actualiza el balance en tiempo real con cada transacción registrada.',
  },
  {
    category: 'clients',
    question: '¿Puedo tener un cliente sin vehículo asignado?',
    answer: 'Sí, puedes registrar clientes sin asignarles un vehículo. Esto es útil para clientes potenciales o clientes que retornaron su vehículo pero mantienen un historial en el sistema.',
  },
  {
    category: 'clients',
    question: '¿Qué documentos puedo subir de un cliente?',
    answer: 'Puedes subir: fotografía del cliente, INE/identificación oficial, licencia de conducir (frente y reverso), y cualquier documento adicional relevante como comprobantes de domicilio o referencias.',
  },
  
  // Finanzas
  {
    category: 'financial',
    question: '¿Qué tipos de categorías financieras existen?',
    answer: 'Las categorías se dividen en: Ingresos (rentas, pagos de clientes), Egresos (mantenimientos, seguros, impuestos), y Pagos (abonos a créditos). Cada categoría puede afectar el balance del cliente, socio o ninguno.',
  },
  {
    category: 'financial',
    question: '¿Cómo registro un gasto de mantenimiento?',
    answer: 'Ve a "Finanzas" > "Gastos" y haz clic en "Nuevo Gasto". Selecciona la categoría (ej: Mantenimiento), el vehículo relacionado, el monto, fecha y método de pago. Adjunta el comprobante si es necesario.',
  },
  {
    category: 'financial',
    question: '¿Qué es un pago pendiente?',
    answer: 'Un pago pendiente es un ingreso que ha sido registrado pero aún no se ha cobrado. Es útil para llevar control de rentas que se pagarán posteriormente o pagos parciales acordados con el cliente.',
  },
  {
    category: 'financial',
    question: '¿Puedo editar un registro financiero ya creado?',
    answer: 'Sí, puedes editar registros financieros haciendo clic en el botón de editar. Sin embargo, los cambios en montos o categorías pueden afectar balances históricos, por lo que se recomienda precaución.',
  },
  
  // Rentabilidad
  {
    category: 'profitability',
    question: '¿Cómo se calcula la rentabilidad de un vehículo?',
    answer: 'La rentabilidad se calcula restando todos los gastos asociados al vehículo (mantenimientos, seguros, impuestos) de los ingresos generados (rentas). El resultado muestra la ganancia o pérdida neta del vehículo.',
  },
  {
    category: 'profitability',
    question: '¿Qué es el punto de equilibrio de un vehículo?',
    answer: 'El punto de equilibrio es el tiempo estimado en que el vehículo recuperará su costo de adquisición basándose en la rentabilidad actual. Se muestra en meses o años.',
  },
  {
    category: 'profitability',
    question: '¿Por qué un vehículo puede mostrar pérdida?',
    answer: 'Un vehículo muestra pérdida cuando los gastos (mantenimientos frecuentes, seguros altos, impuestos) superan los ingresos por rentas. Puede deberse a baja ocupación, costos operativos elevados o tarifas de renta muy bajas.',
  },
  
  // Seguridad
  {
    category: 'security',
    question: '¿Qué roles de usuario existen?',
    answer: 'Los roles son: Super Admin (acceso total a todo), Admin (acceso total a su empresa), Editor (puede crear/editar pero no eliminar), Viewer/Socio (solo lectura), Partner (acceso limitado a sus vehículos), Client (solo ve su información).',
  },
  {
    category: 'security',
    question: '¿Puedo cambiar el rol de un usuario?',
    answer: 'Sí, los administradores pueden cambiar el rol de los usuarios desde la sección "Usuarios". Sin embargo, solo un Super Admin puede crear o modificar usuarios con rol de administrador.',
  },
  {
    category: 'security',
    question: '¿Qué pasa si elimino un usuario?',
    answer: 'Los usuarios no se eliminan permanentemente, se marcan como "eliminados" y pierden acceso al sistema. Esto mantiene el historial de acciones realizadas por el usuario para fines de auditoría.',
  },
  
  // Configuración
  {
    category: 'settings',
    question: '¿Cómo cambio mi plan de suscripción?',
    answer: 'Ve a "Configuración" > "Suscripción y Planes". Ahí podrás ver los planes disponibles y hacer upgrade. El cambio es inmediato y se prorratea el costo según tu ciclo de facturación actual.',
  },
  {
    category: 'settings',
    question: '¿Qué límites tiene mi plan?',
    answer: 'Cada plan tiene límites de vehículos y usuarios: Starter (5 vehículos, 1 usuario), Pro (15 vehículos, 3 usuarios), Enterprise (ilimitado). Puedes ver tu uso actual en la página de Suscripción.',
  },
  {
    category: 'settings',
    question: '¿Cómo subo la plantilla de contrato?',
    answer: 'Ve a "Configuración" > "Empresas", selecciona tu empresa y sube el archivo PDF del contrato. Esta plantilla se usará para generar contratos automáticamente para nuevos clientes.',
  },
  
  // Reportes
  {
    category: 'reports',
    question: '¿Qué tipos de reportes puedo generar?',
    answer: 'Puedes generar: Reporte de flota (resumen de vehículos), Reporte financiero (ingresos vs gastos), Reporte de clientes (morosidad, scores), Reporte de mantenimiento (próximos servicios), y más.',
  },
  {
    category: 'reports',
    question: '¿En qué formato se descargan los reportes?',
    answer: 'Los reportes se pueden descargar en Excel (.xlsx) para análisis de datos, PDF para presentación, o CSV para importación a otros sistemas. El plan Starter solo incluye vista en pantalla.',
  },
  {
    category: 'reports',
    question: '¿Puedo programar envío automático de reportes?',
    answer: 'Sí, en la sección de Reportes puedes configurar envío automático semanal o mensual por email. Esta función está disponible en planes Pro y Enterprise.',
  },
  
  // Alertas
  {
    category: 'alerts',
    question: '¿Qué tipos de alertas hay?',
    answer: 'El sistema genera alertas de: Mantenimiento próximo (por kilometraje), Seguro por vencer, Licencia por vencer, Cliente moroso, Vehículo sin renta, Crédito por terminar, y más.',
  },
  {
    category: 'alerts',
    question: '¿Cómo configuro las alertas de mantenimiento?',
    answer: 'Ve a "Configuración" > "Mi Configuración" > "Alertas". Define el kilometraje o días de anticipación con los que quieres ser alertado antes del mantenimiento programado.',
  },
  {
    category: 'alerts',
    question: '¿Puedo recibir alertas por WhatsApp?',
    answer: 'Sí, la notificación por WhatsApp está disponible en planes Pro y Enterprise. Configúralo en "Configuración" > "Notificaciones". Requiere número de teléfono válido.',
  },
  
  // Mensajería
  {
    category: 'messages',
    question: '¿Cómo envío mensajes a mis clientes?',
    answer: 'Ve a "Mensajería", selecciona "Nuevo Mensaje", elige los destinatarios (individuales o masivo), escribe el mensaje y envía. Puedes usar plantillas predefinidas para ahorrar tiempo.',
  },
  {
    category: 'messages',
    question: '¿Qué son las plantillas de mensajes?',
    answer: 'Las plantillas son mensajes predefinidos que puedes usar recurrentemente: recordatorios de pago, confirmaciones de renta, avisos de mantenimiento, etc. Puedes crear plantillas personalizadas.',
  },
  {
    category: 'messages',
    question: '¿Puedo ver el historial de mensajes enviados?',
    answer: 'Sí, en la sección de Mensajería puedes ver el registro de todos los mensajes enviados, su estado (entregado, leído, fallido) y la fecha de envío.',
  },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Preguntas Frecuentes (FAQ)</h1>
        <p className="text-muted-foreground">
          Encuentra respuestas a las preguntas más comunes sobre FleetEase
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar preguntas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {faqCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {category.label}
            </Button>
          );
        })}
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron preguntas que coincidan con tu búsqueda</p>
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <Card key={index} className={cn(isExpanded && 'border-blue-300 dark:border-blue-700')}>
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <CardTitle className="text-base font-medium">{faq.question}</CardTitle>
                      </div>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-200 shrink-0",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="pl-8 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle>¿No encontraste tu respuesta?</CardTitle>
          <CardDescription>
            Nuestro equipo de soporte está aquí para ayudarte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <h4 className="font-medium mb-2">Soporte Técnico</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Para problemas técnicos o preguntas sobre funcionalidades
              </p>
              <a 
                href="mailto:soporte@fleetease.mx"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                soporte@fleetease.mx
              </a>
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-2">Ventas</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Para información sobre planes y precios
              </p>
              <a 
                href="mailto:ventas@fleetease.mx"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                ventas@fleetease.mx
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
