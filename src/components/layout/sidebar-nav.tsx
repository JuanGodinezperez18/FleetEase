"use client";

import React, { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation'; 
import {
  Car as CarIcon,
  LayoutDashboard,
  Users as UsersIconLucide,
  DollarSign as DollarSignIcon,
  BarChart3 as BarChart3Icon,
  Bell as BellIcon,
  FileText,
  FolderKanban,
  Gauge,
  Settings as SettingsIcon,
  Users,
  Briefcase,
  Landmark,
  Building,
  Tags,
  AreaChart,
  History,
  MessageSquare,
  ChevronRight,
  Camera,
  ShieldAlert,
  Mail,
  Package,
  type LucideIcon
} from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
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
    return (
        <Popover>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative text-inherit hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-all duration-200"><BellIcon className="w-5 h-5" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold shadow-lg animate-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>}</Button></PopoverTrigger>
            <PopoverContent className="w-80 mr-2 p-0 border-border shadow-xl" align="end"><div className="space-y-0"><div className="px-4 py-3 border-b border-border bg-muted/30"><h4 className="font-semibold text-sm">Notificaciones</h4>{unreadCount > 0 && <p className="text-xs text-muted-foreground">{unreadCount} sin leer</p>}</div><div className="max-h-[400px] overflow-y-auto">{analyzedNotifications.length === 0 ? <div className="px-4 py-8 text-center text-sm text-muted-foreground">No hay notificaciones</div> : analyzedNotifications.slice(0, 5).map((notif) => <Link href={getNotificationLink(notif)} key={notif.id} className={cn("block px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0", !notif.isRead && "bg-primary/5")}><div className="flex items-start gap-3">{!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}<div className="flex-1 min-w-0"><p className={cn("text-sm leading-snug mb-1", !notif.isRead && "font-semibold")}>{notif.message}</p><p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale: es })}</p></div></div></Link>)}</div><div className="px-4 py-3 border-t border-border bg-muted/30"><Link href="/dashboard/notifications" className="block"><Button variant="ghost" className="w-full text-sm font-medium hover:bg-sidebar-accent">Ver todas las notificaciones</Button></Link></div></div></PopoverContent>
        </Popover>
    );
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
      { href: '/dashboard/finanzas/income', label: 'Ingresos y Pagos', icon: FolderKanban },
      { href: '/dashboard/finanzas/expenses', label: 'Gastos', icon: FileText },
    ] },
  { href: '/dashboard/profitability', label: 'Rentabilidad', icon: AreaChart, roles: ['admin', 'superAdmin', 'editor'] },
  { href: '/dashboard/mileage', label: 'Registro de Kilometraje', icon: Gauge },
  { href: '/dashboard/alerts', label: 'Alertas de Negocio', icon: BellIcon, roles: ['admin', 'superAdmin', 'editor'] },
  { href: '/dashboard/seguimientos', label: 'Seguimientos Fotográficos', icon: Camera, roles: ['admin', 'superAdmin', 'editor'] },
  { label: 'Reporte Ejecutivo', icon: BarChart3Icon, basePath: '/dashboard/reports', subItems: [
      { href: '/dashboard/reports', label: 'Generar Reporte', icon: BarChart3Icon },
      { href: '/dashboard/reports/history', label: 'Historial', icon: History },
    ] },
  { href: '/dashboard/messages', label: 'Mensajería', icon: MessageSquare },
  { type: 'notificationsLink', href: '/dashboard/notifications', label: 'Notificaciones', icon: BellIcon },
  { label: 'Administración', icon: SettingsIcon, basePath: '/dashboard/settings', subItems: [
        { href: '/dashboard/users', label: 'Usuarios', icon: Users, roles: ['superAdmin' as UserRole, 'admin' as UserRole] },
        { href: '/dashboard/companies', label: 'Empresas', icon: Building, roles: ['superAdmin' as UserRole] },
        { href: '/dashboard/settings/categories', label: 'Categorías', icon: Tags, roles: ['superAdmin' as UserRole, 'admin' as UserRole] },
        { href: '/dashboard/settings/catalogs', label: 'Catálogos', icon: Package, roles: ['superAdmin' as UserRole, 'admin' as UserRole] },
        { href: '/dashboard/settings/company', label: 'Configuración de Empresa', icon: SettingsIcon, roles: ['superAdmin' as UserRole] },
        { href: '/dashboard/settings/subscription', label: 'Suscripción y Planes', icon: DollarSignIcon },
        { href: '/dashboard/faq', label: 'Preguntas Frecuentes', icon: MessageSquare },
        { href: '/dashboard/settings', label: 'Mi Configuración', icon: SettingsIcon },
        { href: 'mailto:soporte@fleetease.mx', label: 'Contactar Soporte', icon: Mail, external: true },
    ], roles: ['superAdmin' as UserRole, 'admin' as UserRole]
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter(); 
  const { state, isMobile } = useSidebar(); 
  const { notifications, loadingData } = useData();
  const { currentUser } = useAuth();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const unreadNotificationsCount = useMemo(() => { if (loadingData || !notifications) return 0; return notifications.filter(n => !n.isRead).length; }, [notifications, loadingData]);
  const filteredNavItems = useMemo(() => { if (!currentUser) return []; const filterItems = (items: (NavItem | SubNavItem)[]): (NavItem | SubNavItem)[] => items.filter(item => !item.roles || item.roles.includes(currentUser.role)).map(item => 'subItems' in item && item.subItems ? { ...item, subItems: filterItems(item.subItems) } : item) as (NavItem | SubNavItem)[]; return filterItems(navItemsBase) as NavItem[]; }, [currentUser]);
  const isSectionActive = React.useCallback((baseHref?: string, subItems?: SubNavItem[]) => { if (!baseHref && !subItems) return false; if (subItems && baseHref) return pathname.startsWith(baseHref); if(baseHref){ if (baseHref === '/dashboard') return pathname === baseHref; const effectiveBaseHref = baseHref.endsWith('/') ? baseHref : baseHref + '/'; return pathname.startsWith(effectiveBaseHref) || pathname === baseHref; } return false; }, [pathname]);
  const handleToggleSection = (label: string) => setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  const handleNavigation = (href: string) => router.push(href);
  React.useEffect(() => {
    const activeSection = navItemsBase.find(item => 'subItems' in item && item.basePath && pathname.startsWith(item.basePath));
    if (activeSection && 'label' in activeSection) setOpenSections(prev => ({ ...prev, [activeSection.label]: true }));
  }, [pathname]);

  return (<SidebarMenu>{filteredNavItems.map((item) => <SidebarMenuItem key={item.label || item.href}>{'subItems' in item && item.subItems ? <><SidebarMenuButton onClick={() => handleToggleSection(item.label)}><item.icon className="h-4 w-4" /><span>{item.label}</span><ChevronRight className={cn("ml-auto transition-transform", openSections[item.label] && "rotate-90")} /></SidebarMenuButton>{openSections[item.label] && <SidebarMenuSub>{item.subItems.map(sub => <SidebarMenuSubItem key={sub.href}><SidebarMenuSubButton asChild isActive={pathname === sub.href}><Link href={sub.href}><sub.icon className="h-4 w-4" /><span>{sub.label}</span></Link></SidebarMenuSubButton></SidebarMenuSubItem>)}</SidebarMenuSub>}</> : <SidebarMenuButton asChild isActive={pathname === item.href}><Link href={item.href}><item.icon className="h-4 w-4" /><span>{item.label}</span>{item.type === 'notificationsLink' && unreadNotificationsCount > 0 && <SidebarMenuBadge>{unreadNotificationsCount}</SidebarMenuBadge>}</Link></SidebarMenuButton>}</SidebarMenuItem>)}</SidebarMenu>);
}
