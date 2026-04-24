import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../types/database';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  job_code: string;
  client_id: string;
  client_name: string;
  client_avatar?: string;
  service_category: string;
  service_name: string;
  employee_id: string;
  employee_name: string;
  employee_avatar?: string;
  status: 'active' | 'on_hold' | 'completed' | 'cancelled' | 'pending' | string;
  started_date: string;
  expected_completion: string;
  days_active: number;
  total_steps: number;
  completed_steps: number;
  total_fee: number;
  work_fee: number;
  ministry_fee: number;
  advance_paid: boolean;
  remaining_paid: boolean;
  advance_due_amount: number;
  advance_receipt_url?: string;
  remaining_due_amount: number;
  remaining_receipt_url?: string;
  documents?: JobDocument[];
}

export interface JobStep {
  id: string;
  job_id: string;
  step_definition_id: string;
  name_en: string;
  name_ar: string;
  order_index: number;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped';
  is_client_visible: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  deadline?: string | null;           // New: SLA Deadline
  completed_by_name?: string;
  rejection_reason?: string;
  extension_reason?: string;          // New: Reason for extension
  required_docs: string[];
  estimated_hours?: number;           // New: Step Duration
  estimated_gov_fee?: number;         // New: Estimated ministry cost
  actual_gov_fee?: number;            // New: Actual recorded cost
  notes?: string | null;              // New: Completion Notes
}

export interface JobDocument {
  id: string;
  job_id: string;
  step_id?: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by_name: string;
  uploaded_at: string;
  status: 'approved' | 'pending' | 'rejected';
  rejection_reason?: string;
}

export interface JobMessage {
  id: string;
  job_id: string;
  sender_id: string;
  sender_type: 'employee' | 'client' | 'admin';
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface JobAuditLog {
  id: string;
  job_id: string;
  action: string;
  actor_name: string;
  timestamp: string;
  details: string;
}

// ─── Admin: All Jobs ──────────────────────────────────────────────────────────
export const useAdminJobs = () => {
  return useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!client_id(full_name, avatar_url),
          employee:profiles!employee_id(full_name, avatar_url),
          service:services!service_id(name_en, category),
          job_steps(status, actual_gov_fee, workflow_step_id, step_def:workflow_steps!workflow_step_id(estimated_gov_fee))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((j: any) => {
        const totalSteps = j.job_steps?.length || 0;
        const completedSteps = j.job_steps?.filter((s: any) => s.status === 'completed').length || 0;
        
        return {
          id: j.id,
          job_code: j.job_code || 'UNTITLED',
          client_id: j.client_id,
          client_name: j.client?.full_name || 'Anonymous Client',
          client_avatar: j.client?.avatar_url,
          service_name: j.service?.name_en || 'Standard Service',
          service_category: j.service?.category || 'other',
          employee_id: j.employee_id,
          employee_name: j.employee?.full_name || 'Unassigned',
          employee_avatar: j.employee?.avatar_url,
          status: j.status || 'pending',
          started_date: j.started_at || j.created_at,
          expected_completion: j.created_at,
          days_active: Math.ceil((Date.now() - new Date(j.created_at).getTime()) / 86400000),
          total_steps: totalSteps,
          completed_steps: completedSteps,
          total_fee: Number(j.total_fee) || 0,
          work_fee: Number(j.work_fee) || 0,
          ministry_fee: Number(j.ministry_fee) || 0,
          advance_paid: j.advance_paid ?? false,
          remaining_paid: j.remaining_paid ?? false,
          advance_due_amount: Number(j.advance_amount) || 0,
          remaining_due_amount: Number(j.remaining_amount) || 0,
        };
      });
    },
  });
};

