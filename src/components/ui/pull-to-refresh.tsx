"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";

export interface PullToRefreshProps {
  children: ReactNode;
  /** Called when the user crosses the threshold and releases (or when already armed). */
  onRefresh: () => void | Promise<void>;
  /** Resistance of the rubber-band (0–100). Higher = more resistance. Default 50. */
  resistance?: number;
  /** Pull distance in px required to arm refresh. Default 58. */
  threshold?: number;
  /** Spin speed of the indicator while working (0–100). Default 50. */
  spin?: number;
  /** Number of goo droplets (3–10). Default 6. */
  dots?: number;
  /** Border radius of the sheet in px. Default 26. */
  corner?: number;
  /** Disable the gesture entirely. */
  disabled?: boolean;
  className?: string;
  /** Optional class for the scrollable surface. */
  contentClassName?: string;
}

type Phase = "idle" | "hold" | "work";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Bencho-inspired pull-to-refresh.
 *
 * - Non-linear rubber resistance (drawn = R * raw / (R + raw))
 * - Commitment at threshold (armed while finger is still down)
 * - Goo droplets that converge and fuse, then spin while working
 */
export function PullToRefresh({
  children,
  onRefresh,
  resistance = 50,
  threshold = 58,
  spin = 50,
  dots = 6,
  corner = 26,
  disabled = false,
  className,
  contentClassName,
}: PullToRefreshProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{
    y: number;
    from: number;
    on: boolean;
  } | null>(null);
  const workTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rawPull, setRawPull] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");

  const R = 700 - (resistance / 100) * 380;
  const drawn = (R * rawPull) / (R + rawPull || 1);
  const at = phase === "work" ? threshold : phase === "hold" ? drawn : 0;
  const p = clamp(at / threshold, 0, 1);
  const armed = p >= 1;

  const dotCount = clamp(Math.round(dots), 3, 10);
  const baseSpread = 12 + (dotCount - 6) * 1.3;
  const spread = phase === "work" ? baseSpread : baseSpread + 3 - p * 3;
  const turn = phase === "work" ? 0 : p * 220;
  const rpm = 3000 - (spin / 100) * 1200;

  const clearWorkTimer = () => {
    if (workTimer.current) {
      clearTimeout(workTimer.current);
      workTimer.current = null;
    }
  };

  useEffect(() => () => clearWorkTimer(), []);

  const runRefresh = useCallback(async () => {
    setPhase("work");
    setRawPull(0);
    try {
      await onRefresh();
    } finally {
      // Keep the spin visible briefly so the fusion → spin feels intentional
      workTimer.current = setTimeout(() => {
        setPhase("idle");
      }, 900);
    }
  }, [onRefresh]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (disabled || phase === "work") return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;

    pointerRef.current = {
      y: e.clientY,
      from: window.devicePixelRatio || 1,
      on: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ptr = pointerRef.current;
    if (!ptr || phase === "work") return;

    const dy = (e.clientY - ptr.y) / ptr.from;
    const dx = 0; // we only care about vertical commitment

    if (!ptr.on) {
      // Require clear downward intent before capturing
      if (dy < 4) return;
      if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
        pointerRef.current = null;
        return;
      }
      ptr.on = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    setPhase("hold");
    setRawPull(Math.max(0, dy));
  };

  const onPointerUp = () => {
    const ptr = pointerRef.current;
    pointerRef.current = null;
    if (!ptr) return;

    if (ptr.on && armed) {
      void runRefresh();
    } else {
      setRawPull(0);
      setPhase("idle");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || phase === "work") return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      void runRefresh();
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      data-phase={phase}
      data-armed={armed || undefined}
      style={
        {
          "--at": `${at.toFixed(2)}px`,
          "--p": p.toFixed(3),
          "--rpm": `${rpm.toFixed(0)}ms`,
          "--bal-r": `${clamp(corner, 0, 40)}px`,
        } as React.CSSProperties
      }
    >
      {/* Goo indicator */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center justify-center",
          phase === "idle" && "opacity-0",
          phase !== "idle" && "opacity-100"
        )}
        style={{
          top: 8,
          height: 36,
          width: 36,
          transition: "opacity 180ms ease",
        }}
        aria-hidden={phase === "idle"}
      >
        <div
          className={cn(
            "relative h-9 w-9",
            phase === "work" && "animate-[spin_var(--rpm)_linear_infinite]"
          )}
          style={
            phase === "work"
              ? ({ animationDuration: "var(--rpm)" } as React.CSSProperties)
              : undefined
          }
        >
          {Array.from({ length: dotCount }, (_, i) => {
            const angle = ((i / dotCount) * 360 + turn) * (Math.PI / 180);
            const dx = Math.sin(angle) * spread;
            const dy = -Math.cos(angle) * spread;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d7ff3f] shadow-[0_0_10px_rgba(215,255,63,0.55)]"
                style={{
                  transform: `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px)) scale(${0.75 + p * 0.35})`,
                  transition: "transform 80ms linear",
                  opacity: 0.55 + p * 0.45,
                }}
              />
            );
          })}
        </div>
      </div>

      <div
        ref={scrollRef}
        tabIndex={0}
        role="group"
        aria-label="Contenido. Tira hacia abajo o pulsa Enter para actualizar."
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        className={cn(
          "relative touch-pan-y overflow-auto outline-none",
          contentClassName
        )}
        style={{
          transform: at > 0 ? `translateY(${at * 0.55}px)` : undefined,
          transition:
            phase === "hold"
              ? "none"
              : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
          borderRadius: "var(--bal-r)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
