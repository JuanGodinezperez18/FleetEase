
"use client";

import { useState } from 'react';
import { toast } from 'sonner';

interface ShareOptions {
  title: string;
  text: string;
}

export function useShareContent() {
  const [isSharing, setIsSharing] = useState(false);
  
  const shareContent = async ({ title, text }: ShareOptions) => {
    setIsSharing(true);
    
    try {
      if (!text) {
        toast.info('Nada que compartir', {
          description: 'No hay contenido disponible para compartir.'
        });
        return;
      }
      
      // Intentar usar Web Share API
      if (navigator.share) {
        try {
          await navigator.share({ title, text });
          toast.success('Contenido compartido exitosamente.');
          return;
        } catch (error) {
          // Si el usuario cancela, no es un error. En otros casos, se pasará al portapapeles.
          if (error instanceof DOMException && error.name === 'AbortError') {
            return; 
          }
        }
      }
      
      // Fallback: copiar al portapapeles
      await navigator.clipboard.writeText(text);
      toast.success('Resumen Copiado', {
        description: 'El contenido se ha copiado a tu portapapeles.'
      });
      
    } catch (error) {
      console.error('Error al compartir/copiar:', error);
      toast.error('Error', {
        description: 'No se pudo compartir o copiar el contenido.'
      });
    } finally {
      setIsSharing(false);
    }
  };
  
  return { shareContent, isSharing };
}
