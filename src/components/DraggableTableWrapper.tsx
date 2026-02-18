'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableTableWrapperProps {
    id: string;
    children: React.ReactNode;
}

export function DraggableTableWrapper({ id, children }: DraggableTableWrapperProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    // We pass the listeners and attributes to the children via a clone if they need to be on a specific handle
    // But for simplicity, we can just allow the whole header to be the handle, or pass it down.
    // In our case, we'll pass listeners/attributes to the AssigneeTaskTable via React.cloneElement or similar if we want a specific handle.
    // Actually, it's better to just wrap and let the AssigneeTaskTable handle the handle.

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { dragHandleProps: listeners });
                }
                return child;
            })}
        </div>
    );
}
