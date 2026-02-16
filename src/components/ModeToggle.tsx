"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
    const { setTheme, theme } = useTheme()

    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full">
            <button
                onClick={() => setTheme("light")}
                className={`flex-1 flex items-center justify-center p-1.5 rounded-md transition-all ${theme === "light"
                    ? "bg-white text-amber-500 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                title="Light Mode"
            >
                <Sun size={16} className="shrink-0" />
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`flex-1 flex items-center justify-center p-1.5 rounded-md transition-all ${theme === "dark"
                    ? "bg-slate-700 text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                title="Dark Mode"
            >
                <Moon size={16} className="shrink-0" />
            </button>
            <button
                onClick={() => setTheme("system")}
                className={`flex-1 flex items-center justify-center p-1.5 rounded-md transition-all ${theme === "system"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                title="System Preference"
            >
                <Monitor size={16} className="shrink-0" />
            </button>
        </div>
    )
}
