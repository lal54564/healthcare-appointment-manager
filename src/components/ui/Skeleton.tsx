import React from 'react';
import clsx from 'clsx';

type SkeletonVariant = 'text' | 'circle' | 'card' | 'table-row';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  className,
  ...props
}) => {
  const baseClasses = 'animate-shimmer rounded-md';
  
  const variantClasses = {
    text: 'h-4 w-full',
    circle: 'rounded-full h-12 w-12',
    card: 'h-48 w-full rounded-2xl',
    'table-row': 'h-10 w-full rounded-lg',
  };

  return (
    <div
      className={clsx(baseClasses, variantClasses[variant], className)}
      aria-hidden="true"
      {...props}
    />
  );
};
