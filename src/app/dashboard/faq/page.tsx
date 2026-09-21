"use client";

import React, { useState } from 'react';
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
  Mail,
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
  {
    category: 'vehicles',
    question: '¿Cómo agrego un nuevo vehículo a mi flota?',
    answer:
      'Ve a la sección "Vehículos" en el menú lateral y haz clic en "Nuevo Vehículo". Completa el formulario con la información del vehículo: marca, modelo, año, placa, número de serie y fecha de adquisición. También puedes subir documentos como tarjeta de circulación y póliza de seguro.',
  },
  {
    category: 'vehicles',
    question: '¿Qué significa el estado de un vehículo?',
    answer:
      'Los vehículos pueden tener los siguientes estados: Activo (disponible para renta), Rentado (asignado a un cliente), Mantenimiento (en reparación), Inactivo (no disponible temporalmente) o Vendido (ya no pertenece a la flota).',
  },
  {
    category: 'vehicles',
    question: '¿Cómo asigno un vehículo a un cliente?',
    answer:
      'Desde la página del vehículo, selecciona "Editar" y en el campo "Cliente" elige el cliente al que deseas asignarlo. También puedes hacerlo desde la página del cliente en la sección de vehículo asignado.',
  },
  {
    category: 'vehicles',
    question: '¿Qué es el kilometraje de mantenimiento?',
    answer:
      'Es el kilometraje estimado en el que el vehículo requerirá su próximo mantenimiento. El sistema te alertará cuando el vehículo se acerque a este kilometraje basándose en el registro diario de kilometraje.',
  },
  {
    category: 'clients',
    question: '¿Qué es el Client Score?',
    answer:
      'El Client Score es una calificación automática (0-100) que evalúa el comportamiento del cliente basándose en: historial de pagos, saldo actual, días de mora y frecuencia de pagos. Un score alto indica un cliente confiable.',
  },
  {
    category: 'clients',
    question: '¿Cómo se calcula el saldo de un cliente?',
    answer:
      'El saldo se calcula automáticamente sumando todos los ingresos (rentas, cargos) y restando los pagos realizados. El sistema actualiza el balance en tiempo real con cada transacción registrada.',
  },
  {
    category: 'clients',
    question: '¿Puedo tener un cliente sin vehículo asignado?',
    answer:
      'Sí, puedes registrar clientes sin asignarles un vehículo. Esto es útil para clientes potenciales o clientes que retornaron su vehículo pero mantienen un historial en el sistema.',
  },
  {
    category: 'clients',
    question: '¿Qué documentos puedo subir de un cliente?',
    answer:
      'Puedes subir: fotografía del cliente, INE/identificación oficial, licencia de conducir (frente y reverso), y cualquier documento adicional relevante como comprobantes de domicilio o referencias.',
  },
  {
    category: 'financial',
    question: '¿Qué tipos de categorías financieras existen?',
    answer:
      'Las categorías se dividen en: Ingresos (rentas, pagos de clientes), Egresos (mantenimientos, seguros, impuestos) y Pagos (abonos a créditos). Cada categoría puede afectar el balance del cliente, socio o ninguno.',
  },
  {
    category: 'financial',
    question: '¿Cómo registro un gasto de mantenimiento?',
    answer:
      'Ve a "Finanzas" > "Gastos" y haz clic en "Nuevo Gasto". Selecciona la categoría (ej: Mantenimiento), el vehículo relacionado, el monto, fecha y método de pago. Adjunta el comprobante si es necesario.',
  },
  {
    category: 'financial',
    question: '¿Qué es un pago pendiente?',
    answer:
      'Un pago pendiente es un ingreso que ha sido registrado pero aún no se ha cobrado. Es útil para llevar control de rentas que se pagarán posteriormente o pagos parciales acordados con el cliente.',
  },
  {
    category: 'financial',
    question: '¿Puedo editar un registro financiero ya creado?',
    answer:
      'Sí, puedes editar registros financieros haciendo clic en el botón de editar. Sin embargo, los cambios en montos o categorías pueden afectar balances históricos, por lo que se recomienda precaución.',
  },
  {
    category: 'profitability',
    question: '¿Cómo se calcula la rentabilidad de un vehículo?',
    answer:
      'La rentabilidad se calcula restando todos los gastos asociados al vehículo (mantenimientos, seguros, impuestos) de los ingresos generados (rentas). El resultado muestra la ganancia o pérdida neta del vehículo.',
  },
  {
    category: 'profitability',
    question: '¿Qué es el punto de equilibrio de un vehículo?',
    answer:
      'El punto de equilibrio es el tiempo estimado en que el vehículo recuperará su costo de adquisición basándose en la rentabilidad actual. Se muestra en meses o años.',
  },
  {
    category: 'profitability',
    question: '¿Por qué un vehículo puede mostrar pérdida?',
    answer:
      'Un vehículo muestra pérdida cuando los gastos (mantenimientos frecuentes, seguros altos, impuestos) superan los ingresos por rentas. Puede deberse a baja ocupación, costos operativos elevados o tarifas de renta muy bajas.',
  },
  {
    category: 'security',
    question: '¿Qué roles de usuario existen?',
    answer:
      'Los roles son: Super Admin (acceso total), Admin (acceso total a su empresa), Editor (puede crear/editar pero no eliminar), Viewer/Socio (solo lectura), Partner (acceso limitado a sus vehículos), Client (solo ve su información).',
  },
  {
    category: 'security',
    question: '¿Puedo cambiar el rol de un usuario?',
    answer:
      'Sí, los administradores pueden cambiar el rol de los usuarios desde la sección "Usuarios". Sin embargo, solo un Super Admin puede crear o modificar usuarios con rol de administrador.',
  },
  {
    category: 'security',
    question: '¿Qué pasa si elimino un usuario?',
    answer:
      'Los usuarios no se eliminan permanentemente: se marcan como "eliminados" y pierden acceso al sistema. Esto mantiene el historial de acciones para fines de auditoría.',
  },
  {
    category: 'settings',
    question: '¿Cómo cambio mi plan de suscripción?',
    answer:
      'Ve a "Configuración" > "Suscripción". Ahí podrás ver los planes disponibles y hacer upgrade. El cambio es inmediato y se prorratea el costo según tu ciclo de facturación actual.',
  },
  {
    category: 'settings',
    question: '¿Qué límites tiene mi plan?',
    answer:
      'Cada plan tiene límites de vehículos y usuarios: Starter (5 vehículos, 1 usuario), Pro (15 vehículos, 3 usuarios), Enterprise (ilimitado). Puedes ver tu uso actual en la página de Suscripción.',
  },
  {
    category: 'settings',
    question: '¿Cómo subo la plantilla de contrato?',
    answer:
      'Ve a "Configuración" > "Empresas", selecciona tu empresa y sube el archivo PDF del contrato. Esta plantilla se usará para generar contratos automáticamente para nuevos clientes.',
  },
  {
    category: 'reports',
    question: '¿Qué tipos de reportes puedo generar?',
    answer:
      'Puedes generar: reporte de flota (resumen de vehículos), reporte financiero (ingresos vs gastos), reporte de clientes (morosidad, scores), reporte de mantenimiento (próximos servicios) y más.',
  },
  {
    category: 'reports',
    question: '¿En qué formato se descargan los reportes?',
    answer:
      'Los reportes se pueden descargar en Excel (.xlsx) para análisis de datos, PDF para presentación o CSV para importación a otros sistemas. El plan Starter solo incluye vista en pantalla.',
  },
  {
    category: 'reports',
    question: '¿Puedo programar envío automático de reportes?',
    answer:
      'Sí, en la sección de Reportes puedes configurar envío automático semanal o mensual por email. Esta función está disponible en planes Pro y Enterprise.',
  },
  {
    category: 'alerts',
    question: '¿Qué tipos de alertas hay?',
    answer:
      'El sistema genera alertas de: mantenimiento próximo (por kilometraje), seguro por vencer, licencia por vencer, cliente moroso, vehículo sin renta, crédito por terminar y más.',
  },
  {
    category: 'alerts',
    question: '¿Cómo configuro las alertas de mantenimiento?',
    answer:
      'Ve a "Configuración" > "Mi configuración" > "Notificaciones". Define el kilometraje o días de anticipación con los que quieres ser alertado antes del mantenimiento programado.',
  },
  {
    category: 'alerts',
    question: '¿Puedo recibir alertas por WhatsApp?',
    answer:
      'Sí, la notificación por WhatsApp está disponible en planes Pro y Enterprise. Configúralo en la configuración de la empresa. Requiere número de teléfono válido e integración activa.',
  },
  {
    category: 'messages',
    question: '¿Cómo envío mensajes a mis clientes?',
    answer:
      'Ve a "Mensajería", selecciona "Nuevo mensaje", elige los destinatarios (individuales o masivo), escribe el mensaje y envía. Puedes usar plantillas predefinidas para ahorrar tiempo.',
  },
  {
    category: 'messages',
    question: '¿Qué son las plantillas de mensajes?',
    answer:
      'Las plantillas son mensajes predefinidos que puedes usar de forma recurrente: recordatorios de pago, confirmaciones de renta, avisos de mantenimiento, etc. Puedes crear plantillas personalizadas.',
  },
  {
    category: 'messages',
    question: '¿Puedo ver el historial de mensajes enviados?',
    answer:
      'Sí, en la sección de Mensajería puedes ver el registro de todos los mensajes enviados, su estado (entregado, leído, fallido) y la fecha de envío.',
  },
];

