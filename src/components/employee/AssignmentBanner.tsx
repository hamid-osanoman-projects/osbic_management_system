import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';

export const AssignmentBanner = ({ onAccept }: { onAccept?: () => void }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);

  const fetchPending = async () => {
    if (!profile?.id) return;
    const { data, error } = await supabase
      .from('job_services')
      .select(`
        id,
        service_name,
        applicant_name,
        item_number,
        job_id,
        service:services(requires_pro)
      `)
      .eq('ops_employee_id', profile.id)
      .eq('acceptance_status', 'pending_acceptance');
    
    if (!error && data) {
      setPendingTasks(data);
    }
  };

  useEffect(() => {
    fetchPending();

    const channel = supabase.channel('acceptance-alerts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'job_services',
        filter: `ops_employee_id=eq.${profile?.id}` 
      }, () => {
        fetchPending();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleAccept = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('job_services')
        .update({
          acceptance_status: 'accepted',
          accepted_at: new Date().toISOString()
        } as any)
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task accepted successfully!');
      queryClient.invalidateQueries({ queryKey: ['ops_my_tasks'] });
      fetchPending();
      if (onAccept) onAccept();
    } catch (err: any) {
      toast.error('Failed to accept task');
    }
  };

  const handleDecline = async (taskId: string) => {
    const reason = window.prompt("Please state the reason for declining/reassigning this task:");
    if (reason === null) return;
    
    try {
      const { error } = await supabase
        .from('job_services')
        .update({
          acceptance_status: 'declined',
          ops_employee_id: null,
          declined_at: new Date().toISOString(),
          decline_reason: reason.trim() || 'Declined by employee'
        } as any)
        .eq('id', taskId);

      if (error) throw error;
      toast.success('Task returned to manager');
      queryClient.invalidateQueries({ queryKey: ['ops_my_tasks'] });
      fetchPending();
      if (onAccept) onAccept();
    } catch (err: any) {
      toast.error('Failed to return task');
    }
  };

  const visibleTasks = pendingTasks.filter(t => !dismissedTaskIds.includes(t.id));

  if (visibleTasks.length === 0) return null;

  const task = visibleTasks[0];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-24 left-1/2 -translate-x-1/2 z-[999999] w-[90%] max-w-xl bg-[#0F172A] border border-gold/40 rounded-2xl shadow-2xl p-4 md:p-5 pr-10 flex items-start gap-4 overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
        
        {/* Dismiss Button */}
        <button
          onClick={() => setDismissedTaskIds(prev => [...prev, task.id])}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          title="Dismiss Alert"
        >
          <X size={14} />
        </button>
        
        <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center text-gold shrink-0 animate-pulse">
          <Bell size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest bg-gold/10 text-gold px-2 py-0.5 rounded-full border border-gold/20">
              New Assignment
            </span>
            {task.service?.requires_pro && (
              <span className="text-[9px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-500/20">
                <Shield size={9} /> PRO
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-foreground font-syne truncate">
            {task.service_name}
          </h4>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Applicant: <span className="text-foreground font-medium">{task.applicant_name || `Applicant #${task.item_number}`}</span>
          </p>
        </div>

        <div className="flex gap-2 shrink-0 self-center">
          <button
            onClick={() => handleDecline(task.id)}
            className="px-3 py-2 bg-white/5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 border border-white/10 hover:border-red-500/20 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
            title="Decline & Reassign"
          >
            Skip
          </button>
          <button
            onClick={() => handleAccept(task.id)}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-[#0A0F1E] text-xs font-bold uppercase tracking-wider rounded-xl hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all flex items-center gap-1.5"
          >
            <Check size={14} /> Accept
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
