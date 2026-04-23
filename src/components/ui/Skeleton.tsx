import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  width, 
  height, 
  rounded = 'md' 
}) => {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={cn(
        "skeleton bg-white/5",
        roundedClasses[rounded],
        className
      )}
      style={{ width, height }}
    />
  );
};

export default Skeleton;
