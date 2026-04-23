import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, PlayCircle } from 'lucide-react';
import { type JobStep } from '../../hooks/shared/useJobs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  steps: (JobStep & { description_en?: string; estimated_hours?: number })[];
  currentStatus: string;
}

const PizzaTracker = ({ steps, currentStatus }: Props) => {
  // 1. Filter and identify key milestones
  const visibleSteps = steps.filter(s => s.is_client_visible);
  
  if (visibleSteps.length === 0) return null;

  // 2. Identify precisely where we are in the visible timeline
  // The normalized active index is the first step that ISN'T completed.
  const activeIndex = visibleSteps.findIndex(s => s.status !== 'completed');
  const normalizedActiveIndex = activeIndex === -1 ? visibleSteps.length : activeIndex;
  const isAllCompleted = normalizedActiveIndex === visibleSteps.length;

  // 3. Accurate progression calculation
  // We want the yellow line to stretch precisely to the center of the active node.
  const calculateProgress = () => {
    if (isAllCompleted) return 100;
    if (visibleSteps.length <= 1) return 100;
    
    // Percentage = (How many nodes fully passed / total intervals) * 100
    // An interval is the space between nodes. 
    // Total intervals = visibleSteps.length - 1
    const progress = (normalizedActiveIndex / (visibleSteps.length - 1)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const [counter, setCounter] = useState(0);
  const targetProgress = calculateProgress();
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const incrementTime = 20;
    const stepsCount = duration / incrementTime;
    const incrementAmt = targetProgress / stepsCount;

    const timer = setInterval(() => {
      start += incrementAmt;
      if (start >= targetProgress) {
        setCounter(Math.round(targetProgress));
        clearInterval(timer);
      } else {
        setCounter(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [targetProgress]);

  return (
    <div className="w-full relative">
      {/* ── TRACKER TRAJECTORY ── */}
      <div className="relative mb-12 pt-4">
        {/* Background Track (Grey) */}
        <div className="hidden sm:block h-1 rounded-full absolute top-1/2 left-0 right-0 -translate-y-1/2 bg-muted border border-border" />
        
        {/* Active Progress Track (Gold) */}
        <motion.div 
          initial={{ width: '0%' }}
          animate={{ width: `${targetProgress}%` }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="bg-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] hidden sm:block h-1 rounded-full absolute top-1/2 left-0 -translate-y-1/2" 
        />

        {/* Mobile Vertical Track */}
        <div className="absolute left-4 top-2 bottom-2 w-1 bg-muted rounded-full sm:hidden" />
        <motion.div 
          initial={{ height: '0%' }}
          animate={{ height: `${targetProgress}%` }}
          transition={{ duration: 1.5 }}
          className="absolute left-4 top-2 w-1 bg-gold rounded-full sm:hidden" 
        />

        {/* Milestone Nodes */}
        <div className="flex flex-col sm:flex-row justify-between relative z-10 pl-10 sm:pl-0">
          {visibleSteps.map((step, idx) => {
            const isCompleted = idx < normalizedActiveIndex;
            const isCurrent = idx === normalizedActiveIndex;
            const isPending = idx > normalizedActiveIndex;

            return (
              <div 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); setSelectedStep(selectedStep === idx ? null : idx); }}
                className={cn(
                  "flex flex-row sm:flex-col items-start sm:items-center relative group flex-1 cursor-help",
                  isCurrent ? "z-20 scale-110" : "z-10"
                )}
              >
                 {/* Milestone Icon Container */}
                 <div className="absolute -left-10 top-0 sm:static sm:mb-4">
                   <div className={cn(
                     "w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500",
                     isCompleted ? "border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/5" : 
                     isCurrent ? "border-gold text-gold shadow-[0_0_25px_rgba(212,175,55,0.5)] ring-4 ring-gold/10 bg-gold/10" : 
                     "border-border text-muted-foreground/40 bg-muted/20"
                   )}>
                     {isCompleted ? <Check size={18} className="stroke-[3]" /> : 
                      isCurrent ? <PlayCircle size={18} className="animate-pulse" /> : 
                      <Clock size={16} />}
                   </div>
                   
                   {/* "Next" Indicator Label */}
                   {!isAllCompleted && idx === normalizedActiveIndex + 1 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden sm:block">
                        <span className="text-[8px] font-black tracking-widest text-primary uppercase bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Target</span>
                      </div>
                   )}
                 </div>

                 {/* Text Labeling */}
                 <div className="sm:text-center px-2">
                    <p className={cn(
                      "text-xs font-bold leading-tight mb-1 transition-colors uppercase tracking-tight",
                      isCurrent ? "text-gold" : isCompleted ? "text-foreground" : "text-muted-foreground/30"
                    )}>
                      {step.name_en}
                    </p>
                    
                    {isCurrent && (
                        <div className="bg-emerald-500/10 px-2 py-0.5 rounded inline-block">
                           <p className="text-[8px] text-emerald-400 font-black uppercase tracking-widest leading-none">In Progress</p>
                        </div>
                    )}
                 </div>

                 {/* Desktop Info Tooltip (Floating) */}
                 {selectedStep === idx && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="absolute top-16 left-1/2 -translate-x-1/2 w-48 bg-card border border-primary/20 p-4 rounded-2xl z-[100] shadow-2xl backdrop-blur-md"
                    >
                       <p className="text-[10px] font-bold text-primary uppercase mb-2 tracking-widest border-b border-white/5 pb-1">{step.name_en}</p>
                       <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {step.description_en || "This essential step is being processed by our operations team."}
                       </p>
                       {step.estimated_hours && !isCompleted && (
                          <div className="mt-3 flex items-center gap-2 text-gold">
                             <Clock size={10} />
                             <span className="text-[9px] font-bold">EST. {step.estimated_hours}h</span>
                          </div>
                       )}
                    </motion.div>
                 )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PROJECT PULSE STATS ── */}
      <div className="bg-card/30 backdrop-blur-sm border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
         
         <div className="flex items-center gap-6 group">
            {/* Dynamic Progress Circle */}
            <div className="relative shrink-0 scale-110">
               <svg className="w-20 h-20 transform -rotate-90">
                 <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                 <motion.circle 
                   cx="40" cy="40" r="34" fill="none" stroke="#d4af37" strokeWidth="6"
                   initial={{ strokeDasharray: '213', strokeDashoffset: '213' }}
                   animate={{ strokeDashoffset: 213 - (213 * targetProgress) / 100 }}
                   transition={{ duration: 2, ease: "easeOut" }}
                   strokeLinecap="round"
                   className="drop-shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-gold font-syne font-black text-lg leading-none">{counter}%</span>
               </div>
            </div>

            <div className="space-y-1">
               <p className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-black text-[9px] leading-none mb-1">Current Milstone Priority</p>
               <h4 className="text-foreground font-bold text-lg leading-tight uppercase font-syne">
                  {isAllCompleted ? 'Success! Project Finalized' : visibleSteps[normalizedActiveIndex]?.name_en}
               </h4>
               <p className="text-primary/70 text-[10px] font-bold tracking-widest flex items-center gap-2 uppercase">
                  <span className={cn("w-1.5 h-1.5 rounded-full animate-ping", isAllCompleted ? "bg-emerald-400" : "bg-gold")} />
                  {currentStatus.replace('_', ' ')}
               </p>
            </div>
         </div>
         
         {/* Vertical Divider */}
         <div className="hidden md:block w-px h-16 bg-white/5" />
         
         {/* Case Officer / Help Context */}
         <div className="w-full md:w-auto flex flex-col md:items-end gap-3">
            <div className="flex flex-col md:items-end">
                <p className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[9px] mb-2">Dedicated Case Officer</p>
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-2 pl-3 group hover:border-gold/30 transition-all">
                  <span className="text-foreground font-bold text-xs">Osan Support Team</span>
                  <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-black text-[10px]">OS</div>
                </div>
            </div>
            
            {!isAllCompleted && visibleSteps[normalizedActiveIndex]?.estimated_hours && (
               <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-mono opacity-40">
                  <Clock size={12} />
                  <span>Updates typically every {visibleSteps[normalizedActiveIndex].estimated_hours} hours</span>
               </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default PizzaTracker;
