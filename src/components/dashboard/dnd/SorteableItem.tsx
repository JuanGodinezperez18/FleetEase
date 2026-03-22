// components/dashboard/dnd/SortableItem.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

type Props = {
  id: string;
  children: (args: { handleProps: any }) => React.ReactNode; // render prop
  className?: string;
};

export default function SortableItem({ id, children, className }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined, // más prudente que 999
    touchAction: 'manipulation',
  };

  const handleProps = {
    ...attributes,
    ...listeners,
    tabIndex: 0,
    role: 'button',
    'aria-label': 'Reordenar widget',
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`rounded-md ${className ?? ''}`}
      layout
      initial={false}
      animate={{ scale: isDragging ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      {children({ handleProps })}
    </motion.div>
  );
}
