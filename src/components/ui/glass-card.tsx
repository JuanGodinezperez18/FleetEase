"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  glow?: boolean;
  tilt?: boolean;
  variant?: "default" | "premium" | "dark";
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, hover = true, glow = false, tilt = false, variant = "default", ...props }, ref) => {
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = React.useState(false);

    const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!tilt || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setMousePosition({ x, y });
    }, [tilt]);

    const getTransform = React.useCallback(() => {
      if (!tilt || !isHovered) return "perspective(1000px) rotateX(0deg) rotateY(0deg)";

      const rotateX = (mousePosition.y - 0.5) * -10;
      const rotateY = (mousePosition.x - 0.5) * 10;

      return `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }, [tilt, isHovered, mousePosition]);

    const getSpotlightPosition = React.useCallback(() => {
      if (!isHovered) return { x: "50%", y: "50%" };
      return {
        x: `${mousePosition.x * 100}%`,
        y: `${mousePosition.y * 100}%`
      };
    }, [isHovered, mousePosition]);

    const spotlight = getSpotlightPosition();

    const variants = {
      default: "glass-premium",
      premium: "glass-premium border-primary/20",
      dark: "glass-premium bg-black/20",
    };

    return (
      <motion.div
        ref={cardRef}
        className={cn(
          "relative overflow-hidden rounded-2xl p-6",
          variants[variant],
          hover && "hover-lift transition-all duration-300",
          glow && "hover:shadow-glow-lg",
          className
        )}
        style={{
          transform: getTransform(),
          transition: "transform 0.2s ease-out",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        {...(props as any)}
      >
        {/* Spotlight effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(600px circle at ${spotlight.x} ${spotlight.y}, rgba(255,255,255,0.06), transparent 40%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    );
  }
);

GlassCard.displayName = "GlassCard";

export { GlassCard };
