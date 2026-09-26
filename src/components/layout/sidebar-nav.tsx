"use client";

import React, { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Car as CarIcon,
  LayoutDashboard,
  Users as UsersIconLucide,
  DollarSign as DollarSignIcon,
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
  HandCoins,
  type LucideIcon,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useData } from "@/hooks/use-data";
import { useAuth } from "@/contexts/auth-provider";
import { getNotificationLink } from "@/lib/notification-utils";
import { useNotificationsAnalytics } from "@/hooks/use-notifications-analytics";

/** Inactive nav item — theme-aware */
const itemBase =
  "group relative rounded-xl fe-text-muted transition-all duration-200 hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]";
/** Active nav item — theme-aware surface + strong text */
const itemActive =
  "bg-[var(--fe-hover)] font-medium fe-text hover:bg-[var(--fe-hover-strong)] hover:text-[var(--fe-text)]";

const navGroupByLabel: Record<string, string> = {
  "Panel de Control": "Operación",
  "Créditos": "Finanzas",
  "Rentabilidad": "Análisis",
  "Mensajería": "Comunicación",
  "Administración": "Administración",
};

function NavGroupLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-2" aria-hidden="true" />;
  return (
    <div className="px-3 pb-1 pt-4 first:pt-2">
      <span className="text-[9px] font-semibold uppercase tracking-[0.18em] fe-text-faint">
        {label}
      </span>
    </div>
  );
}

