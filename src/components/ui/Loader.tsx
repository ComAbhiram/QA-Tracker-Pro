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

    // Map size prop to width
    // xs: 15px
    // sm: 30px
    // md: 60px
    // lg: 90px

    const width = size === 'xs' ? '15px' : size === 'sm' ? '30px' : size === 'lg' ? '90px' : '60px';
    const sizeStyle = {
        ...style,
        width,
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