// ─── Employee: My Jobs ────────────────────────────────────────────────────────
export const useEmployeeJobs = (employeeId: string) => {
  return useQuery({
    queryKey: ['employee', 'jobs', employeeId],
    enabled: !!employeeId,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!client_id(full_name, avatar_url),
          service:services!service_id(name_en, category),
          job_steps(status, actual_gov_fee, workflow_step_id)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((j: any) => {
        const totalSteps = j.job_steps?.length || 0;
        const completedSteps = j.job_steps?.filter((s: any) => s.status === 'completed').length || 0;
        // Approximation of completed steps since we don't fetch all statuses here for performance
        // In a real high-perf scenario, we'd use a RPC or view. 
        // For now, let's just make the total steps work so we don't get NaN.
        
        return {
          id: j.id,
          job_code: j.job_code,
          client_id: j.client_id,
          client_name: j.client?.full_name ?? 'Unknown',
          service_name: j.service?.name_en ?? 'Unknown',
          service_category: j.service?.category ?? 'other',
          employee_id: j.employee_id,
          employee_name: 'Me',
          status: j.status,
          started_date: j.started_at ?? j.created_at,
          expected_completion: j.created_at,
          days_active: Math.ceil((Date.now() - new Date(j.started_at ?? j.created_at).getTime()) / 86400000),
          total_steps: totalSteps,
          completed_steps: completedSteps,
          total_fee: Number(j.total_fee) || 0,
          work_fee: Number(j.work_fee) || 0,
          ministry_fee: Number(j.ministry_fee) || 0,
          advance_paid: j.advance_paid ?? false,
          remaining_paid: j.remaining_paid ?? false,
          advance_due_amount: Number(j.advance_amount) || 0,
          remaining_due_amount: Number(j.remaining_amount) || 0,
        };
      });
    },
  });
};

