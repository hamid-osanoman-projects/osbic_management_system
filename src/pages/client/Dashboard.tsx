import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, Download, ArrowRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { useClientJobs } from '../../hooks/shared/useJobs';
import { useAuth } from '../../contexts/AuthContext';
import PizzaTracker from '../../components/client/PizzaTracker';
import Skeleton from '../../components/ui/Skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: jobs, isLoading } = useClientJobs(profile?.id || '');
  const [greeting, setGreeting] = useState('Good evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch steps for active jobs to populate trackers
  const activeJobs = jobs?.filter(j => j.status !== 'completed') || [];
  const activeJobIds = activeJobs.map(j => j.id);

  const { data: allSteps, isLoading: stepsLoading } = useQuery({
    queryKey: ['client', 'active-steps', activeJobIds],
    enabled: activeJobIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_steps')
        .select(`
          *, 
          step_def:workflow_steps(
            name_en, 
            name_ar, 
            description_en, 
            description_ar, 
            is_client_visible, 
            step_order, 
            estimated_hours
          )
        `)
        .in('job_id', activeJobIds);

      if (error) throw error;

      // Sort in-memory to ensure step_order is respected since some PostgREST versions
      // struggle with ordering deeply nested relations reliably.
      return (data || []).sort((a: any, b: any) =>
        (a.step_def?.step_order || 0) - (b.step_def?.step_order || 0)
      );
    }
  });

  const completedJobs = jobs?.filter(j => j.status === 'completed') || [];

  if (isLoading && !jobs) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-xs text-[#475569] font-bold uppercase tracking-widest">Opening Secure Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">

      {/* ── Welcome Hero ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-syne font-bold text-foreground mb-2">
            {greeting}, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Client'}</span>
          </h1>
          <p className="text-muted-foreground transition-colors font-medium">Welcome back to your personalized operational command.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <Skeleton height={300} rounded="xl" />
          <Skeleton height={200} rounded="xl" />
        </div>
      ) : (
        <>
          {/* ── Active Services (The Pizza Tracker Heroes) ── */}
          <section className="space-y-6">
            <h2 className="text-muted-foreground transition-all uppercase tracking-widest font-bold text-sm mb-6 flex items-center gap-2">
              <div className="bg-primary animate-pulse w-2 h-2 rounded-full" /> Live Service Trajectories
            </h2>

            {activeJobs.length > 0 ? (
              <div className="space-y-8">
                {activeJobs.map(job => {
                  // Get real steps for this specific job
                  const jobSteps = allSteps?.filter(s => s.job_id === job.id).map(s => ({
                    id: s.id,
                    name_en: s.step_def?.name_en || 'Processing',
                    name_ar: s.step_def?.name_ar || '',
                    description_en: s.step_def?.description_en || '',
                    estimated_hours: s.step_def?.estimated_hours || 0,
                    status: s.status,
                    is_client_visible: s.step_def?.is_client_visible ?? true
                  })) || [];

                  const stepsRemaining = job.total_steps - job.completed_steps;
                  const showWarning = !job.remaining_paid && job.remaining_due_amount > 0 && stepsRemaining <= 2;

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={job.id}
                      onClick={() => navigate(`/portal/jobs/${job.id}`)}
                      className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity -translate-y-4 translate-x-4 group-hover:translate-y-0 group-hover:translate-x-0">
                        <ArrowUpRight size={24} className="text-primary" />
                      </div>

                      <div className="mb-8">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-2xl sm:text-3xl font-syne font-bold text-foreground mb-2 group-hover:text-primary transition-colors pr-12">
                              {job.service_name}
                            </h3>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground/60 transition-colors bg-white/5 px-3 py-1 rounded-md border border-border text-xs font-mono">
                                {job.job_code}
                              </span>
                              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                                Active Since {new Date(job.started_date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground/60 transition-colors uppercase tracking-widest font-bold text-[10px] mb-1">Total Fee</p>
                            <p className="text-xl font-bold text-emerald-400">{job.total_fee} OMR</p>
                          </div>
                        </div>
                      </div>

                      {stepsLoading ? (
                        <div className="h-20 animate-pulse bg-white/5 rounded-2xl" />
                      ) : (
                        <PizzaTracker steps={jobSteps as any} currentStatus={job.status} />
                      )}

                      {showWarning && (
                        <div className="mt-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 text-amber-500">
                            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold uppercase tracking-widest mb-1">Payment Milestone Due</p>
                              <p className="text-xs text-amber-200/80">Project reached penultimate stage. Final balance of <strong className="text-amber-500 text-sm">{job.remaining_due_amount} OMR</strong> is required.</p>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); navigate('/portal/payments'); }} className="shrink-0 px-6 py-2.5 bg-amber-500 text-amber-950 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10">
                            Resolve Balance
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-3xl p-12 text-center shadow-xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="font-syne font-bold text-primary text-2xl">O</span>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Active Services</h3>
                <p className="text-muted-foreground transition-all max-w-sm mx-auto mb-8">You currently don't have any ongoing requests with OSBIC.</p>
                <button
                  onClick={() => navigate('/portal/services')}
                  className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-2xl hover:shadow-2xl hover:shadow-primary/30 transition-all inline-flex items-center gap-3 active:scale-95"
                >
                  Explore Services & Packages <ArrowRight size={20} />
                </button>
              </div>
            )}
          </section>

          {/* ── Completed Services ── */}
          {completedJobs.length > 0 && (
            <section className="border-border transition-colors border-t pt-8 space-y-6">
              <h2 className="text-muted-foreground transition-all uppercase tracking-widest font-bold text-sm">Historical Successes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {completedJobs.map(job => (
                  <div key={job.id} className="bg-card/50 border border-emerald-500/10 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />

                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">Service Finalized</p>
                        <h4 className="text-lg font-bold text-foreground">{job.service_name}</h4>
                      </div>
                      <span className="text-[10px] text-[#475569] font-mono">{job.job_code}</span>
                    </div>

                    <div className="border-border transition-colors border-t mt-8 pt-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <p className="text-xs text-[#94A3B8]">
                        Finalized on {new Date(job.expected_completion).toLocaleDateString()}
                      </p>
                      <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-foreground rounded-lg text-sm font-medium transition-colors border border-white/10">
                        <Download size={14} /> View Deliverables
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

    </div>
  );
};

export default ClientDashboard;
