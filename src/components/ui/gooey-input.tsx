"use client";

/**
 * Compatibility shim: DataTable GooeyInput API → Bencho Search (Seek).
 * Do NOT pass width-overriding classNames (e.g. w-auto) — they break the circle geometry.
 */
import { Search } from "./search";

export interface GooeyInputClassNames {
  root?: string;
  filterWrap?: string;
  buttonRow?: string;
  trigger?: string;
  input?: string;
  bubble?: string;
  bubbleSurface?: string;
}

export interface GooeyInputProps {
  placeholder?: string;
  className?: string;
  classNames?: GooeyInputClassNames;
  collapsedWidth?: number;
  expandedWidth?: number;
  expandedOffset?: number;
  gooeyBlur?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}

export function GooeyInput({
  placeholder = "Buscar...",
  expandedWidth = 280,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
}: GooeyInputProps) {
  return (
    <Search
      placeholder={placeholder}
      width={expandedWidth}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  );
}