// ─── Client: My Jobs ──────────────────────────────────────────────────────────
export const useClientJobs = (clientId: string) => {
  return useQuery({
    queryKey: ['client', 'jobs', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          employee:profiles!employee_id(full_name, avatar_url),
          service:services!service_id(name_en, category),
          job_steps(status, actual_gov_fee, workflow_step_id)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((j: any) => {
        const totalSteps = j.job_steps?.length || 0;
        const completedSteps = j.job_steps?.filter((s: any) => s.status === 'completed').length || 0;
        
        return {
          id: j.id,
          job_code: j.job_code,
          client_id: j.client_id,
          client_name: 'Me',
          service_name: j.service?.name_en ?? 'Unknown',
          service_category: j.service?.category ?? 'other',
          employee_id: j.employee_id,
          employee_name: j.employee?.full_name ?? 'Unassigned',
          status: j.status,
          started_date: j.started_at ?? j.created_at,
          expected_completion: j.created_at,
          days_active: Math.ceil((Date.now() - new Date(j.started_at ?? j.created_at).getTime()) / 86400000),
          total_steps: totalSteps,
          completed_steps: 0,
          total_fee: Number(j.total_fee) || 0,
          work_fee: Number(j.work_fee) || 0,
          ministry_fee: Number(j.ministry_fee) || 0,
          advance_paid: j.advance_paid ?? false,
          remaining_paid: j.remaining_paid ?? false,
          advance_due_amount: Number(j.advance_amount) || 0,
          remaining_due_amount: Number(j.remaining_amount) || 0,
        };
      });
    },
  });
};
export const useJobDetail = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          client:profiles!client_id(full_name, avatar_url),
          employee:profiles!employee_id(full_name, avatar_url),
          service:services!service_id(name_en, category)
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;
      const j = jobData as any;

      const { data: stepsData } = await supabase
        .from('job_steps')
        .select(`
          *,
          step_def:workflow_steps!workflow_step_id(
            name_en, 
            name_ar, 
            is_client_visible, 
            required_documents, 
            step_order, 
            estimated_hours,
            estimated_gov_fee
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      const { data: docsData } = await supabase
        .from('documents')
        .select('*, uploader:profiles!documents_uploaded_by_fkey(full_name)')
        .eq('job_id', jobId);

      const { data: msgData } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, role)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      const job: Job = {
        id: j.id,
        job_code: j.job_code,
        client_id: j.client_id,
        client_name: j.client?.full_name ?? 'Unknown',
        service_name: j.service?.name_en ?? 'Unknown',
        service_category: j.service?.category ?? 'other',
        employee_id: j.employee_id,
        employee_name: j.employee?.full_name ?? 'Unassigned',
        status: j.status,
        started_date: j.started_at ?? j.created_at,
        expected_completion: j.created_at,
        days_active: Math.ceil((Date.now() - new Date(j.started_at ?? j.created_at).getTime()) / 86400000),
        total_steps: stepsData?.length ?? 0,
        completed_steps: stepsData?.filter((s: any) => s.status === 'completed').length ?? 0,
        total_fee: Number(j.total_fee) || 0,
        work_fee: Number(j.work_fee) || 0,
        ministry_fee: Number(j.ministry_fee) || 0,
        advance_paid: j.advance_paid ?? false,
        remaining_paid: j.remaining_paid ?? false,
        advance_due_amount: Number(j.advance_amount) || 0,
        remaining_due_amount: Number(j.remaining_amount) || 0,
        documents: docsData || [],
      };

      const steps: JobStep[] = (stepsData || []).map((s: any) => ({
        id: s.id,
        job_id: jobId,
        step_definition_id: s.workflow_step_id,
        name_en: s.step_def?.name_en ?? 'Step',
        name_ar: s.step_def?.name_ar ?? '',
        order_index: s.step_def?.step_order ?? 0,
        status: s.status,
        is_client_visible: s.step_def?.is_client_visible ?? true,
        notes: s.notes,
        started_at: s.started_at,
        completed_at: s.completed_at,
        deadline: s.deadline,
        extension_reason: s.extension_reason,
        required_docs: s.step_def?.required_documents ?? [],
        estimated_hours: s.step_def?.estimated_hours ?? 0,
        estimated_gov_fee: Number(s.step_def?.estimated_gov_fee) || 0,
        actual_gov_fee: Number(s.actual_gov_fee) || 0,
      }));

      const documents: JobDocument[] = (docsData || []).map((d: any) => ({
        id: d.id,
        job_id: jobId,
        file_name: d.file_name,
        file_path: d.file_path,
        file_type: d.file_type || 'document',
        uploaded_by_name: d.uploader?.full_name ?? 'Unknown',
        uploaded_at: d.created_at,
        status: d.status,
      }));

      const messages: JobMessage[] = (msgData || []).map((m: any) => ({
        id: m.id,
        job_id: jobId,
        sender_id: m.sender_id,
        sender_type: m.sender?.role || 'client',
        sender_name: m.sender?.full_name ?? 'Unknown',
        content: m.content,
        is_read: m.is_read ?? true,
        created_at: m.created_at,
      }));

      return { job, steps, documents, messages, payments: [], logs: [] };
    },
  });
};

// ─── Create Job ───────────────────────────────────────────────────────────────
const _createInternalJob = async (supabase: any, jobData: any, isAdmin: boolean, profileId?: string) => {
  const jobCode = `JOB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
  const wFee = Number(jobData.work_fee) || 30;
  const mFee = Number(jobData.ministry_fee) || 20;
  const totalFee = wFee + mFee;
  const advanceAmount = (totalFee * 50) / 100;
  const remainingAmount = totalFee - advanceAmount;

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      job_code: jobCode,
      client_id: jobData.client_id,
      employee_id: jobData.employee_id,
      service_id: jobData.service_id,
      total_fee: totalFee,
      work_fee: wFee,
      ministry_fee: mFee,
      advance_amount: advanceAmount,
      remaining_amount: remainingAmount,
      status: 'active',
      advance_paid: false,
      remaining_paid: false,
      notes: jobData.notes,
    } as any)
    .select()
    .single();

  if (error) throw error;
  const job = data as any;

  const { data: blueprint } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('service_id', jobData.service_id)
    .order('step_order', { ascending: true });

  if (blueprint && blueprint.length > 0) {
    const stepsToInsert = blueprint.map((step: any) => {
      const isAutoFill = step.required_documents?.some((docType: string) => 
        jobData.auto_complete_docs?.includes(docType)
      );

      let deadline = null;
      if (step.estimated_hours) {
        const date = new Date();
        date.setHours(date.getHours() + step.estimated_hours);
        deadline = date.toISOString();
      }

      return {
        job_id: job.id,
        workflow_step_id: step.id,
        status: isAutoFill ? 'completed' : 'pending',
        started_at: isAutoFill ? new Date().toISOString() : null,
        completed_at: isAutoFill ? new Date().toISOString() : null,
        is_client_visible: step.is_client_visible ?? true,
        deadline: deadline,
        notes: isAutoFill ? 'Auto-completed via Digital Vault' : null
      };
    });

    const { error: stepsError } = await supabase.from('job_steps').insert(stepsToInsert as any);
    if (stepsError) throw new Error(`Roadmap Initialization Failed: ${stepsError.message}`);
  }

  await supabase.from('notifications').insert({
    recipient_id: jobData.employee_id,
    sender_id: isAdmin ? profileId : null,
    job_id: job.id,
    type: 'assignment',
    title_en: 'New Project Assigned',
    title_ar: 'تم تكليفك بمشروع جديد',
    body_en: `You have been assigned to job ${jobCode}.`,
    body_ar: `تم تعيينك للعمل على الطلب رقم ${jobCode}.`,
  } as any);

  return job;
};

