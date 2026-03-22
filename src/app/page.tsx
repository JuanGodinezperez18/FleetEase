"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle, 
  TrendingUp, 
  Shield, 
  Zap, 
  Users, 
  DollarSign,
  AlertTriangle,
  BarChart3,
  Smartphone,
  Building,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-provider';
import { GlobalLoader } from '@/components/common/GlobalLoader';

export default function LandingPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.7]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <GlobalLoader />;
  }

  const features = [
    {
      icon: TrendingUp,
      title: "Rentabilidad en Tiempo Real",
      description: "Sabe exactamente qué vehículo gana dinero y cuál pierde. Toma decisiones basadas en datos, no en intuición.",
      color: "text-green-600"
    },
    {
      icon: AlertTriangle,
      title: "Alertas Inteligentes",
      description: "El sistema te avisa antes de que pierdas dinero: clientes morosos, vehículos sin renta, mantenimientos vencidos.",
      color: "text-amber-600"
    },
    {
      icon: BarChart3,
      title: "Client Score",
      description: "Calificación automática de clientes (0-100) basada en historial de pagos, saldo y comportamiento.",
      color: "text-blue-600"
    },
    {
      icon: Shield,
      title: "Listo para México",
      description: "Control de efectivo vs transferencia, reportes de corte de caja, integración con SAT (próximamente).",
      color: "text-purple-600"
    },
    {
      icon: Users,
      title: "Multi-Usuario",
      description: "Acceso para administradores, editores, partners y clientes. Cada uno con su nivel de permisos.",
      color: "text-orange-600"
    },
    {
      icon: Smartphone,
      title: "100% Online",
      description: "Accede desde cualquier dispositivo. App progresiva instalable. Funciona incluso sin conexión.",
      color: "text-pink-600"
    }
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$299",
      period: "/mes",
      description: "Para flotillas pequeñas que comienzan",
      features: [
        "Hasta 5 vehículos",
        "1 usuario admin",
        "Gestión de clientes y vehículos",
        "Registro de ingresos y gastos",
        "Dashboard básico",
        "Soporte por email"
      ],
      cta: "Comenzar Gratis",
      popular: false
    },
    {
      name: "Pro",
      price: "$599",
      period: "/mes",
      description: "El más popular para renta de apps",
      features: [
        "Hasta 15 vehículos",
        "3 usuarios",
        "Rentabilidad por vehículo",
        "Alertas de mantenimiento",
        "Client Score",
        "Reportes en Excel",
        "Soporte prioritario"
      ],
      cta: "Prueba 14 Días Gratis",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$999",
      period: "/mes",
      description: "Para empresas que escalan",
      features: [
        "Vehículos ilimitados",
        "Usuarios ilimitados",
        "Todas las features Pro",
        "Multi-empresa",
        "API de integración",
        "Soporte 24/7",
        "Personalización de marca"
      ],
      cta: "Contactar Ventas",
      popular: false
    }
  ];

  const stats = [
    { value: "23%", label: "Reducción de costos promedio" },
    { value: "15%", label: "Aumento en ocupación" },
    { value: "30%", label: "Menos morosidad" },
    { value: "10h", label: "Ahorradas por semana" }
  ];

  const faqs = [
    {
      question: "¿Necesito tarjeta de crédito para comenzar?",
      answer: "No. El plan Starter es 100% gratuito y no requiere tarjeta. Puedes upgrade cuando lo necesites."
    },
    {
      question: "¿Puedo cambiar de plan después?",
      answer: "Sí, puedes upgrade o downgrade en cualquier momento. Los cambios se aplican inmediatamente."
    },
    {
      question: "¿Qué pasa si supero el límite de vehículos?",
      answer: "Te notificamos cuando estás por llegar al límite. Solo necesitas hacer upgrade al siguiente plan."
    },
    {
      question: "¿Incluye facturación SAT?",
      answer: "El plan Pro incluye integración con SAT para generación de CFDI 4.0. El plan Starter no incluye esta feature."
    },
    {
      question: "¿Puedo cancelar cuando quiera?",
      answer: "Sí, sin preguntas ni letras chiquitas. Tu cuenta permanece activa hasta el final del período pagado."
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
                <Image
                  src="/logo.png"
                  alt="FleetEase"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                FleetEase
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Características
              </Link>
              <Link href="#pricing" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Precios
              </Link>
              <Link href="#faq" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                FAQ
              </Link>
              <Link href="/login" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/registro" className="inline-block">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                  Comenzar Gratis
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-400"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
          >
            <div className="px-4 py-4 space-y-4">
              <Link href="#features" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                Características
              </Link>
              <Link href="#pricing" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                Precios
              </Link>
              <Link href="#faq" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                FAQ
              </Link>
              <Link href="/login" className="block text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
                Iniciar Sesión
              </Link>
              <Link href="/registro" className="inline-block w-full">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700">
                  Comenzar Gratis
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-20 lg:py-32"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-slate-500/5 dark:bg-slate-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
            transition={{ duration: 25, repeat: Infinity }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Prueba gratis 14 días • Sin tarjeta de crédito
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-6">
                Control de Rentabilidad para{' '}
                <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  Flotas de Vehículos
                </span>
              </h1>

              <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
                FleetEase te dice exactamente <strong className="text-slate-900 dark:text-slate-100">qué vehículo gana dinero y cuál pierde</strong>. 
                En 30 días, identificas y eliminas las unidades que te hacen perder dinero.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Link href="/registro" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg"
                  >
                    Comenzar Gratis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#features" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 px-8 text-lg"
                  >
                    Ver Características
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="text-center"
                  >
                    <div className="text-3xl lg:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Características que Marcan la Diferencia
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              No somos otro sistema de gestión. Somos tu herramienta de decisiones de negocio.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-300">
                  <CardContent className="pt-6">
                    <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Planes Simples y Transparentes
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Comienza gratis. Crece cuando lo necesites. Sin contratos forzosos.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className={`relative h-full ${
                  plan.popular 
                    ? 'border-2 border-blue-600 shadow-xl shadow-blue-500/20' 
                    : 'border-slate-200 dark:border-slate-800'
                }`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                      Más Popular
                    </div>
                  )}
                  <CardContent className="pt-8 pb-6 px-6">
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-5xl font-bold text-slate-900 dark:text-slate-100">
                          {plan.price}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {plan.period}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {plan.description}
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-600 dark:text-slate-400">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/registro" className="block">
                      <Button
                        className={`w-full h-12 ${
                          plan.popular
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                            : 'bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200'
                        }`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Preguntas Frecuentes
            </h2>
          </motion.div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Comienza a Optimizar tu Flota Hoy
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Únete a empresas que ya redujeron sus costos operativos en 23% promedio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/registro" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-white text-blue-600 hover:bg-blue-50 text-lg"
                >
                  Comenzar Prueba Gratis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contacto" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 border-2 border-white text-white hover:bg-white/10 text-lg"
                >
                  Agendar Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="FleetEase"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                </div>
                <span className="text-xl font-bold text-white">FleetEase</span>
              </div>
              <p className="text-sm">
                Control de rentabilidad para flotas de vehículos en México.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Características</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Precios</Link></li>
                <li><Link href="/registro" className="hover:text-white transition-colors">Comenzar Gratis</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
                <li><Link href="/terminos" className="hover:text-white transition-colors">Términos</Link></li>
                <li><Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentación</Link></li>
                <li><Link href="/soporte" className="hover:text-white transition-colors">Contactar Soporte</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>© 2026 FleetEase. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
