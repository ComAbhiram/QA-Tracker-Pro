'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

interface ComboboxOption {
    id: string | number;
    label: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value?: string | number;
    onChange: (value: string | number | null) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
    isLoading?: boolean;
}

export default function Combobox({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    emptyMessage = 'No option found.',
    className = '',
    disabled = false,
    required = false,
    isLoading = false,
}: ComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial selected label
    const selectedOption = options.find((opt) => opt.id === value || opt.label === value);
    // Note: We check label too because sometimes we might pass the name as value directly if ID isn't used

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full flex items-center justify-between px-5 py-3 text-left bg-slate-50 border rounded-xl transition-all outline-none ${open ? 'ring-2 ring-indigo-500/20 border-indigo-500' : 'border-slate-200 hover:border-slate-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={disabled}
            >
                <span className={`block truncate ${selectedOption ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Hidden input for form validation if required */}
            {required && (
                <input
                    type="text"
                    className="sr-only"
                    required
                    value={value || ''}
                    onChange={() => { }}
                    tabIndex={-1}
                />
            )}

            {open && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-none rounded-lg focus:ring-0 text-slate-700 placeholder:text-slate-400"
                                placeholder={searchPlaceholder}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto p-1 custom-scrollbar">
                        {isLoading ? (
                            <div className="py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                                <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                                <span>Loading...</span>
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-500">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        // Allow passing either ID or Label depending on requirement
                                        // But typically we return ID.
                                        // Since the parent expects the value to match, we just trigger onChange
                                        onChange(option.label); // Returning label as Project Name is string in DB
                                        setOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${(value === option.id || value === option.label)
                                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                                        : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    {(value === option.id || value === option.label) && (
                                        <Check className="w-4 h-4 text-indigo-600" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