export const useCreateJob = () => {
  const qc = useQueryClient();
  const { profile, role } = useAuth();
  const isAdmin = role === 'admin';

  return useMutation({
    mutationFn: (jobData: any) => _createInternalJob(supabase, jobData, isAdmin, profile?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useCreatePackageJobs = () => {
  const qc = useQueryClient();
  const { profile, role } = useAuth();
  const isAdmin = role === 'admin';

  return useMutation({
    mutationFn: async (data: {
      client_id: string;
      employee_id: string;
      package_id: string;
      services: any[];
      discount_percentage: number;
      notes?: string;
      auto_complete_docs?: string[];
      custom_work_fee?: number;
      custom_ministry_fee?: number;
    }) => {
      const discountFactor = 1 - (data.discount_percentage / 100);
      
      let totalWorkFee = 0;
      let totalMinistryFee = 0;
      
      data.services.forEach(s => {
        totalWorkFee += (Number(s.work_fee) || 30);
        totalMinistryFee += (Number(s.ministry_fee) || 20);
      });

      const discountedWorkFee = data.custom_work_fee !== undefined 
        ? data.custom_work_fee 
        : Math.round(totalWorkFee * discountFactor);
      
      const finalMinistryFee = data.custom_ministry_fee !== undefined
        ? data.custom_ministry_fee
        : totalMinistryFee;
      
      const jobCode = `PKG-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
      const totalFee = discountedWorkFee + finalMinistryFee;
      const advanceAmount = (totalFee * 50) / 100;
      const remainingAmount = totalFee - advanceAmount;

      // 1. Create the Master Job
      const { data: jobRes, error: jobError } = await (supabase as any)
        .from('jobs')
        .insert({
          job_code: jobCode,
          client_id: data.client_id,
          employee_id: data.employee_id,
          service_id: data.services[0]?.id,
          total_fee: totalFee,
          work_fee: discountedWorkFee,
          ministry_fee: totalMinistryFee,
          advance_amount: advanceAmount,
          remaining_amount: remainingAmount,
          status: 'active',
          advance_paid: false,
          remaining_paid: false,
          notes: `${data.notes || ''} (Bundle: ${data.package_id})`.trim(),
        })
        .select()
        .single();

      if (jobError) throw jobError;
      const job = jobRes;

      // 2. Build the Multi-Service Roadmap
      const serviceIds = data.services.map(s => s.id).filter(Boolean);
      const { data: blueprints } = await supabase
        .from('workflow_steps')
        .select('*')
        .in('service_id', serviceIds)
        .order('service_id', { ascending: true })
        .order('step_order', { ascending: true });

      if (blueprints && blueprints.length > 0) {
        const stepsToInsert = blueprints.map((step: any) => {
          const isAutoFill = step.required_documents?.some((docType: string) => 
            data.auto_complete_docs?.includes(docType)
          );

          let deadline = null;
          if (step.estimated_hours) {
            const date = new Date();
            date.setHours(date.getHours() + step.estimated_hours);
            deadline = date.toISOString();
          }

          return {
            job_id: job.id,
            workflow_step_id: step.id,
            status: isAutoFill ? 'completed' : 'pending',
            started_at: isAutoFill ? new Date().toISOString() : null,
            completed_at: isAutoFill ? new Date().toISOString() : null,
            is_client_visible: step.is_client_visible ?? true,
            deadline: deadline,
            notes: isAutoFill ? 'Auto-completed via Vault' : null
          };
        });

        const { data: insertedSteps, error: stepsError } = await (supabase as any)
          .from('job_steps')
          .insert(stepsToInsert)
          .select();

        if (stepsError) throw stepsError;

        // 3. Pointer Sync: Point the job to the first active step
        const firstActive = insertedSteps.find((s: any) => s.status === 'pending');
        if (firstActive) {
          await supabase
            .from('jobs')
            .update({ current_step_id: firstActive.id } as any)
            .eq('id', job.id);
        }
      }

      return job;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['job', data.id] });
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ─── Last Assigned Employee ───────────────────────────────────────────────────
export const useLastAssignedEmployee = (clientId?: string) => {
  return useQuery({
    queryKey: ['client', 'last-employee', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          employee_id,
          employee:profiles!employee_id(id, full_name, avatar_url, phone)
        `)
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as any)?.employee || null;
    },
  });
};

export const useUpdateJobStepStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ stepId, status, notes, actualGovFee }: { stepId: string; status: string; notes?: string; actualGovFee?: number }) => {
      // Perform the entire transition in ONE atomic database transaction
      const { error } = await supabase.rpc('finalize_job_step', {
        p_step_id: stepId,
        p_status: status,
        p_notes: notes || null,
        p_actual_gov_fee: actualGovFee || 0
      });
      
      if (error) throw error;
      return { stepId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
    },
  });
};

