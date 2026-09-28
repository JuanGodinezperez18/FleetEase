"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-[var(--fe-radius-md)] bg-[var(--fe-surface)] p-3 text-[var(--fe-text)] shadow-[var(--fe-shadow-md)]",
        className
      )}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-base font-semibold text-[var(--fe-text)]",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-full bg-transparent p-0 hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "w-9 rounded-md text-[0.8rem] font-normal text-[var(--fe-text-muted)]",
        row: "mt-2 flex w-full",
        cell: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-full p-0 font-normal transition-colors duration-[var(--fe-motion-fast)] hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]"
        ),
        day_selected:
          "bg-[var(--fe-lime)] text-[var(--fe-ink)] hover:bg-[var(--fe-lime)] focus:bg-[var(--fe-lime)] focus:text-[var(--fe-ink)]",
        day_today:
          "bg-[var(--fe-hover)] text-[var(--fe-text)] ring-1 ring-[var(--fe-lime)]",
        day_outside: "text-[var(--fe-text-muted)] opacity-70",
        day_disabled: "text-[var(--fe-text-muted)] opacity-50",
        day_range_middle: "rounded-none bg-[var(--fe-nav-active)] text-[var(--fe-text)]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
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
