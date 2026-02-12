'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface Team {
    id: string;
    name: string;
}

interface TeamSelectorProps {
    teams: Team[];
    selectedTeamName: string | null;
    onSelect: (teamName: string) => void;
}

export function TeamSelector({ teams, selectedTeamName, onSelect }: TeamSelectorProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className="w-full flex items-center justify-between bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-md text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <span className="truncate">
                        {selectedTeamName || "Select Team"}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="flex flex-col">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50 border-b">
                        Select Team
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                        {teams.map((team) => {
                            const isSelected = selectedTeamName === team.name;
                            return (
                                <button
                                    key={team.id}
                                    onClick={() => {
                                        onSelect(team.name);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between mb-0.5",
                                        isSelected
                                            ? "bg-blue-500 text-white font-medium hover:bg-blue-600"
                                            : "text-slate-700 hover:bg-slate-100"
                                    )}
                                >
                                    <span className="truncate">{team.name}</span>
                                    {isSelected && <Check className="h-3 w-3" />}
                                </button>
                            );
                        })}
                        {teams.length === 0 && (
                            <div className="px-3 py-4 text-center text-sm text-slate-400">
                                No teams available
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
