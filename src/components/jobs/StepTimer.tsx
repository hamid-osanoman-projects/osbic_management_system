import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StepTimerProps {
  deadline: string;
}

const StepTimer = ({ deadline }: StepTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft('OVERDUE');
        setIsOverdue(true);
        setIsUrgent(false);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setIsOverdue(false);
      setIsUrgent(days === 0 && hours < 3);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);

      setTimeLeft(parts.join(' '));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm",
      isOverdue 
        ? "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse" 
        : isUrgent 
          ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    )}>
      {isOverdue ? <AlertTriangle size={12} /> : <Clock size={12} />}
      <span>{timeLeft}</span>
    </div>
  );
};

export default StepTimer;
