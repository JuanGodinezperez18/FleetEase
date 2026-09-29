"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { es } from 'date-fns/locale';

interface NativeDateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
}

export function NativeDateRangePicker({
  className,
  date,
  onDateChange
}: NativeDateRangePickerProps) {
  const [fromDate, setFromDate] = React.useState<string>(
    date?.from ? format(date.from, 'yyyy-MM-dd') : ''
  );
  const [toDate, setToDate] = React.useState<string>(
    date?.to ? format(date.to, 'yyyy-MM-dd') : ''
  );

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFromDate(value);

    if (value) {
      const from = new Date(value);
      const to = toDate ? new Date(toDate) : undefined;
      onDateChange({ from, to });
    } else {
      onDateChange(undefined);
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setToDate(value);

    if (value && fromDate) {
      const from = new Date(fromDate);
      const to = new Date(value);
      onDateChange({ from, to });
    }
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    onDateChange(undefined);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "PPP", { locale: es })} - {format(date.to, "PPP", { locale: es })}
                </>
              ) : (
                format(date.from, "PPP", { locale: es })
              )
            ) : (
              <span>Seleccione un rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-date">Fecha inicio</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={handleFromChange}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-date">Fecha fin</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={handleToChange}
                min={fromDate}
                className="w-full"
              />
            </div>
            {(fromDate || toDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Limpiar fechas
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