const inputClass =
  'h-11 rounded-xl border-white/10 bg-white/[0.03] pl-10 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30';

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Ayuda
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Preguntas frecuentes
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Respuestas rápidas sobre vehículos, finanzas y configuración
          </p>
        </header>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar preguntas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2">
          {faqCategories.map(category => {
            const Icon = category.icon;
            const active = selectedCategory === category.id;
            return (
              <Button
                key={category.id}
                type="button"
                variant={active ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'h-9 gap-1.5 rounded-xl text-xs',
                  active
                    ? 'bg-[#d7ff3f] font-semibold text-black hover:bg-[#c8f02e]'
                    : 'border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {category.label}
              </Button>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="space-y-2.5">
          {filteredFaqs.length === 0 ? (
            <div className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] px-6 py-12 text-center">
              <HelpCircle
                className="mx-auto mb-3 h-10 w-10 text-white/25"
                strokeWidth={1.5}
              />
              <p className="text-sm text-white/45">
                No se encontraron preguntas que coincidan con tu búsqueda
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <div
                  key={index}
                  className={cn(
                    'overflow-hidden rounded-[16px] border transition-colors',
                    isExpanded
                      ? 'border-[#d7ff3f]/25 bg-[#d7ff3f]/[0.04]'
                      : 'border-white/[0.07] bg-[#0e1117] hover:border-white/[0.12]'
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 text-left sm:p-4.5"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        isExpanded
                          ? 'border-[#d7ff3f]/25 bg-[#d7ff3f]/10 text-[#d7ff3f]'
                          : 'border-white/10 bg-white/[0.04] text-white/45'
                      )}
                    >
                      <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-white/90">
                        {faq.question}
                      </p>
                      {isExpanded && (
                        <p className="mt-2.5 text-sm leading-relaxed text-white/55">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 text-white/35 transition-transform duration-200',
                        isExpanded && 'rotate-180 text-[#d7ff3f]'
                      )}
                      strokeWidth={1.75}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Support */}
        <section className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">¿No encontraste tu respuesta?</h2>
              <p className="mt-0.5 text-xs text-white/40">
                Nuestro equipo de soporte está para ayudarte
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <p className="text-sm font-medium text-white/85">Soporte técnico</p>
              <p className="mt-1 text-xs text-white/40">
                Problemas técnicos o preguntas sobre funcionalidades
              </p>
              <a
                href="mailto:soporte@fleetease.mx"
                className="mt-2 inline-block text-xs font-medium text-[#d7ff3f] hover:underline"
              >
                soporte@fleetease.mx
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <p className="text-sm font-medium text-white/85">Ventas</p>
              <p className="mt-1 text-xs text-white/40">Información sobre planes y precios</p>
              <a
                href="mailto:ventas@fleetease.mx"
                className="mt-2 inline-block text-xs font-medium text-[#d7ff3f] hover:underline"
              >
                ventas@fleetease.mx
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
