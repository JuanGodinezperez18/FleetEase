"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(isStandalone);

    const isIosDevice = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIosDevice);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (installed || dismissed) return null;

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        toast.success("FleetEase instalado", { description: "Ahora puedes abrir FleetEase desde la pantalla de inicio." });
      }
      setInstallPrompt(null);
      return;
    }

    if (ios) {
      toast.info("Instalar FleetEase en iPhone/iPad", {
        description: "Pulsa Compartir en Safari y después 'Añadir a pantalla de inicio'.",
        duration: 7000,
      });
      return;
    }

    toast.info("Instalación disponible", {
      description: "Abre el menú del navegador y selecciona 'Instalar aplicación' o 'Añadir a pantalla de inicio'.",
      duration: 7000,
    });
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {ios ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instala FleetEase</p>
        <p className="text-xs text-muted-foreground">Acceso rápido desde tu teléfono.</p>
      </div>
      <Button size="sm" onClick={handleInstall}>
        Instalar
      </Button>
      <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setDismissed(true)} aria-label="Cerrar">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