// ─── Request Deadline Extension ─────────────────────────────────────────────
export const useRequestExtension = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ jobId, stepId, newDeadline, reason }: { 
      jobId: string; 
      stepId: string; 
      newDeadline: string; 
      reason: string 
    }) => {
      // 1. Create the request with metadata
      const { data, error } = await supabase
        .from('employee_requests')
        .insert({
          employee_id: profile?.id,
          job_id: jobId,
          type: 'deadline_extension',
          description: `EXTEND_STEP::${reason}`,
          status: 'pending',
          metadata: {
            proposed_deadline: newDeadline,
            step_id: stepId,
            reason: reason
          }
        } as any)
        .select()
        .single();

      if (error) throw error;

      // 2. Track the pending reason on the step itself for UI visibility
      await supabase
        .from('job_steps')
        .update({ extension_reason: reason } as any)
        .eq('id', stepId);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
      qc.invalidateQueries({ queryKey: ['employee', 'requests'] });
    },
  });
};

export const useUpdateJobPayment = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      jobId, 
      type, 
      paid, 
      amount,
      receiptUrl 
    }: { 
      jobId: string; 
      type: 'advance' | 'remaining'; 
      paid: boolean;
      amount?: number;
      receiptUrl?: string;
    }) => {
      const now = new Date().toISOString();
      const updates: any = {};
      
      // Fetch current job fees to perform smart re-balancing
      const { data: jobInfo, error: fetchError } = await supabase
        .from('jobs')
        .select('total_fee, advance_amount, remaining_amount')
        .eq('id', jobId)
        .single();
      
      if (fetchError) throw fetchError;
      const totalFee = Number(jobInfo.total_fee) || 0;

      if (type === 'advance') {
        updates.advance_paid = paid;
        updates.advance_paid_at = paid ? now : null;
        if (amount !== undefined) {
          updates.advance_amount = amount;
          // Invariant: Total Fee = Advance + Remaining
          updates.remaining_amount = Math.max(0, totalFee - amount);
        }
        if (receiptUrl) updates.advance_receipt_url = receiptUrl;
      } else {
        updates.remaining_paid = paid;
        updates.remaining_paid_at = paid ? now : null;
        if (amount !== undefined) {
          updates.remaining_amount = amount;
          // If they update the remaining amount directly, we must ensure the sum still matches.
          // Usually, the Remaining is the 'slack' variable, but if they forced it, we adjust advance.
          updates.advance_amount = Math.max(0, totalFee - amount);
        }
        if (receiptUrl) updates.remaining_receipt_url = receiptUrl;
      }

        // 1. Perform primary job financial update
        const { data: updatedJob, error: updateError } = await supabase
          .from('jobs')
          .update(updates)
          .eq('id', jobId)
          .select()
          .single();

        if (updateError) throw updateError;

        // 2. If Advance Payment confirmed, start the first step automatically
        if (type === 'advance' && paid) {
           // Find first pending step
           const { data: firstStep, error: fetchError } = await supabase
             .from('job_steps')
             .select('id, step_def:workflow_steps(estimated_hours, step_order)')
             .eq('job_id', jobId)
             .eq('status', 'pending')
             .order('step_order', { foreignTable: 'workflow_steps', ascending: true })
             .limit(1)
             .maybeSingle();

           if (fetchError) throw fetchError;

           if (firstStep) {
             let deadline = null;
             const estHours = (firstStep as any).step_def?.estimated_hours;
             if (estHours) {
               const date = new Date();
               date.setHours(date.getHours() + estHours);
               deadline = date.toISOString();
             }

             // Update step status and job's current step pointer sequentially to avoid 409
             const { error: sError } = await supabase
               .from('job_steps')
               .update({ 
                 status: 'in_progress', 
                 started_at: now,
                 deadline: deadline 
               } as any)
               .eq('id', firstStep.id);
             
             if (sError) throw sError;

             const { error: jError } = await supabase
               .from('jobs')
               .update({ current_step_id: firstStep.id } as any)
               .eq('id', jobId);
             
             if (jError) throw jError;
           }
        }

      return null;
    },
    onSuccess: (_data, variables) => {
      const typeLabel = variables.type === 'advance' ? 'Advance' : 'Final';
      toast.success(`${typeLabel} payment verified successfully`);
      qc.invalidateQueries({ queryKey: ['job'] });
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ─── Operational Requests (Admin) ─────────────────────────────────────────
export const useOperationalRequests = () => {
  return useQuery({
    queryKey: ['admin', 'operational-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_requests')
        .select(`
          id,
          job_id,
          employee_id,
          type,
          description,
          status,
          created_at,
          metadata,
          employee:profiles!employee_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });
};

export const useResolveOperationalRequest = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, action, type, jobId, metadata }: {
      requestId: string;
      action: 'approved' | 'rejected';
      type: string;
      jobId?: string;
      metadata?: any;
    }) => {
      // 1. Resolve the request record
      const { error: reqError } = await supabase
        .from('employee_requests')
        .update({
          status: action,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (reqError) throw reqError;

      // 2. Perform side effects if approved
      if (action === 'approved') {
        if (type === 'deadline_extension' && metadata?.newDeadline && metadata?.step_id) {
           await supabase
            .from('job_steps')
            .update({ deadline: metadata.newDeadline, extension_reason: null } as any)
            .eq('id', metadata.step_id);
        } else if (type === 'job_deletion' && jobId) {
           // DEEP CLEAN: Purge all dependencies before deleting the job
           // IMPORTANT: We do this in a specific order to avoid FK issues
           
           // 1. Delete associated steps
           const { error: stepsError } = await supabase.from('job_steps').delete().eq('job_id', jobId);
           if (stepsError) throw stepsError;

           // 2. Delete associated documents
           const { error: docsError } = await supabase.from('documents').delete().eq('job_id', jobId);
           if (docsError) throw docsError;

           // 3. Delete associated messages
           const { error: msgError } = await supabase.from('messages').delete().eq('job_id', jobId);
           if (msgError) throw msgError;

           // 4. Delete other requests for this job
           const { error: otherReqsError } = await supabase.from('employee_requests').delete().eq('job_id', jobId);
           if (otherReqsError) throw otherReqsError;

           // 5. UNLINK & PURGE Notifications
           // We first try to unlink notifications to satisfy FK even if RLS blocks deletion of others' notifs
           await supabase.from('notifications').update({ job_id: null } as any).eq('job_id', jobId);
           
           // Then we try to delete notifications we have access to
           const { error: notifError } = await supabase.from('notifications').delete().eq('job_id', jobId);
           // We don't THROW here because unlinking already satisfied the FK constraint, 
           // and RLS might block deletion of employee notifications which is okay as long as they are unlinked.

           // 6. Finally delete the job itself
           const { error: jobError } = await supabase.from('jobs').delete().eq('id', jobId);
           if (jobError) throw jobError;
        }
      }

      return action;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
      qc.invalidateQueries({ queryKey: ['admin', 'operational-requests'] });
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'requests'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ─── Upload Job Document ─────────────────────────────────────────────────────
export const useUploadJobDocument = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ jobId, stepId, fileName, fileUrl, file, docType }: { 
      jobId: string; 
      stepId?: string; 
      fileName: string; 
      fileUrl?: string; 
      file?: File;
      docType: string 
    }) => {
      let finalUrl = fileUrl;

      // 1. If a physical file is provided, upload to Supabase Storage
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${jobId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('job-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('job-documents')
          .getPublicUrl(filePath);
        
        finalUrl = publicUrl;
      }

      if (!finalUrl) throw new Error('File URL or Physical File is required');

      // 2. Save metadata to database
      const { error } = await supabase
        .from('documents')
        .insert({
          job_id: jobId,
          job_step_id: stepId || null,
          uploaded_by: profile?.id,
          file_name: fileName,
          file_path: finalUrl,
          document_type: docType,
          status: 'pending'
        } as any);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
    },
  });
};

export const useUpdateDocumentStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, status, rejectionReason }: { docId: string; status: 'approved' | 'rejected' | 'pending'; rejectionReason?: string }) => {
      const { error } = await supabase
        .from('documents')
        .update({ 
          status, 
          rejection_reason: rejectionReason || null,
          is_client_visible: status === 'approved' // Auto-reveal on approval
        } as any)
        .eq('id', docId);
      
      if (error) throw error;
      return docId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
    },
  });
};

export const useDeleteDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await (supabase.from('documents') as any).delete().eq('id', docId);
      if (error) throw error;
      return docId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job'] });
    },
  });
};

// ─── Admin: Delete Job ────────────────────────────────────────────────────────
export const useAdminDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      // DEEP CLEAN: Purge all dependencies before deleting the job
      const { error: sE } = await supabase.from('job_steps').delete().eq('job_id', jobId);
      if (sE) throw sE;
      
      const { error: dE } = await supabase.from('documents').delete().eq('job_id', jobId);
      if (dE) throw dE;

      const { error: mE } = await supabase.from('messages').delete().eq('job_id', jobId);
      if (mE) throw mE;

      const { error: rE } = await supabase.from('employee_requests').delete().eq('job_id', jobId);
      if (rE) throw rE;

      // UNLINK & PURGE Notifications (Defensive against RLS)
      await supabase.from('notifications').update({ job_id: null } as any).eq('job_id', jobId);
      await supabase.from('notifications').delete().eq('job_id', jobId);
      
      const { error: jobError } = await supabase.from('jobs').delete().eq('id', jobId);
      if (jobError) throw jobError;
      return jobId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['employee', 'jobs'] });
    },
  });
};

// ─── Employee: Request Deletion ──────────────────────────────────────────────
export const useRequestJobDeletion = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('employee_requests')
        .insert({
          employee_id: profile?.id,
          job_id: jobId,
          type: 'job_deletion', // Mapping to the new type
          description: reason,
          status: 'pending'
        } as any)
        .select()
        .single();

      if (error) throw error;

      // 2. Insert Notification for Admin
      // Fetch Master Admin ID (or just use a known role-based targeting if we had it)
      // For now, we'll fetch the first admin profile
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (adminProfiles && adminProfiles.length > 0) {
        const adminId = adminProfiles[0].id;
        await supabase.from('notifications').insert({
          recipient_id: adminId,
          sender_id: profile?.id,
          job_id: jobId,
          type: 'action_required',
          title_en: 'Job Deletion Request',
          title_ar: 'طلب حذف عمل',
          body_en: `Staff requested deletion of job ${data.id}. Reason: ${reason}`,
          body_ar: `طلب الموظف حذف العمل ${data.id}. السبب: ${reason}`,
          action_required: true,
          action_url: `job_request://${data.id}|${jobId}|job_deletion`
        } as any);
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'requests'] });
      qc.invalidateQueries({ queryKey: ['admin', 'operational-requests'] });
    },
  });
};

// ─── Messaging ─────────────────────────────────────────────────────────────
export const useSendMessage = () => {
  const qc = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ jobId, content }: { jobId: string; content: string }) => {
      if (!profile) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          job_id: jobId,
          sender_id: profile.id,
          content: content,
          is_read: false
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Optmistically invalidate the job detail to show the new message
      qc.invalidateQueries({ queryKey: ['job', data.job_id] });
    },
  });
};

// ─── Unread Message Count (Client) ───────────────────────────────────────────────────
export const useUnreadMessageCount = (clientId?: string) => {
  return useQuery({
    queryKey: ['client', 'unread-messages', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      // 1. Get all job IDs for this client
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id')
        .eq('client_id', clientId!);

      if (jobsError) throw jobsError;
      if (!jobs || jobs.length === 0) return 0;

      const jobIds = jobs.map(j => j.id);

      // 2. Count messages in those jobs that are not from this client and are unread
      // Note: We use head: true to only get count, not data.
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds)
        .eq('is_read', false)
        .neq('sender_id', clientId!);

      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30s for the badge
  });
};
