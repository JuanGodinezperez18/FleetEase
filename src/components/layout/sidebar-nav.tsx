"use client";

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Car as CarIcon, LayoutDashboard, Users as UsersIconLucide, DollarSign as DollarSignIcon,
  BarChart3 as BarChart3Icon, Bell as BellIcon, FileText, FolderKanban, Gauge,
  Settings as SettingsIcon, Users, Briefcase, Landmark, Building, Tags, AreaChart,
  History, MessageSquare, ChevronRight, Camera, ShieldAlert, Mail, Package, HandCoins,
  type LucideIcon
} from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { getNotificationLink } from '@/lib/notification-utils';
import { useNotificationsAnalytics } from '@/hooks/use-notifications-analytics';

const NotificationBell = () => {
  const { clients, vehicles, partners, financialRecords, clientBalances, notifications: rawNotifications, loadingData } = useData();
  const { analyzedNotifications } = useNotificationsAnalytics(rawNotifications, clients, vehicles, partners, financialRecords, clientBalances);
  const unreadCount = useMemo(() => analyzedNotifications.filter(n => !n.isRead).length, [analyzedNotifications]);
  if (loadingData) return null;
  return <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative text-inherit hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-all duration-200"><BellIcon className="w-5 h-5" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold shadow-lg animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Button></PopoverTrigger><PopoverContent className="w-80 mr-2 p-0 border-border shadow-xl" align="end"><div className="space-y-0"><div className="px-4 py-3 border-b border-border bg-muted/30"><h4 className="font-semibold text-sm">Notificaciones</h4>{unreadCount > 0 && <p className="text-xs text-muted-foreground">{unreadCount} sin leer</p>}</div><div className="max-h-[400px] overflow-y-auto">{analyzedNotifications.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No hay notificaciones</div> : analyzedNotifications.slice(0, 5).map(notif => <Link href={getNotificationLink(notif)} key={notif.id} className={cn("block px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0", !notif.isRead && "bg-primary/5")}><div className="flex items-start gap-3">{!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}<div className="flex-1 min-w-0"><p className={cn("text-sm leading-snug mb-1", !notif.isRead && "font-semibold")}>{notif.message}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale: es })}</p></div></div></Link>)}</div><div className="px-4 py-3 border-t border-border bg-muted/30"><Link href="/dashboard/notifications" className="block"><Button variant="ghost" className="w-full text-sm font-medium hover:bg-sidebar-accent">Ver todas las notificaciones</Button></Link></div></div></PopoverContent></Popover>;
};

export interface SubNavItem { href: string; label: string; icon?: LucideIcon; roles?: UserRole[]; external?: boolean; }
interface NavLinkItem { href: string; label: string; icon: LucideIcon; basePath?: string; subItems?: never; type?: 'notificationsLink'; roles?: UserRole[]; external?: boolean; }
interface NavSectionItem { href?: never; label: string; icon: LucideIcon; basePath: string; subItems: SubNavItem[]; type?: never; roles?: UserRole[]; }
export type UserRole = 'admin' | 'editor' | 'viewer' | 'superAdmin' | 'partner' | 'client';
export type NavItem = NavLinkItem | NavSectionItem;

