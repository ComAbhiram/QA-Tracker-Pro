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

export function DatePicker({ date, setDate, className, placeholder = "Pick a date" }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-between text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 min-h-[46px] rounded-xl px-5 text-slate-700",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    {date ? format(date, "PPP") : <span className="text-slate-400">{placeholder}</span>}
                    <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[300]" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                        setDate(d);
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
