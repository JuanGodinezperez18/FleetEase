"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __fleetEaseInstallPrompt?: BeforeInstallPromptEvent;
  }
}

const DISMISS_KEY = "fleetease-pwa-dismissed";
const SHOW_DELAY_MS = 8000;

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true); // hide until delay + checks
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(isStandalone);

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIosDevice);

    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (wasDismissed || isStandalone) {
      setDismissed(true);
      return;
    }

    const syncInstallPrompt = () => {
      if (window.__fleetEaseInstallPrompt) {
        setInstallPrompt(window.__fleetEaseInstallPrompt);
      }
    };

    syncInstallPrompt();
    window.addEventListener("fleetease-install-available", syncInstallPrompt);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      window.__fleetEaseInstallPrompt = promptEvent;
      setInstallPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      delete window.__fleetEaseInstallPrompt;
      toast.success("FleetEase instalado", {
        description: "Ahora puedes abrir FleetEase desde la pantalla de inicio.",
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Delay banner so it doesn't compete with first-view CTAs
    const timer = window.setTimeout(() => {
      setDismissed(false);
      setReady(true);
    }, SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("fleetease-install-available", syncInstallPrompt);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed || dismissed || !ready) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleInstall = async () => {
    const promptEvent = installPrompt ?? window.__fleetEaseInstallPrompt;

    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
        delete window.__fleetEaseInstallPrompt;
        toast.success("FleetEase instalado", {
          description: "Ahora puedes abrir FleetEase desde la pantalla de inicio.",
        });
      }

      setInstallPrompt(null);
      return;
    }

    if (!ios) return;

    toast.info("Instalar FleetEase en iPhone/iPad", {
      description: "Pulsa Compartir en Safari y después 'Añadir a pantalla de inicio'.",
      duration: 7000,
    });
  };

  return (
    <aside aria-label="Instalación de FleetEase" className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-[#0e1117]/95 p-3 shadow-xl backdrop-blur-xl sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 supports-[backdrop-filter]:bg-[#0e1117]/85">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/10 text-[#d7ff3f]">
        {ios ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Instala FleetEase</p>
        <p className="text-xs text-white/45">Acceso rápido desde tu teléfono.</p>
      </div>
      <Button
        size="sm"
        onClick={handleInstall}
        className="bg-[#d7ff3f] font-semibold text-[#080a0f] hover:bg-white"
      >
        Instalar
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 text-white/40 hover:text-white"
        onClick={handleDismiss}
        aria-label="Cerrar"
      >
        <X className="h-4 w-4" />
      </Button>
    </aside>
  );
}