export const navItemsBase: NavItem[] = [
  { href: '/dashboard', label: 'Panel de Control', icon: LayoutDashboard },
  { href: '/dashboard/vehicles', label: 'Vehículos', icon: CarIcon },
  { href: '/dashboard/multas', label: 'Multas', icon: ShieldAlert, roles: ['admin', 'superAdmin', 'editor'] },
  { href: '/dashboard/clients', label: 'Clientes', icon: UsersIconLucide },
  { href: '/dashboard/partners', label: 'Socios', icon: Briefcase },
  { href: '/dashboard/credits', label: 'Créditos', icon: Landmark },
  { label: 'Finanzas', icon: DollarSignIcon, basePath: '/dashboard/finanzas', subItems: [
    { href: '/dashboard/finanzas', label: 'Análisis Financiero', icon: AreaChart },
    { href: '/dashboard/finanzas/income', label: 'Ingresos', icon: FolderKanban },
    { href: '/dashboard/finanzas/payments', label: 'Pagos', icon: HandCoins },
    { href: '/dashboard/finanzas/expenses', label: 'Gastos', icon: FileText },
    { href: '/dashboard/finanzas/supplier-purchases', label: 'Proveedores', icon: Briefcase },
    { href: '/dashboard/finanzas/accounts-payable', label: 'Cuentas por pagar', icon: HandCoins },
  ] },
  { href: '/dashboard/profitability', label: 'Rentabilidad', icon: AreaChart, roles: ['admin', 'superAdmin', 'editor'] },
  { href: '/dashboard/mileage', label: 'Registro de Kilometraje', icon: Gauge },
  { href: '/dashboard/alerts', label: 'Alertas de Negocio', icon: BellIcon, roles: ['admin', 'superAdmin', 'editor'] },
  { href: '/dashboard/seguimientos', label: 'Seguimientos Fotográficos', icon: Camera, roles: ['admin', 'superAdmin', 'editor'] },
  { label: 'Reporte Ejecutivo', icon: BarChart3Icon, basePath: '/dashboard/reports', subItems: [{ href: '/dashboard/reports', label: 'Generar Reporte', icon: BarChart3Icon }, { href: '/dashboard/reports/history', label: 'Historial', icon: History }] },
  { href: '/dashboard/messages', label: 'Mensajería', icon: MessageSquare },
  { type: 'notificationsLink', href: '/dashboard/notifications', label: 'Notificaciones', icon: BellIcon },
  { label: 'Administración', icon: SettingsIcon, basePath: '/dashboard/settings', subItems: [
    { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['superAdmin', 'admin'] },
    { href: '/dashboard/companies', label: 'Empresas', icon: Building, roles: ['superAdmin'] },
    { href: '/dashboard/settings/categories', label: 'Categorías', icon: Tags, roles: ['superAdmin', 'admin'] },
    { href: '/dashboard/settings/catalogs', label: 'Catálogos', icon: Package, roles: ['superAdmin', 'admin'] },
    { href: '/dashboard/settings/company', label: 'Configuración de Empresa', icon: SettingsIcon, roles: ['superAdmin'] },
    { href: '/dashboard/settings/subscription', label: 'Suscripción y Planes', icon: DollarSignIcon },
    { href: '/dashboard/faq', label: 'Preguntas Frecuentes', icon: MessageSquare },
    { href: '/dashboard/settings', label: 'Mi Configuración', icon: SettingsIcon },
    { href: 'mailto:soporte@fleetease.mx', label: 'Contactar Soporte', icon: Mail, external: true },
  ], roles: ['superAdmin', 'admin'] },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { notifications, loadingData } = useData();
  const { currentUser } = useAuth();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const unreadNotificationsCount = useMemo(() => loadingData || !notifications ? 0 : notifications.filter(n => !n.isRead).length, [notifications, loadingData]);
  const filteredNavItems = useMemo(() => { if (!currentUser) return []; const filterItems = (items: (NavItem | SubNavItem)[]): (NavItem | SubNavItem)[] => items.filter(item => !item.roles || item.roles.includes(currentUser.role)).map(item => ('subItems' in item && item.subItems ? { ...item, subItems: filterItems(item.subItems) } : item)) as (NavItem | SubNavItem)[]; return filterItems(navItemsBase) as NavItem[]; }, [currentUser]);
  const isSectionActive = React.useCallback((baseHref?: string, subItems?: SubNavItem[]) => { if (!baseHref && !subItems) return false; if (subItems && baseHref) return pathname.startsWith(baseHref); if (baseHref) { if (baseHref === '/dashboard') return pathname === baseHref; const effectiveBaseHref = baseHref.endsWith('/') ? baseHref : baseHref + '/'; return pathname.startsWith(effectiveBaseHref) || pathname === baseHref; } return false; }, [pathname]);
  const handleToggleSection = (label: string) => setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  const handleNavigation = (href: string) => router.push(href);
  React.useEffect(() => { const activeSection = filteredNavItems.find(item => 'subItems' in item && item.subItems && item.basePath && isSectionActive(item.basePath, item.subItems)); if (activeSection && 'label' in activeSection) setOpenSections(prev => ({ ...prev, [activeSection.label]: true })); }, [pathname, filteredNavItems, isSectionActive]);
  return <SidebarMenu className="gap-1">{filteredNavItems.map(item => <SidebarMenuItem key={item.label}>{'subItems' in item && item.subItems ? <><SidebarMenuButton onClick={() => handleToggleSection(item.label)} isActive={isSectionActive(item.basePath, item.subItems)} tooltip={item.label} aria-label={item.label} className={cn('group relative', 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', 'transition-all duration-200', isSectionActive(item.basePath, item.subItems) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium')}><div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300', isSectionActive(item.basePath, item.subItems) && 'h-8')} /><item.icon className={cn('h-5 w-5 shrink-0 transition-all duration-200', isSectionActive(item.basePath, item.subItems) ? 'text-primary' : 'group-hover:scale-110')} />{state === 'expanded' && <><span className="flex-1">{item.label}</span><ChevronRight className={cn('h-4 w-4 transition-transform duration-300', openSections[item.label] && 'rotate-90')} /></>}</SidebarMenuButton>{openSections[item.label] && state === 'expanded' && <SidebarMenuSub className="ml-2 border-l-2 border-sidebar-border/50 pl-2 space-y-0.5">{item.subItems.map(subItem => <SidebarMenuSubItem key={subItem.label}>{subItem.external ? <a href={subItem.href} className={cn('group relative flex items-center gap-2 px-2 py-1.5 text-sm transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg')}>{subItem.icon && <subItem.icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:scale-110" />}<span>{subItem.label}</span></a> : <SidebarMenuSubButton onClick={() => handleNavigation(subItem.href)} isActive={pathname === subItem.href} aria-label={subItem.label} className={cn('group relative', 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', 'transition-all duration-200', pathname === subItem.href && 'bg-sidebar-accent/50 text-sidebar-accent-foreground font-medium')}><div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary rounded-r-full transition-all duration-300" /><div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-primary rounded-r-full transition-all duration-300" />{subItem.icon && <subItem.icon className={cn('h-4 w-4 shrink-0 transition-all duration-200', pathname === subItem.href ? 'text-primary' : 'text-muted-foreground group-hover:scale-110')} />}<span className="text-sm">{subItem.label}</span></SidebarMenuSubButton>}</SidebarMenuSubItem>)}</SidebarMenuSub>}</> : item.href ? item.type === 'notificationsLink' ? <div className="flex items-center w-full gap-1"><SidebarMenuButton onClick={() => handleNavigation(item.href!)} isActive={isSectionActive(item.href)} tooltip={item.label} aria-label={item.label} className={cn('group relative flex-1', 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', 'transition-all duration-200', isSectionActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium')}><div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300" /><item.icon className="h-5 w-5 shrink-0" />{state === 'expanded' && <span>{item.label}</span>}{state === 'collapsed' && unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white shadow-lg animate-pulse">{unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}</span>}</SidebarMenuButton>{state === 'expanded' && <div className="shrink-0"><NotificationBell /></div>}</div> : <SidebarMenuButton onClick={() => handleNavigation(item.href!)} isActive={isSectionActive(item.href)} tooltip={item.label} aria-label={item.label} className={cn('group relative', 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', 'transition-all duration-200', isSectionActive(item.href) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium')}><div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-primary rounded-r-full transition-all duration-300', isSectionActive(item.href) && 'h-8')} /><item.icon className={cn('h-5 w-5 shrink-0 transition-all duration-200', isSectionActive(item.href) ? 'text-primary' : 'group-hover:scale-110')} />{state === 'expanded' && <span>{item.label}</span>}</SidebarMenuButton> : null}</SidebarMenuItem>)}</SidebarMenu>;
}
