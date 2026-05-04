import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, MessageSquare, ShieldCheck, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { type JobStep } from '../../hooks/shared/useJobs';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigate } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  steps: (JobStep & { description_en?: string; estimated_hours?: number })[];
  currentStatus: string;
}

const PizzaTracker = ({ steps, currentStatus }: Props) => {
  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  
  const visibleSteps = useMemo(() => steps.filter(s => s.is_client_visible), [steps]);
  
  if (visibleSteps.length === 0) return null;

  const activeIndex = visibleSteps.findIndex(s => s.status !== 'completed');
  const normalizedActiveIndex = activeIndex === -1 ? visibleSteps.length : activeIndex;

  // Logic for "Show All" button - initially show only 2 steps if many exist
  const displayedSteps = showAllSteps ? visibleSteps : visibleSteps.slice(0, 2);
  const hasMoreSteps = visibleSteps.length > 2;

  return (
    <div className="relative space-y-6">
      <div className={cn(
        "relative space-y-4 transition-all duration-700",
        !showAllSteps && hasMoreSteps ? "max-h-[500px] overflow-hidden" : ""
      )}>
        {/* Smooth Scroll Container Overlay if needed, but here we use a simple list */}
        {displayedSteps.map((step, idx) => {
          const isCompleted = idx < normalizedActiveIndex;
          const isCurrent = idx === normalizedActiveIndex;
          const isPending = idx > normalizedActiveIndex;
          const isExpanded = expandedCard === idx;

          return (
            <div key={idx} className="relative pl-8 sm:pl-12 group">
              {/* Vertical Line Connector */}
              {idx !== visibleSteps.length - 1 && (
                <div className={cn(
                  "absolute left-[15px] sm:left-[19px] top-10 bottom-0 w-[2px] transition-all duration-700",
                  isCompleted ? "bg-emerald-500" : "bg-white/5 border-l-2 border-dashed border-white/10"
                )} />
              )}

              {/* Milestone Icon Container */}
              <div className="absolute left-0 top-1 z-10">
                <div className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-2xl",
                  isCompleted ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : 
                  isCurrent ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(212,175,55,0.4)] text-primary" : 
                  "bg-white/5 border-white/5 text-muted-foreground/30"
                )}>
                  {isCompleted ? <Check size={18} className="stroke-[3]" /> : 
                   isCurrent ? (
                     <div className="relative">
                        <Zap size={18} className="animate-pulse" />
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 1.5, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-primary rounded-full"
                        />
                     </div>
                   ) : 
                   <Clock size={16} />}
                </div>
              </div>

              {/* Milestone Card */}
              <motion.div 
                onClick={() => setExpandedCard(isExpanded ? null : idx)}
                layout
                className={cn(
                  "bg-card border rounded-[20px] p-4 sm:p-5 transition-all duration-500 cursor-pointer",
                  isCurrent ? "border-primary/30 shadow-2xl shadow-primary/5" : "border-border opacity-80 hover:border-primary/20"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className={cn(
                        "text-base sm:text-lg font-syne font-bold mb-0.5 tracking-tight",
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground/40"
                      )}>
                        {step.name_en}
                      </h4>
                      <p className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                        Phase {idx + 1} / {visibleSteps.length}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    {isCurrent && (
                      <div className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">Ongoing</span>
                      </div>
                    )}
                    <div className={cn("text-muted-foreground/20 transition-transform", isExpanded && "rotate-180")}>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        {step.description_en && (
                          <p className={cn(
                            "text-sm leading-relaxed mb-6",
                            isPending ? "text-muted-foreground/20" : "text-muted-foreground/80"
                          )}>
                            {step.description_en}
                          </p>
                        )}

                        {/* Functional Bottom Slot - Only show if current or has description to keep it clean */}
                        {(isCurrent || step.description_en) && (
                          <>
                            <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-[10px]">
                                    OS
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Support Agent</p>
                                  <p className="text-xs font-bold text-foreground">Osan Support Team</p>
                                </div>
                              </div>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate('/portal/messages'); }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-muted border border-border rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 group"
                              >
                                <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
                                Chat Agent
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          );
        })}
      </div>

      {hasMoreSteps && (
        <button 
          onClick={() => setShowAllSteps(!showAllSteps)}
          className="w-full py-4 border border-dashed border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-3 group"
        >
          {showAllSteps ? (
            <>
              <ChevronUp size={14} className="group-hover:-translate-y-1 transition-transform" />
              Collapse Trajectory
            </>
          ) : (
            <>
              <ChevronDown size={14} className="group-hover:translate-y-1 transition-transform" />
              Show All Steps ({visibleSteps.length})
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default PizzaTracker;
