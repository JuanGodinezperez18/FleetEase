
"use client";

import React, { useState, useEffect } from 'react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DatePickerWithManualInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function DatePickerWithManualInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Seleccionar fecha"
}: DatePickerWithManualInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Sincronizar el input con el valor prop
  useEffect(() => {
    if (value) {
      setInputValue(format(value, 'dd/MM/yyyy'));
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Intentar parsear la fecha mientras el usuario escribe
    if (newValue.length === 10) { // dd/mm/yyyy tiene 10 caracteres
      const parsed = parse(newValue, 'dd/MM/yyyy', new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      }
    } else if (newValue === '') {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder="dd/mm/yyyy"
        disabled={disabled}
        className="flex-1"
        maxLength={10}
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            disabled={disabled}
            locale={es}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
