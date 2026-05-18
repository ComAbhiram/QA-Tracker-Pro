'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100/50 dark:border-slate-800/40 bg-slate-50/20 dark:bg-slate-900/10 backdrop-blur-md">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                Showing{' '}
                <span className="font-extrabold text-amber-600 dark:text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                    {startItem}
                </span>{' '}
                to{' '}
                <span className="font-extrabold text-amber-600 dark:text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                    {endItem}
                </span>{' '}
                of{' '}
                <span className="font-extrabold text-amber-600 dark:text-amber-500 bg-amber-500/5 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 dark:border-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                    {totalItems}
                </span>{' '}
                results
            </div>

            <nav className="flex items-center gap-1.5" aria-label="Pagination Navigation">
                {/* Previous Button */}
                <button
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                        ${currentPage === 1
                            ? 'opacity-40 border-slate-200 dark:border-slate-800/80 text-slate-405 dark:text-slate-650 pointer-events-none'
                            : 'border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 text-slate-650 dark:text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-500 cursor-pointer shadow-sm'
                        }`}
                >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1.5">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <div key={index} className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-650">
                                    <MoreHorizontal size={14} />
                                </div>
                            );
                        }

                        const isActive = currentPage === page;
                        return (
                            <button
                                key={index}
                                onClick={() => onPageChange(page as number)}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-extrabold transition-all border
                                    ${isActive
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-transparent shadow-md shadow-amber-500/20 animate-glow-pulse'
                                        : 'border-slate-200/50 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 text-slate-600 dark:text-slate-350 hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-500 cursor-pointer'
                                    }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                        ${currentPage === totalPages
                            ? 'opacity-40 border-slate-200 dark:border-slate-800/80 text-slate-405 dark:text-slate-650 pointer-events-none'
                            : 'border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/30 text-slate-650 dark:text-slate-300 hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-500 cursor-pointer shadow-sm'
                        }`}
                >
                    <span>Next</span>
                    <ChevronRight size={14} />
                </button>
            </nav>
        </div>
    );
}
