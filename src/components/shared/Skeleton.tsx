import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, style }) => {
  return (
    <div 
      className={cn("animate-pulse bg-white/5 rounded-lg", className)} 
      style={style}
    />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 1, className }) => {
  return (
    <div className="space-y-2 w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4", 
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full",
            className
          )} 
        />
      ))}
    </div>
  );
};

export const SkeletonCircle: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => {
  return (
    <Skeleton 
      className={cn("rounded-full shrink-0", className)} 
      style={{ width: size, height: size }} 
    />
  );
};
