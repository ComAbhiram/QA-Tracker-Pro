'use client';

import { X, AlertTriangle } from 'lucide-react';
import Loader from './ui/Loader';
import CloseButton from './ui/CloseButton';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const colors = {
        danger: {
            icon: 'text-rose-600 bg-rose-50',
            button: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
            border: 'border-rose-100'
        },
        warning: {
            icon: 'text-amber-600 bg-amber-50',
            button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500', // Warning usually means proceed with caution but primary action
            border: 'border-amber-100'
        },
        info: {
            icon: 'text-indigo-600 bg-indigo-50',
            button: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
            border: 'border-indigo-100'
        }
    };

    const currentColors = colors[type];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${currentColors.icon}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                            <div className="text-sm text-slate-600 leading-relaxed">
                                {message}
                            </div>
                        </div>
                        <CloseButton onClick={onClose} />
                    </div>
                </div>
                <div className="bg-slate-50 p-4 flex items-center justify-end gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${currentColors.button}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader size="xs" color="white" />
                                Processing...
                            </>
                        ) : confirmText}
                    </button>
                </div>
            </div >
        </div >
    );
}
