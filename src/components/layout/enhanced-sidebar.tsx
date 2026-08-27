"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  ChevronLeft,
  Sparkles,
  Activity,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: { label: string; href: string }[];
}

interface EnhancedSidebarProps {
  className?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Fleet",
    href: "/dashboard/vehicles",
    icon: Car,
    badge: 3,
    children: [
      { label: "All Vehicles", href: "/dashboard/vehicles" },
      { label: "Maintenance", href: "/dashboard/maintenance" },
      { label: "Inspections", href: "/dashboard/inspections" },
    ],
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
    children: [
      { label: "All Clients", href: "/dashboard/clients" },
      { label: "Transactions", href: "/dashboard/transactions" },
    ],
  },
  { label: "Finance", href: "/dashboard/finance", icon: DollarSign },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, badge: 5 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const sidebarVariants = {
  expanded: { width: 280 },
  collapsed: { width: 80 },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export function EnhancedSidebar({ className }: EnhancedSidebarProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeItem, setActiveItem] = React.useState("/dashboard");
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  return (
    <motion.aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#0b1326] border-r border-[#2d3449]/50 flex flex-col",
        className
      )}
      initial="expanded"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-[#2d3449]/50">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <motion.div
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b8c3ff] to-[#2e5bff] flex items-center justify-center flex-shrink-0"
            whileHover={{ rotate: 5, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="font-bold text-[#060e20] text-lg">F</span>
          </motion.div>
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-heading font-bold text-white whitespace-nowrap"
              >
                FleetEase
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {navItems.map((item, index) => (
            <NavItemComponent
              key={item.href}
              item={item}
              isExpanded={isExpanded}
              isActive={activeItem === item.href || activeItem.startsWith(item.href + "/")}
              isHovered={hoveredItem === item.href}
              onHover={() => setHoveredItem(item.href)}
              onLeave={() => setHoveredItem(null)}
              index={index}
            />
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-[#2d3449]/50">
        <motion.div
          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2e5bff] to-[#8342f4] flex items-center justify-center">
              <span className="text-white font-semibold text-sm">JD</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusIndicator status="online" pulse={false} />
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="text-white font-medium text-sm truncate">John Doe</p>
                <p className="text-white/50 text-xs">Admin</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-colors ml-auto"
            whileHover={{ scale: 1.1, rotate: 10 }}
            whileTap={{ scale: 0.9 }}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    </motion.aside>
  );
}

interface NavItemComponentProps {
  item: NavItem;
  isExpanded: boolean;
  isActive: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  index: number;
}

function NavItemComponent({
  item,
  isExpanded,
  isActive,
  isHovered,
  onHover,
  onLeave,
  index,
}: NavItemComponentProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <Link href={item.href}>
        <motion.div
          className={cn(
            "relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors",
            isActive
              ? "bg-gradient-to-r from-[#2e5bff]/20 to-transparent text-white"
              : "text-white/60 hover:text-white hover:bg-white/5",
            !isExpanded && "justify-center"
          )}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={navItemVariants}
          whileHover={{ x: isExpanded ? 4 : 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => hasChildren && setIsOpen(!isOpen)}
        >
          {/* Active indicator */}
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-[#b8c3ff] to-[#2e5bff]"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{
              opacity: isActive ? 1 : 0,
              scaleY: isActive ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
          />

          {/* Icon */}
          <motion.div
            className={cn(
              "relative flex items-center justify-center",
              isActive && "text-[#b8c3ff]"
            )}
            animate={{
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <item.icon className="w-5 h-5" />

            {/* Floating badge when collapsed */}
            {!isExpanded && item.badge && (
              <motion.span
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                {item.badge}
              </motion.span>
            )}
          </motion.div>

          {/* Label */}
          <AnimatePresence>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-medium text-sm whitespace-nowrap flex-1"
              >
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badge */}
          <AnimatePresence>
            {isExpanded && item.badge && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <AnimatedBadge variant="danger" pulse>
                  {item.badge}
                </AnimatedBadge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dropdown arrow */}
          <AnimatePresence>
            {isExpanded && hasChildren && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ rotate: isOpen ? 90 : 0 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tooltip when collapsed */}
          <AnimatePresence>
            {!isExpanded && isHovered && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.9 }}
                className="absolute left-full ml-4 px-3 py-2 bg-[#131b2e] border border-[#2d3449] rounded-lg text-white text-sm whitespace-nowrap z-50"
                style={{ left: "100%" }}
              >
                {item.label}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#131b2e] border-l border-b border-[#2d3449] rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Link>

      {/* Submenu */}
      <AnimatePresence>
        {isExpanded && hasChildren && isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-12 pr-3 py-2 space-y-1">
              {item.children?.map((child, childIndex) => (
                <motion.div
                  key={child.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: childIndex * 0.05 }}
                >
                  <Link href={child.href}>
                    <div className="px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors">
                      {child.label}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
