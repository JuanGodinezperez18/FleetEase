"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  TrendingUp,
  Users,
  Activity,
  Target,
  PieChart,
  Sparkles,
  Menu,
  X,
  Star,
  Car,
  Building,
  ChevronRight,
  Zap,
  Shield,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { plans } from '@/config/plans';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const floatVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export default function LandingPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // Smooth parallax with spring physics
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const smoothHeroY = useSpring(heroY, springConfig);
  const smoothHeroOpacity = useSpring(heroOpacity, springConfig);
  const smoothHeroScale = useSpring(heroScale, springConfig);

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <GlobalLoader />;
  }

  const navLinks = [
    { name: "Características", href: "#features" },
    { name: "Precios", href: "#pricing" },
    { name: "FAQ", href: "#faq" }
  ];

  const features = [
    { title: "Seguimiento de Rentabilidad", desc: "Métricas de ROI en vivo por vehículo con análisis predictivo.", icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
    { title: "Salud de la Flotilla", desc: "Alertas de mantenimiento predictivo con inteligencia artificial.", icon: Activity, color: "from-blue-500 to-cyan-600" },
    { title: "Telemetría en Tiempo Real", desc: "Sincronización de GPS y estado del motor con monitoreo en vivo.", icon: Target, color: "from-violet-500 to-purple-600" },
    { title: "Reportes Operativos", desc: "Análisis financiero profundo con información automatizada.", icon: PieChart, color: "from-orange-500 to-amber-600" },
  ];

  const stats = [
    { value: "10K+", label: "Vehículos Activos", icon: Car },
    { value: "$2.5M", label: "Ingresos Administrados", icon: TrendingUp },
    { value: "99.9%", label: "Disponibilidad", icon: Activity },
    { value: "500+", label: "Empresas", icon: Building },
  ];

  const testimonials = [
    {
      quote: "FleetEase transformó la forma en que administramos nuestra flotilla. El seguimiento de ROI cambió las reglas del juego.",
      author: "Maria Rodriguez",
      role: "Gerente de Flotilla, TransportCorp",
      rating: 5,
    },
    {
      quote: "La mejor inversión que hicimos. El mantenimiento predictivo nos ahorró miles de pesos.",
      author: "Carlos Mendez",
      role: "Director de Operaciones, Logistics Plus",
      rating: 5,
    },
    {
      quote: "La telemetría en tiempo real nos da una visibilidad sin precedentes de nuestras operaciones.",
      author: "Ana Garcia",
      role: "CEO, Swift Transport",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dae2fd] font-sans overflow-hidden selection:bg-[#2e5bff] selection:text-white">
      {/* Animated Background Orbs */}
      {/* Antes: 3 blobs a pantalla completa con blur-[200px] animando
          scale/opacity infinitamente para siempre (incluso fuera de
          vista) - es el mayor costo de rendimiento continuo de la
          página. Se dejan estáticos: mismo efecto visual de fondo,
          sin recalcular el filtro blur en cada frame. */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#2e5bff] rounded-full blur-[200px] opacity-[0.12]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#8342f4] rounded-full blur-[200px] opacity-[0.1]" />
        <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-[#00d4ff] rounded-full blur-[150px] opacity-[0.06]" />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 w-full z-50 bg-[#060e20]/60 backdrop-blur-[20px] border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <motion.div
              className="relative w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden"
              whileHover={{ rotate: 5 }}
            >
              <Image src="/logo.png" alt="FleetEase" width={32} height={32} priority className="w-8 h-8 object-contain" />
            </motion.div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white">FleetEase</span>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.3 }}
              >
                <Link
                  href={link.href}
                  className="text-[#c4c5d9] hover:text-white transition-colors text-sm font-medium tracking-wide relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff] group-hover:w-full transition-all duration-300" />
                </Link>
              </motion.div>
            ))}
            <div className="flex items-center gap-4 border-l border-[#2d3449] pl-10">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Link href="/login" className="text-[#c4c5d9] hover:text-white transition-colors text-sm font-medium">
                  Iniciar Sesión
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href="/registro">
                  <motion.button
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff] text-[#001356] font-semibold text-sm relative overflow-hidden group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10">Comenzar</span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-[#2e5bff] to-[#b8c3ff]"
                      initial={{ x: "100%" }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="md:hidden text-[#dae2fd] p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            <AnimatePresence mode="wait">
              {isMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden bg-[#0b1326] border-b border-[#2d3449] overflow-hidden"
            >
              <div className="p-6 flex flex-col gap-6">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={link.href}
                      className="text-lg font-medium text-[#c4c5d9] hover:text-white block"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                <div className="h-px bg-[#2d3449]" />
                <Link href="/login" className="text-lg font-medium text-[#c4c5d9]" onClick={() => setIsMenuOpen(false)}>
                  Iniciar Sesión
                </Link>
                <Link href="/registro" onClick={() => setIsMenuOpen(false)}>
                  <motion.button
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff] text-[#001356] font-bold text-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Comenzar
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="relative z-10 pt-32 lg:pt-48 pb-20">
        {/* Hero Section */}
        <section className="px-6 lg:px-12 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Hero Content */}
            <motion.div
              className="flex-1 text-center lg:text-left"
              style={{ opacity: smoothHeroOpacity, y: smoothHeroY, scale: smoothHeroScale }}
            >
              <motion.div variants={containerVariants} initial="hidden" animate="visible">
                {/* Badge */}
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#131b2e] border border-[#2d3449] mb-8 group cursor-pointer hover:border-[#4edea3]/50 transition-colors">
                  <motion.span
                    className="flex h-2 w-2 rounded-full bg-[#4edea3]"
                    animate={{
                      boxShadow: [
                        "0 0 0px #4edea3",
                        "0 0 10px #4edea3",
                        "0 0 0px #4edea3",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-sm font-medium text-[#c4c5d9]">FleetEase 2.0 ya está aquí</span>
                  <Sparkles className="w-4 h-4 text-[#4edea3]" />
                </motion.div>

                {/* Heading */}
                <motion.h1
                  variants={itemVariants}
                  className="font-heading text-5xl lg:text-7xl leading-[1.1] font-extrabold tracking-[-0.03em] mb-8 text-white"
                >
                  El Futuro de la{" "}
                  <span className="relative">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff]">
                      Gestión de Flotillas
                    </span>
                    <motion.svg
                      className="absolute -bottom-2 left-0 w-full"
                      viewBox="0 0 300 12"
                      fill="none"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1, delay: 1 }}
                    >
                      <motion.path
                        d="M2 10C50 2 100 2 298 10"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#b8c3ff" />
                          <stop offset="100%" stopColor="#2e5bff" />
                        </linearGradient>
                      </defs>
                    </motion.svg>
                  </span>
                </motion.h1>

                {/* Description */}
                <motion.p
                  variants={itemVariants}
                  className="text-xl text-[#c4c5d9] leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-12 font-light"
                >
                  Convierte las operaciones de tu flotilla en un ecosistema vivo y receptivo.
                  Identifica exactamente qué vehículos generan ganancias y cuáles consumen capital, con total claridad.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
                  <Link href="/registro">
                    <motion.button
                      className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff] text-[#001356] font-bold text-lg relative overflow-hidden group"
                      whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(46,91,255,0.4)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Comenzar Prueba Gratis
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.span>
                      </span>
                    </motion.button>
                  </Link>
                  <Link href="#features">
                    <motion.button
                      className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#131b2e] text-white font-semibold text-lg border border-[#2d3449] relative overflow-hidden group"
                      whileHover={{ scale: 1.05, backgroundColor: "#171f33" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <motion.span
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        >
                          <Zap className="w-5 h-5 text-[#4edea3]" />
                        </motion.span>
                        Explorar Funciones
                      </span>
                    </motion.button>
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              className="flex-1 w-full max-w-lg relative"
              initial={{ opacity: 0, x: 100, rotateY: 10 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="aspect-square rounded-[2rem] bg-gradient-to-br from-[#131b2e] to-[#0b1326] border border-[#2d3449]/50 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                variants={floatVariants}
                animate="animate"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Dashboard Preview */}
                <div className="absolute inset-4 rounded-xl bg-[#0b1326] border border-[#2d3449]/50 overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-[#2d3449]/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                      <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    </div>
                    <div className="h-2 w-20 bg-[#2d3449] rounded-full" />
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="p-3 rounded-lg bg-[#131b2e] border border-[#2d3449]/30"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <div className="h-2 w-12 bg-[#2d3449] rounded-full mb-2" />
                          <div className="h-6 w-20 bg-gradient-to-r from-[#2e5bff]/50 to-transparent rounded" />
                        </motion.div>
                      ))}
                    </div>

                    {/* Chart Area */}
                    <motion.div
                      className="h-24 rounded-lg bg-[#131b2e] border border-[#2d3449]/30 p-3 relative overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-16 flex items-end gap-1 px-2">
                        {[40, 60, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-[#2e5bff] to-[#2e5bff]/50 rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: 0.8 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Floating Elements */}
                <motion.div
                  className="absolute -right-4 top-1/4 p-3 rounded-xl bg-[#131b2e] border border-[#2d3449]/50 shadow-xl"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </motion.div>

                <motion.div
                  className="absolute -left-4 bottom-1/3 p-3 rounded-xl bg-[#131b2e] border border-[#2d3449]/50 shadow-xl"
                  animate={{
                    y: [0, 10, 0],
                    rotate: [0, -5, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <Activity className="w-6 h-6 text-blue-400" />
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <motion.section
          className="py-20 px-6 lg:px-12 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-[#131b2e]/50 border border-[#2d3449]/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.05, borderColor: "rgba(46, 91, 255, 0.3)" }}
              >
                <motion.div
                  className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-[#2e5bff]/20 to-[#8342f4]/20 flex items-center justify-center"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <stat.icon className="w-6 h-6 text-[#b8c3ff]" />
                </motion.div>
                <motion.p
                  className="text-3xl lg:text-4xl font-bold text-white mb-2"
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-sm text-[#c4c5d9]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features Section */}
        <section id="features" className="py-32 px-6 lg:px-12 max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#131b2e] border border-[#2d3449] text-sm font-medium text-[#c4c5d9] mb-6"
              whileHover={{ scale: 1.05 }}
            >
              <Sparkles className="w-4 h-4 text-[#4edea3]" />
              Funciones
            </motion.span>
            <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
              Ecosistema Inteligente
            </h2>
            <p className="text-[#c4c5d9] text-xl max-w-2xl mx-auto">
              Más allá de tablas estáticas. La estrategia anti-plantilla para la gestión de flotillas moderna.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className={`group relative overflow-hidden rounded-2xl bg-[#0b1326] p-8 border border-[#2d3449]/50 ${
                  index === 0 ? "md:col-span-2" : ""
                }`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.02, borderColor: "rgba(67, 70, 86, 0.8)" }}
              >
                {/* Gradient background on hover */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />

                {/* Glow effect */}
                <motion.div
                  className="absolute -right-20 -top-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color.includes("emerald") ? "#10b981" : feature.color.includes("blue") ? "#3b82f6" : feature.color.includes("violet") ? "#8b5cf6" : "#f59e0b"}, transparent)`,
                  }}
                />

                <div className="relative z-10">
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} p-0.5 mb-6`}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <div className="w-full h-full rounded-2xl bg-[#0b1326] flex items-center justify-center">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                  </motion.div>

                  <h3 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-[#c4c5d9] text-lg max-w-lg">{feature.desc}</p>

                  {index === 0 && (
                    <div className="mt-8 flex gap-4">
                      <motion.div
                        className="flex-1 h-32 bg-[#131b2e] rounded-xl relative overflow-hidden border border-[#2d3449]"
                        whileHover={{ scale: 1.02 }}
                      >
                        <motion.div
                          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-emerald-500/30 to-transparent border-t-2 border-emerald-500/50"
                          initial={{ height: 0 }}
                          whileInView={{ height: "60%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </motion.div>
                      <motion.div
                        className="flex-1 h-32 bg-[#131b2e] rounded-xl relative overflow-hidden border border-[#2d3449]"
                        whileHover={{ scale: 1.02 }}
                      >
                        <motion.div
                          className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-rose-500/30 to-transparent border-t-2 border-rose-500/50"
                          initial={{ height: 0 }}
                          whileInView={{ height: "30%" }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.7, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </motion.div>
                    </div>
                  )}
                </div>

                {/* Arrow indicator */}
                <motion.div
                  className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ x: -10 }}
                  whileHover={{ x: 0 }}
                >
                  <ChevronRight className="w-6 h-6 text-[#b8c3ff]" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-32 px-6 lg:px-12 bg-[#0b1326]/50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
                Confiado por Líderes de la Industria
              </h2>
              <p className="text-[#c4c5d9] text-xl">
                Mira lo que dicen nuestros clientes sobre FleetEase.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.author}
                  className="relative p-8 rounded-2xl bg-[#131b2e] border border-[#2d3449]/50"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -5, borderColor: "rgba(67, 70, 86, 0.8)" }}
                >
                  {/* Quote icon */}
                  <motion.div
                    className="absolute -top-4 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-[#2e5bff] to-[#8342f4] flex items-center justify-center"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 400 }}
                  >
                    <span className="text-white text-lg font-serif">"</span>
                  </motion.div>

                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 + 0.2 + i * 0.05, type: "spring" }}
                      >
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-[#c4c5d9] mb-6 leading-relaxed">{testimonial.quote}</p>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2e5bff] to-[#8342f4] flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {testimonial.author.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{testimonial.author}</p>
                      <p className="text-[#c4c5d9] text-xs">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 px-6 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
                Precios Simples y Transparentes
              </h2>
              <p className="text-[#c4c5d9] text-xl">Elige el plan que se ajuste a tu flotilla.</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {(Object.values(plans) as any[]).map((plan: any, planIndex: number) => {
                const isPopular = !!plan.popular;
                return (
                  <motion.div
                    key={plan.id}
                    className={
                      isPopular
                        ? "p-8 rounded-2xl bg-gradient-to-b from-[#171f33] to-[#131b2e] border-2 border-[#2e5bff] relative flex flex-col md:-translate-y-4 shadow-[0_20px_50px_rgba(46,91,255,0.2)]"
                        : "p-8 rounded-2xl bg-[#131b2e] border border-[#2d3449] flex flex-col"
                    }
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: planIndex * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={isPopular ? { y: -12 } : { y: -8, borderColor: "rgba(67, 70, 86, 0.8)" }}
                  >
                    {isPopular && (
                      <motion.div
                        className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#2e5bff] to-[#8342f4] text-white text-xs font-bold tracking-wider uppercase rounded-full"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                      >
                        Más Popular
                      </motion.div>
                    )}
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-heading font-extrabold text-white">${plan.price}</span>
                      <span className="text-[#c4c5d9]">MXN/{plan.period}</span>
                    </div>
                    <p className="text-[#c4c5d9] text-sm mb-8">{plan.description}</p>
                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature: string, i: number) => (
                        <motion.li
                          key={i}
                          className="flex gap-3 text-sm text-[#c4c5d9]"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: planIndex * 0.1 + i * 0.05 }}
                        >
                          <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isPopular ? 'text-[#b8c3ff]' : 'text-emerald-400'}`} />
                          {feature}
                        </motion.li>
                      ))}
                    </ul>
                    <Link href="/registro">
                      <motion.button
                        className={
                          isPopular
                            ? "w-full py-3 rounded-xl bg-gradient-to-r from-[#2e5bff] to-[#8342f4] text-white font-bold hover:shadow-[0_0_30px_rgba(46,91,255,0.4)] transition-all"
                            : "w-full py-3 rounded-xl border border-[#434656] text-white font-medium hover:bg-[#171f33] transition-colors"
                        }
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isPopular ? 'Prueba Gratis de 14 Días' : plan.id === 'enterprise' ? 'Contactar Ventas' : 'Comenzar'}
                      </motion.button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-32 px-6 lg:px-12 max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
              Preguntas Frecuentes
            </h2>
            <p className="text-[#c4c5d9] text-xl">Todo lo que necesitas saber sobre FleetEase.</p>
          </motion.div>

          <div className="space-y-4">
            {[
              { q: "¿Se requiere tarjeta de crédito para la prueba?", a: "No. La activación es instantánea, sin compromiso financiero." },
              { q: "¿Qué tan rápida es la integración?", a: "La mayoría de las flotillas completan la configuración en menos de 48 horas." },
              { q: "¿Puedo exportar mis datos?", a: "Todos tus datos se pueden exportar vía CSV o conectar directamente por API." },
              { q: "¿Qué pasa si excedo los límites de mi plan?", a: "El sistema te avisa automáticamente. El servicio nunca se interrumpe." },
            ].map((faq, i) => (
              <motion.details
                key={i}
                className="group bg-[#131b2e] rounded-2xl border border-[#2d3449] overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ borderColor: "rgba(67, 70, 86, 0.8)" }}
              >
                <summary className="cursor-pointer p-6 flex justify-between items-center text-lg font-medium text-white list-none">
                  {faq.q}
                  <motion.span
                    className="text-[#434656] group-open:rotate-45 transition-transform duration-300"
                    whileHover={{ scale: 1.2 }}
                  >
                    +
                  </motion.span>
                </summary>
                <motion.div
                  className="px-6 pb-6 text-[#c4c5d9] leading-relaxed"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  {faq.a}
                </motion.div>
              </motion.details>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 lg:px-12">
          <motion.div
            className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-[#131b2e] to-[#0b1326] border border-[#2d3449] relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#2e5bff]/10 via-transparent to-[#8342f4]/10" />

            <motion.div
              className="relative z-10"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.h2
                variants={itemVariants}
                className="font-heading text-4xl lg:text-5xl font-bold text-white mb-6"
              >
                ¿Listo para Transformar tu Flotilla?
              </motion.h2>
              <motion.p variants={itemVariants} className="text-[#c4c5d9] text-xl mb-8 max-w-2xl mx-auto">
                Únete a miles de empresas que ya usan FleetEase para optimizar sus operaciones.
              </motion.p>
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/registro">
                  <motion.button
                    className="px-8 py-4 rounded-full bg-gradient-to-r from-[#b8c3ff] to-[#2e5bff] text-[#001356] font-bold text-lg relative overflow-hidden group"
                    whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(46,91,255,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Comenzar Prueba Gratis
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </motion.button>
                </Link>
                <motion.button
                  className="px-8 py-4 rounded-full border border-[#434656] text-white font-semibold text-lg hover:bg-[#171f33] transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Agendar Demo
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#060e20] border-t border-[#131b2e] py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="FleetEase" width={24} height={24} className="w-6 h-6 object-contain" />
              </div>
              <span className="font-heading font-bold text-white tracking-wide">FleetEase</span>
            </motion.div>
            <div className="flex items-center gap-8">
              {[
                { label: "Privacidad", href: "/privacidad" },
                { label: "Términos", href: "/terminos" },
                { label: "Contacto", href: "#" },
              ].map((link, i) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  className="text-[#8e90a2] text-sm hover:text-white transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </div>
            <motion.p
              className="text-[#8e90a2] text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              © 2026 FleetEase. Todos los derechos reservados.
            </motion.p>
          </div>
        </div>
      </footer>
    </div>
  );
}
