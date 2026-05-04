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
    <div className="h-full flex flex-col overflow-hidden relative">
      
      {/* ── Fixed Header Section ── */}
      <div className="shrink-0 p-6 sm:p-8 lg:p-12 pb-4 bg-background/80 backdrop-blur-2xl z-20 sticky top-0 border-b border-white/[0.02]">
        <div className="flex items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-syne font-bold text-foreground mb-1 tracking-tight">
              {greeting}, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Client'}</span>
            </h1>
            <p className="text-muted-foreground/40 transition-colors font-black tracking-[0.2em] text-[8px] uppercase">Service Portal</p>
          </div>
          <button 
            onClick={() => navigate('/portal/profile')}
            className="w-10 h-10 rounded-full border border-primary/20 p-0.5 bg-card hover:border-primary transition-all active:scale-95 shrink-0"
          >
             <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden text-sm">
                {profile?.full_name?.charAt(0) || <User size={16} />}
             </div>
          </button>
        </div>

        {/* Command Card (Fixed part of the header) */}
        {!isLoading && activeJobs.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-4">
               <div className="bg-primary/20 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
               <h2 className="text-foreground/40 transition-all uppercase tracking-[0.3em] font-black text-[9px]">Live Status</h2>
            </div>
            {activeJobs.slice(0, 1).map(job => (
              <div 
                key={job.id}
                onClick={() => navigate(`/portal/jobs/${job.id}`)}
                className="bg-card border border-border rounded-[24px] p-6 shadow-2xl relative overflow-hidden group cursor-pointer hover:border-primary/20 transition-all"
              >
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-[8px] font-mono font-black text-primary uppercase tracking-[0.3em] px-2.5 py-1 bg-primary/10 rounded-full border border-primary/20 shadow-sm">
                      {job.job_code}
                    </span>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                      <p className="text-xl font-mono font-bold text-emerald-400 leading-none">
                        {job.total_fee} <span className="text-[8px] uppercase ml-1 opacity-60">OMR</span>
                      </p>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-syne font-bold text-foreground group-hover:text-primary transition-colors leading-tight tracking-tight">
                    {job.service_name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable Trajectory Section ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 sm:p-8 lg:p-12 pt-4 pb-32 lg:pb-12">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <Skeleton key={i} height={120} rounded="2xl" />)}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-12">
            {activeJobs.length > 0 ? (
              activeJobs.map(job => {
                const jobSteps = allSteps?.filter(s => s.job_id === job.id).map(s => ({
                  id: s.id,
                  name_en: s.step_def?.name_en || 'Processing',
                  name_ar: s.step_def?.name_ar || '',
                  description_en: s.step_def?.description_en || '',
                  estimated_hours: s.step_def?.estimated_hours || 0,
                  status: s.status,
                  is_client_visible: s.step_def?.is_client_visible ?? true
                })) || [];

                return (
                  <div key={job.id} className="space-y-8">
                    <PizzaTracker steps={jobSteps as any} currentStatus={job.status} />
                  </div>
                )
              })
            ) : (
              <div className="bg-card border border-white/5 rounded-[32px] p-12 text-center shadow-xl">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/5">
                   <Boxes className="text-primary" size={24} />
                </div>
                <h1 className="text-3xl font-syne font-bold text-foreground mb-1">No Active Services</h1>
                <p className="text-muted-foreground/40 transition-colors uppercase tracking-[0.2em] font-black text-[8px] leading-none mb-8">
                  Repository Clear
                </p>
                <button
                  onClick={() => navigate('/portal/services')}
                  className="bg-primary text-primary-foreground font-black px-8 py-4 rounded-xl hover:shadow-2xl hover:shadow-primary/30 transition-all inline-flex items-center gap-3 active:scale-95 text-[10px] uppercase tracking-widest"
                >
                  Explore Catalog <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* ── Completed Services (Mini List) ── */}
            {completedJobs.length > 0 && (
              <section className="pt-12 border-t border-white/[0.02]">
                <h2 className="text-foreground/20 transition-all uppercase tracking-[0.3em] font-black text-[9px] mb-6">Past Successes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {completedJobs.map(job => (
                    <div key={job.id} className="bg-card/30 border border-white/[0.03] rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/20 transition-all">
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-emerald-400 transition-colors">{job.service_name}</h4>
                        <p className="text-[9px] text-[#475569] font-mono uppercase tracking-widest mt-1">Finalized / {job.job_code}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ClientDashboard;

