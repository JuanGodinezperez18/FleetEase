
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Menu } from 'lucide-react';

interface AppHeaderProps {
  title?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
}

export function AppHeader({ title, children, isLoading = false }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-col justify-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <div className="flex items-center gap-4">
        {/* The SidebarTrigger might be handled by the new SidebarLayout */}
        <div className="w-full flex justify-start">
          {children}
        </div>
        <div className="ml-auto flex items-center gap-2">
        </div>
      </div>
      {isLoading && <Progress value={100} className="h-1 animate-pulse" />}
    </header>
  );
}
