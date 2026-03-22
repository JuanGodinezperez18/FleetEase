'use client';

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeCustomizerProps {
  className?: string;
}

const PRESET_THEMES = [
  {
    name: 'Azul Oceáno',
    primary: '217 91% 60%',
    accent: '199 89% 48%',
  },
  {
    name: 'Verde Bosque',
    primary: '142 76% 36%',
    accent: '142 71% 45%',
  },
  {
    name: 'Púrpura Real',
    primary: '262 83% 58%',
    accent: '270 95% 75%',
  },
  {
    name: 'Naranja Sunset',
    primary: '25 95% 53%',
    accent: '31 97% 72%',
  },
  {
    name: 'Rosa Vibrante',
    primary: '330 81% 60%',
    accent: '320 85% 70%',
  },
  {
    name: 'Índigo Pro',
    primary: '239 84% 67%',
    accent: '221 83% 53%',
  },
];

export function ThemeCustomizer({ className }: ThemeCustomizerProps) {
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system');

  const applyTheme = (theme: typeof PRESET_THEMES[0]) => {
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--accent', theme.accent);

    localStorage.setItem('theme-primary', theme.primary);
    localStorage.setItem('theme-accent', theme.accent);
  };

  const applyThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    localStorage.setItem('theme-mode', mode);

    if (mode === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalización de Tema
        </h3>
        <p className="text-sm text-muted-foreground">
          Personaliza los colores y el modo de tu interfaz
        </p>
      </div>

      <Tabs defaultValue="mode">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mode">Modo</TabsTrigger>
          <TabsTrigger value="colors">Colores</TabsTrigger>
        </TabsList>

        {/* Theme Mode */}
        <TabsContent value="mode" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => applyThemeMode('light')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                themeMode === 'light'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Sun className="h-6 w-6" />
              <span className="text-sm font-medium">Claro</span>
            </button>

            <button
              onClick={() => applyThemeMode('dark')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                themeMode === 'dark'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Moon className="h-6 w-6" />
              <span className="text-sm font-medium">Oscuro</span>
            </button>

            <button
              onClick={() => applyThemeMode('system')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                themeMode === 'system'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">Sistema</span>
            </button>
          </div>
        </TabsContent>

        {/* Theme Colors */}
        <TabsContent value="colors" className="space-y-4">
          <Label>Temas Predefinidos</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className="flex flex-col items-start gap-2 p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all text-left"
              >
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{
                      background: `hsl(${theme.primary})`,
                    }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{
                      background: `hsl(${theme.accent})`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium">{theme.name}</span>
              </button>
            ))}
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset to default
                document.documentElement.style.removeProperty('--primary');
                document.documentElement.style.removeProperty('--accent');
                localStorage.removeItem('theme-primary');
                localStorage.removeItem('theme-accent');
              }}
              className="w-full"
            >
              Restaurar Tema Por Defecto
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
