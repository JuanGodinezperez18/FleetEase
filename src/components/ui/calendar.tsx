

"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 bg-card text-card-foreground rounded-lg shadow-lg", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-base font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 rounded-full hover:bg-accent hover:text-accent-foreground"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-full transition-colors",
          "hover:bg-accent hover:text-accent-foreground"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground ring-1 ring-accent-foreground/50",
        day_outside:
          "text-muted-foreground/70",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "bg-accent text-accent-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      captionLayout="dropdown-buttons"
      fromYear={currentYear - 10}
      toYear={currentYear + 10}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
