export const productViews = [
  {
    label: 'Operación', screen: 'vehicles',
    title: 'La operación de cada vehículo',
    description: 'Organiza vehículos, clientes, asignaciones y cobranza. Consulta qué unidad está disponible, quién la tiene y qué queda pendiente.',
    details: ['Vehículos y clientes', 'Asignaciones y rentas', 'Seguimiento de cobranza'],
    alt: 'Vehículos de FleetEase con unidades QA, disponibilidad y estados de la flotilla.',
  },
  {
    label: 'Finanzas', screen: 'finance',
    title: 'Los números de tu flotilla',
    description: 'Reúne ingresos, gastos, pagos y créditos para revisar el resultado de tu operación y la rentabilidad por unidad.',
    details: ['Ingresos y gastos', 'Pagos y créditos', 'Rentabilidad por vehículo'],
    alt: 'Análisis financiero de FleetEase con ingresos, gastos y utilidad de una cuenta QA.',
  },
  {
    label: 'Mantenimiento', screen: 'maintenance',
    title: 'La continuidad de tus unidades',
    description: 'Registra kilometraje y servicios. Identifica los mantenimientos próximos y las unidades que necesitan atención.',
    details: ['Servicios y kilometraje', 'Documentos y vencimientos', 'Alertas de seguimiento'],
    alt: 'Kilometraje de FleetEase con mantenimientos urgentes y próximos de unidades QA.',
  },
] as const;
