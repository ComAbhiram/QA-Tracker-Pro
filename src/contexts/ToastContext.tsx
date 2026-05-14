'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string | ReactNode;
    type: ToastType;
}

interface ToastContextType {
    toasts: Toast[]; // Kept for type compatibility
    showToast: (message: string | ReactNode, type: ToastType) => void;
    removeToast: (id: string) => void;
    success: (message: string | ReactNode) => void;
    error: (message: string | ReactNode) => void;
    warning: (message: string | ReactNode) => void;
    info: (message: string | ReactNode) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {

    const showToast = (message: string | ReactNode, type: ToastType = 'info') => {
        switch (type) {
            case 'success':
                toast.success(message);
                break;
            case 'error':
                toast.error(message);
                break;
            case 'warning':
                toast.warning(message);
                break;
            case 'info':
            default:
                toast.info(message);
                break;
        }
    };

    const success = (message: string | ReactNode) => toast.success(message);
    const error = (message: string | ReactNode) => toast.error(message);
    const warning = (message: string | ReactNode) => toast.warning(message);
    const info = (message: string | ReactNode) => toast.info(message);

    const removeToast = (id: string) => {
        toast.dismiss(id);
    };

    return (
        <ToastContext.Provider value={{
            toasts: [],
            showToast,
            removeToast,
            success,
            error,
            warning,
            info
        }}>
            {children}
        </ToastContext.Provider>
    );
};
