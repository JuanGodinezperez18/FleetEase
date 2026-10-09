"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";

const scenes = [
  { selector: "[data-scroll-scene='hero']", background: "/images/landing/fleet-hero.svg" },
  { selector: "[data-scroll-scene='product']", background: "/images/landing/operations-dashboard.svg" },
  { selector: "[data-scroll-scene='closing']", background: "/images/landing/fleet-hero.svg" },
];

/** Cambia los fondos de forma progresiva según la sección visible. */
export function LandingScrollEffects() {
  const [activeScene, setActiveScene] = useState(0);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.25 });

  useEffect(() => {
    const targets = scenes.flatMap((scene, index) => {
      const element = document.querySelector(scene.selector);
      return element ? [{ element, index }] : [];
    });
    if (!targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const scene = targets.find((target) => target.element === visible.target);
      if (scene) setActiveScene(scene.index);
    }, { rootMargin: "-18% 0px -28% 0px", threshold: [0.05, 0.2, 0.45, 0.7] });
    targets.forEach(({ element }) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <>
    <div aria-hidden="true" className="fe-scroll-backdrop">
      {scenes.map((scene, index) => <div key={scene.selector} className="fe-scroll-backdrop__scene" style={{ backgroundImage: 'url("' + scene.background + '")', opacity: activeScene === index ? 1 : 0 }} />)}
      <div className="fe-scroll-backdrop__veil" />
    </div>
    {!reducedMotion && <motion.div aria-hidden="true" className="fe-scroll-progress" style={{ scaleX: progress }} />}
    <style jsx global>{`
      .fe-scroll-backdrop { position: fixed; inset: 64px 0 0; z-index: 0; pointer-events: none; overflow: hidden; background: #080d11; }
      .fe-scroll-backdrop__scene { position: absolute; inset: 0; background-position: center; background-size: cover; transform: scale(1.025); transition: opacity 850ms cubic-bezier(.22,1,.36,1); will-change: opacity; }
      .fe-scroll-backdrop__veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,13,17,.52) 0%, rgba(8,13,17,.84) 34%, rgba(8,13,17,.94) 72%, #080d11 100%), linear-gradient(90deg, rgba(8,13,17,.58), rgba(8,13,17,.16) 55%, rgba(8,13,17,.5)); }
      .fe-scroll-progress { position: fixed; z-index: 100; top: 0; left: 0; right: 0; height: 3px; background: var(--fe-lime, #d7ff3f); transform-origin: 0 50%; box-shadow: 0 0 14px rgba(215,255,63,.45); }
      @media (min-width: 640px) { .fe-scroll-backdrop { top: 72px; } }
      @media (prefers-reduced-motion: reduce) { .fe-scroll-backdrop__scene { transition: none; transform: none; } }
    `}</style>
  </>;
}
