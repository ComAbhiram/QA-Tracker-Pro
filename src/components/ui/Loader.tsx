import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: string;
}

export default function Loader({ className, size = 'md', color }: LoaderProps) {
    // Use style to handle custom color if provided, otherwise default to CSS class color
    const style = color ? { color } : undefined;

    // Map size prop to scale
    // xs: ~15px (0.25)
    // sm: ~30px (0.5)
    // md: ~60px (1)
    // lg: ~90px (1.5)

    const scale = size === 'xs' ? 0.25 : size === 'sm' ? 0.5 : size === 'lg' ? 1.5 : 1;
    const sizeStyle = {
        ...style,
        transform: `scale(${scale})`,
        transformOrigin: 'center'
    };

    return (
        <div
            className={cn("loader", className)}
            style={sizeStyle}
            role="status"
            aria-label="Loading"
        />
    );
}
