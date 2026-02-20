"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    className?: string
    placeholder?: string
}

export function DatePicker({ date, setDate, className, placeholder = "Pick a date", align = "start" }: DatePickerProps & { align?: "center" | "start" | "end" }) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full text-left font-normal bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 min-h-[46px] rounded-xl px-5 text-slate-700 dark:text-slate-200 block",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="flex items-center justify-between w-full h-full overflow-hidden">
                        {date && !isNaN(date.getTime()) ? <span className="truncate">{format(date, "MMM d, yyyy")}</span> : <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>}
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[300] dark:bg-slate-900 dark:border-slate-800" align={align}>
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pick a date</span>
                    <button
                        onClick={() => {
                            setDate(undefined);
                            setOpen(false);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
                    >
                        Clear date
                    </button>
                </div>
                <Calendar
                    mode="single"
                    selected={date}
                    defaultMonth={date}
                    onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                    }}
                    initialFocus
                    classNames={{
                        day_selected: "bg-indigo-600 text-white hover:bg-indigo-700 focus:bg-indigo-700",
                        day: cn(
                            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-200 rounded-md transition-colors"
                        ),
                        curr_month: "dark:text-slate-200",
                        nav_button: "dark:text-slate-200 dark:hover:bg-slate-800"
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
