"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Car,
  DollarSign,
  Activity,
  Target,
  Calendar,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { KPICard } from "@/components/ui/kpi-card";
import { AnimatedButton } from "@/components/ui/animated-button";
import { GradientText } from "@/components/ui/gradient-text";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { SkeletonCard } from "@/components/ui/skeleton-shimmer";
import { AnimatedCounter } from "@/components/ui/animated-counter";

// Mock data - replace with actual data from your app
const dashboardData = {
  stats: {
    totalRevenue: 154320,
    activeVehicles: 47,
    totalClients: 128,
    utilizationRate: 78.5,
    revenueChange: 12.5,
    vehicleChange: 5,
    clientChange: 8.3,
    utilizationChange: -2.1,
  },
  recentActivity: [
    { id: 1, action: "New vehicle added", time: "2 min ago", type: "success" },
    { id: 2, action: "Payment received", time: "15 min ago", type: "success" },
    { id: 3, action: "Maintenance alert", time: "1 hour ago", type: "warning" },
    { id: 4, action: "Client updated", time: "2 hours ago", type: "info" },
  ],
};

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
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function EnhancedDashboard() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} avatar={false} lines={2} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard className="lg:col-span-2" avatar={false} lines={4} />
          <SkeletonCard avatar={false} lines={3} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-8 min-h-screen bg-gradient-to-br from-background via-background to-muted/20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              <GradientText variant="aurora">Dashboard</GradientText>
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here&apos;s what&apos;s happening with your fleet today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedBadge variant="success" pulse glow>
              <Sparkles className="w-3 h-3" />
              System Online
            </AnimatedBadge>
            <StatusIndicator status="online" label="Live" />
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Revenue"
          value={dashboardData.stats.totalRevenue}
          prefix="$"
          trend={dashboardData.stats.revenueChange}
          trendLabel="vs last month"
          icon={DollarSign}
          variant="success"
        />
        <KPICard
          title="Active Vehicles"
          value={dashboardData.stats.activeVehicles}
          trend={dashboardData.stats.vehicleChange}
          trendLabel="vs last month"
          icon={Car}
          variant="info"
        />
        <KPICard
          title="Total Clients"
          value={dashboardData.stats.totalClients}
          trend={dashboardData.stats.clientChange}
          trendLabel="vs last month"
          icon={Users}
          variant="default"
        />
        <KPICard
          title="Utilization Rate"
          value={dashboardData.stats.utilizationRate}
          suffix="%"
          decimals={1}
          trend={dashboardData.stats.utilizationChange}
          trendLabel="vs last month"
          icon={Activity}
          variant="warning"
        />
      </motion.div>

      {/* Main Content Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <GlassCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue performance</p>
            </div>
            <div className="flex gap-2">
              <AnimatedButton size="sm" variant="secondary">
                Week
              </AnimatedButton>
              <AnimatedButton size="sm" variant="primary">
                Month
              </AnimatedButton>
              <AnimatedButton size="sm" variant="secondary">
                Year
              </AnimatedButton>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="h-64 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50 flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Chart component would render here</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Avg. Daily", value: "$5,240" },
              { label: "Peak Day", value: "$12,850" },
              { label: "Growth", value: "+18.2%" },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <AnimatedButton className="w-full" magnetic>
                <Car className="w-4 h-4" />
                Add Vehicle
              </AnimatedButton>
              <AnimatedButton className="w-full" variant="secondary">
                <Users className="w-4 h-4" />
                Add Client
              </AnimatedButton>
              <AnimatedButton className="w-full" variant="ghost">
                <Calendar className="w-4 h-4" />
                Schedule Maintenance
              </AnimatedButton>
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <AnimatedBadge variant="info">{dashboardData.recentActivity.length} New</AnimatedBadge>
            </div>
            <div className="space-y-4">
              {dashboardData.recentActivity.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      activity.type === "success" && "bg-emerald-500",
                      activity.type === "warning" && "bg-amber-500",
                      activity.type === "info" && "bg-blue-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper function
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
