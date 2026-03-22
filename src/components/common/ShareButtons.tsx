

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { Notification } from '@/types';

interface ShareButtonsProps {
  notifications: Omit<Notification, 'readAt'>[];
  title: string;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ notifications, title }) => {

  const generateShareText = () => {
    const header = `*${title} - FleetEase*`;
    const body = notifications.map(n => `- ${n.message}`).join('\n');
    return `${header}\n\n${body}`;
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // User cancelled the share operation, do nothing.
        } else {
          console.error('Error sharing:', error);
          toast.error("Error al compartir", { description: "No se pudo compartir la información." });
        }
      }
    } else {
      // Fallback for browsers that do not support navigator.share
      handleCopyToClipboard();
    }
  };
  
  const handleCopyToClipboard = () => {
    const textToCopy = generateShareText();
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success("Copiado al portapapeles", {
        description: "El resumen de alertas ha sido copiado.",
      });
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      toast.error("Error al copiar", { description: "No se pudo copiar el texto." });
    });
  };

  return (
    <div className="flex items-center gap-2 mt-4">
      <Button variant="outline" size="sm" onClick={handleShare}>
        <Share2 className="mr-2 h-4 w-4" />
        Compartir
      </Button>
      <Button variant="ghost" size="sm" onClick={handleCopyToClipboard}>
        <Copy className="mr-2 h-4 w-4" />
        Copiar
      </Button>
    </div>
  );
};

export default ShareButtons;