const NotificationBell = () => {
  const { clients, vehicles, financialRecords, clientBalances, notifications: rawNotifications, loadingData } =
    useData();
  const { analyzedNotifications } = useNotificationsAnalytics(
    rawNotifications,
    clients,
    vehicles,
    [],
    financialRecords,
    clientBalances
  );
  const unreadCount = useMemo(
    () => analyzedNotifications.filter(n => !n.isRead).length,
    [analyzedNotifications]
  );
  if (loadingData) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg fe-text-muted hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
        >
          <BellIcon className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="fe-panel-bg mr-2 w-80 border p-0 shadow-xl"
        align="end"
      >
        <div className="space-y-0">
          <div className="border-b fe-border-subtle px-4 py-3">
            <h4 className="text-sm font-semibold fe-text">Notificaciones</h4>
            {unreadCount > 0 && <p className="text-xs fe-text-muted">{unreadCount} sin leer</p>}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {analyzedNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm fe-text-faint">No hay notificaciones</div>
            ) : (
              analyzedNotifications.slice(0, 5).map(notif => (
                <Link
                  href={getNotificationLink(notif)}
                  key={notif.id}
                  className={cn(
                    "block border-b fe-border-subtle px-4 py-3 transition-colors last:border-0 hover:bg-[var(--fe-hover)]",
                    !notif.isRead && "bg-[#d7ff3f]/[0.04]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {!notif.isRead && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#d7ff3f]" />}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "mb-1 text-sm leading-snug fe-text-secondary",
                          !notif.isRead && "font-semibold fe-text"
                        )}
                      >
                        {notif.message}
                      </p>
                      <p className="text-xs fe-text-faint">
                        {formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t fe-border-subtle px-4 py-3">
            <Link href="/dashboard/notifications" className="block">
              <Button
                variant="ghost"
                className="w-full text-sm font-medium fe-text-secondary hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
              >
                Ver todas las notificaciones
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export interface SubNavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  roles?: UserRole[];
  external?: boolean;
}
interface NavLinkItem {
  href: string;
  label: string;
  icon: LucideIcon;
  basePath?: string;
  subItems?: never;
  type?: "notificationsLink";
  roles?: UserRole[];
  external?: boolean;
}
interface NavSectionItem {
  href?: never;
  label: string;
  icon: LucideIcon;
  basePath: string;
  subItems: SubNavItem[];
  type?: never;
  roles?: UserRole[];
}
export type UserRole = "admin" | "editor" | "viewer" | "superAdmin" | "partner" | "client";
export type NavItem = NavLinkItem | NavSectionItem;

export const navItemsBase: NavItem[] = [
  // Operación
  { href: "/dashboard", label: "Panel de Control", icon: LayoutDashboard },
  { href: "/dashboard/vehicles", label: "Vehículos", icon: CarIcon },
  { href: "/dashboard/clients", label: "Clientes", icon: UsersIconLucide },
  { href: "/dashboard/partners", label: "Socios", icon: Briefcase },
  { href: "/dashboard/mileage", label: "Registro de Kilometraje", icon: Gauge },
  { href: "/dashboard/multas", label: "Multas", icon: ShieldAlert, roles: ["admin", "superAdmin", "editor"] },
  { href: "/dashboard/seguimientos", label: "Seguimientos Fotográficos", icon: Camera, roles: ["admin", "superAdmin", "editor"] },

  // Finanzas
  { href: "/dashboard/credits", label: "Créditos", icon: Landmark },
  {
    label: "Finanzas",
    icon: DollarSignIcon,
    basePath: "/dashboard/finanzas",
    subItems: [
      { href: "/dashboard/finanzas", label: "Análisis Financiero", icon: AreaChart },
      { href: "/dashboard/finanzas/income", label: "Ingresos", icon: FolderKanban },
      { href: "/dashboard/finanzas/payments", label: "Pagos", icon: HandCoins },
      { href: "/dashboard/finanzas/payments/history", label: "Historial de Pagos", icon: History },
      { href: "/dashboard/finanzas/expenses", label: "Gastos", icon: FileText },
      { href: "/dashboard/finanzas/supplier-purchases", label: "Proveedores", icon: Briefcase },
      { href: "/dashboard/finanzas/accounts-payable", label: "Cuentas por pagar", icon: HandCoins },
    ],
  },

  // Análisis
  { href: "/dashboard/profitability", label: "Rentabilidad", icon: AreaChart, roles: ["admin", "superAdmin", "editor"] },
  {
    label: "Reportes",
    icon: FileText,
    basePath: "/dashboard/reports",
    subItems: [
      { href: "/dashboard/reports", label: "Generar Reporte", icon: BarChart3Icon },
      { href: "/dashboard/reports/history", label: "Historial", icon: History },
    ],
  },
  { href: "/dashboard/alerts", label: "Alertas de Negocio", icon: BellIcon, roles: ["admin", "superAdmin", "editor"] },

  // Comunicación
  { href: "/dashboard/messages", label: "Mensajería", icon: MessageSquare },
  { type: "notificationsLink", href: "/dashboard/notifications", label: "Notificaciones", icon: BellIcon },

  // Administración
  {
    label: "Administración",
    icon: SettingsIcon,
    basePath: "/dashboard/settings",
    subItems: [
      { href: "/dashboard/users", label: "Usuarios", icon: Users, roles: ["superAdmin", "admin"] },
      { href: "/dashboard/companies", label: "Empresas", icon: Building, roles: ["superAdmin"] },
      { href: "/dashboard/settings/categories", label: "Categorías", icon: Tags, roles: ["superAdmin", "admin"] },
      { href: "/dashboard/settings/catalogs", label: "Catálogos", icon: Package, roles: ["superAdmin", "admin"] },
      { href: "/dashboard/settings/company", label: "Configuración de Empresa", icon: SettingsIcon, roles: ["superAdmin"] },
      { href: "/dashboard/settings/subscription", label: "Suscripción y Planes", icon: DollarSignIcon },
      { href: "/dashboard/faq", label: "Preguntas Frecuentes", icon: MessageSquare },
      { href: "/dashboard/settings", label: "Mi Configuración", icon: SettingsIcon },
      { href: "mailto:soporte@fleetease.mx", label: "Contactar Soporte", icon: Mail, external: true },
    ],
    roles: ["superAdmin", "admin"],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { notifications, loadingData } = useData();
  const { currentUser } = useAuth();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});
  const unreadNotificationsCount = useMemo(
    () => (loadingData || !notifications ? 0 : notifications.filter(n => !n.isRead).length),
    [notifications, loadingData]
  );

  const filteredNavItems = useMemo(() => {
    if (!currentUser) return [];
    const filterItems = (items: (NavItem | SubNavItem)[]): (NavItem | SubNavItem)[] =>
      items
        .filter(item => !item.roles || item.roles.includes(currentUser.role))
        .map(item =>
          "subItems" in item && item.subItems ? { ...item, subItems: filterItems(item.subItems) } : item
        ) as (NavItem | SubNavItem)[];
    return filterItems(navItemsBase) as NavItem[];
  }, [currentUser]);

  const isSectionActive = React.useCallback(
    (baseHref?: string, subItems?: SubNavItem[]) => {
      if (!baseHref && !subItems) return false;
      if (subItems && baseHref) return pathname.startsWith(baseHref);
      if (baseHref) {
        if (baseHref === "/dashboard") return pathname === baseHref;
        const effectiveBaseHref = baseHref.endsWith("/") ? baseHref : baseHref + "/";
        return pathname.startsWith(effectiveBaseHref) || pathname === baseHref;
      }
      return false;
    },
    [pathname]
  );

  const handleToggleSection = (label: string) => setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  const handleNavigation = (href: string) => router.push(href);

  React.useEffect(() => {
    const activeSection = filteredNavItems.find(
      item => "subItems" in item && item.subItems && item.basePath && isSectionActive(item.basePath, item.subItems)
    );
    if (activeSection && "label" in activeSection) {
      setOpenSections(prev => ({ ...prev, [activeSection.label]: true }));
    }
  }, [pathname, filteredNavItems, isSectionActive]);

  return (
    <SidebarMenu className="gap-0.5">
      {filteredNavItems.map((item, index) => {
        const group = navGroupByLabel[item.label];
        const previousItem = filteredNavItems[index - 1];
        const previousGroup = previousItem ? navGroupByLabel[previousItem.label] : undefined;
        const showGroup = group && group !== previousGroup;
        return (
          <React.Fragment key={item.label}>
            {showGroup && <NavGroupLabel label={group} collapsed={state === "collapsed"} />}
            <SidebarMenuItem>
          {"subItems" in item && item.subItems ? (
            <>
              <SidebarMenuButton
                onClick={() => handleToggleSection(item.label)}
                isActive={isSectionActive(item.basePath, item.subItems)}
                tooltip={item.label}
                aria-label={item.label}
                className={cn(itemBase, isSectionActive(item.basePath, item.subItems) && itemActive)}
              >
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-[#d7ff3f] transition-all duration-300",
                    isSectionActive(item.basePath, item.subItems) && "h-7 shadow-[0_0_10px_#d7ff3f80]"
                  )}
                />
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isSectionActive(item.basePath, item.subItems)
                      ? "text-[#d7ff3f]"
                      : "fe-text-faint group-hover:text-[var(--fe-text-secondary)]"
                  )}
                  strokeWidth={1.75}
                />
                {state === "expanded" && (
                  <>
                    <span className="flex-1 text-[13px]">{item.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 fe-text-faint transition-transform duration-300",
                        openSections[item.label] && "rotate-90"
                      )}
                      strokeWidth={1.75}
                    />
                  </>
                )}
              </SidebarMenuButton>
              {openSections[item.label] && state === "expanded" && (
                <SidebarMenuSub className="fe-sidebar-submenu ml-3 space-y-0.5 border-l fe-border-subtle pl-2">
                  {item.subItems.map(subItem => (
                    <SidebarMenuSubItem key={subItem.label}>
                      {subItem.external ? (
                        <a
                          href={subItem.href}
                          className="group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] fe-text-muted transition-all duration-200 hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
                        >
                          {subItem.icon && (
                            <subItem.icon className="h-3.5 w-3.5 shrink-0 fe-text-faint" strokeWidth={1.75} />
                          )}
                          <span>{subItem.label}</span>
                        </a>
                      ) : (
                        <SidebarMenuSubButton
                          onClick={() => handleNavigation(subItem.href)}
                          isActive={pathname === subItem.href}
                          aria-label={subItem.label}
                          className={cn(
                            "group relative rounded-lg fe-text-muted hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]",
                            pathname === subItem.href && "bg-[var(--fe-hover)] font-medium fe-text"
                          )}
                        >
                          <div
                            className={cn(
                              "absolute left-0 top-1/2 h-0 w-0.5 -translate-y-1/2 rounded-r-full bg-[#d7ff3f] transition-all duration-300",
                              pathname === subItem.href && "h-4"
                            )}
                          />
                          {subItem.icon && (
                            <subItem.icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                pathname === subItem.href ? "text-[#d7ff3f]" : "fe-text-faint"
                              )}
                              strokeWidth={1.75}
                            />
                          )}
                          <span className="text-[12.5px]">{subItem.label}</span>
                        </SidebarMenuSubButton>
                      )}
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </>
          ) : item.href ? (
            item.type === "notificationsLink" ? (
              <div className="flex w-full items-center gap-1">
                <SidebarMenuButton
                  onClick={() => handleNavigation(item.href!)}
                  isActive={isSectionActive(item.href)}
                  tooltip={item.label}
                  aria-label={item.label}
                  className={cn("flex-1", itemBase, isSectionActive(item.href) && itemActive)}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-[#d7ff3f] transition-all duration-300",
                      isSectionActive(item.href) && "h-7 shadow-[0_0_10px_#d7ff3f80]"
                    )}
                  />
                  <item.icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isSectionActive(item.href) ? "text-[#d7ff3f]" : "fe-text-faint"
                    )}
                    strokeWidth={1.75}
                  />
                  {state === "expanded" && <span className="text-[13px]">{item.label}</span>}
                  {state === "collapsed" && unreadNotificationsCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-semibold text-white">
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </span>
                  )}
                </SidebarMenuButton>
                {state === "expanded" && (
                  <div className="shrink-0">
                    <NotificationBell />
                  </div>
                )}
              </div>
            ) : (
              <SidebarMenuButton
                onClick={() => handleNavigation(item.href!)}
                isActive={isSectionActive(item.href)}
                tooltip={item.label}
                aria-label={item.label}
                className={cn(itemBase, isSectionActive(item.href) && itemActive)}
              >
                <div
                  className={cn(
                    "absolute left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r-full bg-[#d7ff3f] transition-all duration-300",
                    isSectionActive(item.href) && "h-7 shadow-[0_0_10px_#d7ff3f80]"
                  )}
                />
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isSectionActive(item.href)
                      ? "text-[#d7ff3f]"
                      : "fe-text-faint group-hover:text-[var(--fe-text-secondary)]"
                  )}
                  strokeWidth={1.75}
                />
                {state === "expanded" && <span className="text-[13px]">{item.label}</span>}
              </SidebarMenuButton>
            )
          ) : null}
          </SidebarMenuItem>
          </React.Fragment>
        );
      })}
    </SidebarMenu>
  );
}
