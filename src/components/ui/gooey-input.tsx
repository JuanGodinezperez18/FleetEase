"use client";

/**
 * Compatibility shim: previous Aceternity GooeyInput API
 * now renders Bencho Search (Seek) so all DataTable search bars update.
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
  className,
  expandedWidth = 280,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
}: GooeyInputProps) {
  return (
    <Search
      placeholder={placeholder}
      className={className}
      width={expandedWidth}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    />
  );
}
