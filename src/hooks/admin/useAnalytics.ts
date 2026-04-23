import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface BottleneckMetric {
  step: string;
  service: string;
  expectedHrs: number;
  actualHrs: number;
  count: number;
  oldestDays: number;
}

export const useBottleneckMetrics = () => {
  return useQuery({
    queryKey: ['admin', 'bottlenecks'],
    queryFn: async (): Promise<BottleneckMetric[]> => {
      // Fetch all completed job steps to calculate averages
      const { data: steps, error } = await supabase
        .from('job_steps')
        .select(`
          started_at,
          completed_at,
          status,
          created_at,
          step_def:workflow_steps(
            name_en,
            estimated_hours,
            service:services(name_en)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const agg: Record<string, { totalHrs: number; count: number; expected: number; service: string; oldestCreated: string }> = {};

      (steps || []).forEach((step: any) => {
        const stepName = step.step_def?.name_en || 'Unknown Step';
        if (!agg[stepName]) {
          agg[stepName] = { 
            totalHrs: 0, 
            count: 0, 
            expected: step.step_def?.estimated_hours || 24,
            service: step.step_def?.service?.name_en || 'General',
            oldestCreated: step.created_at
          };
        }

        if (step.status === 'completed' && step.started_at && step.completed_at) {
          const duration = (new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / (1000 * 60 * 60);
          agg[stepName].totalHrs += duration;
          agg[stepName].count += 1;
        }

        if (step.status !== 'completed' && new Date(step.created_at) < new Date(agg[stepName].oldestCreated)) {
          agg[stepName].oldestCreated = step.created_at;
        }
      });

      return Object.entries(agg).map(([name, data]) => {
        const avgHrs = data.count > 0 ? Math.round(data.totalHrs / data.count) : data.expected;
        const oldestDays = Math.ceil((Date.now() - new Date(data.oldestCreated).getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          step: name,
          service: data.service,
          expectedHrs: data.expected,
          actualHrs: avgHrs,
          count: data.count,
          oldestDays: oldestDays
        };
      }).sort((a, b) => (b.actualHrs / b.expectedHrs) - (a.actualHrs / a.expectedHrs));
    },
  });
};
