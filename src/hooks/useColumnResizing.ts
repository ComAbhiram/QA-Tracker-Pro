import { useState, useRef, useCallback, useEffect } from 'react';

export default function useColumnResizing(initialWidths: Record<string, number>) {
    const [columnWidths, setColumnWidths] = useState(initialWidths);
    const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!resizingRef.current) return;
        const { key, startX, startWidth } = resizingRef.current;
        const diff = e.clientX - startX;
        setColumnWidths(prev => ({
            ...prev,
            [key]: Math.max(50, startWidth + diff) // Min width 50px
        }));
    }, []);

    const handleMouseUp = useCallback(() => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const startResizing = (key: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { key, startX: e.clientX, startWidth: columnWidths[key] || 100 };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    return { columnWidths, startResizing };
}
