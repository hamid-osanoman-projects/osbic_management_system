import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, Briefcase, ChevronRight, Check, Search, Inbox, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Skeleton from '../../components/ui/Skeleton';
import toast from 'react-hot-toast';

const EmployeeNotifications = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'assignments' | 'system'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['employee', 'notifications', profile?.id],
    enabled: !!profile?.id,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee', 'notifications'] });
    }
  });

  const handleAction = async (notif: any) => {
    if (!notif.is_read) {
      await markReadMutation.mutateAsync(notif.id);
    }
    
    if (notif.action_url) {
       let url = notif.action_url;
       if (url.startsWith('/employee/my-jobs/')) {
          url = `/employee/tasks?jobId=${url.split('/').pop()}`;
       }
       navigate(url);
    } else if (notif.job_id) {
       navigate(`/employee/tasks?jobId=${notif.job_id}`);
    }
  };

  const markAllRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', profile?.id)
      .eq('is_read', false);
    
    if (error) {
      toast.error('Failed to mark all as read');
    } else {
      qc.invalidateQueries({ queryKey: ['employee', 'notifications'] });
      toast.success('All notifications marked as read');
    }
  };

  const filteredNotifications = notifications?.filter(n => {
    // Tab filtering
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'assignments' && n.type !== 'assignment') return false;
    if (activeTab === 'system' && n.type === 'assignment') return false;

    // Search filtering
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title_en?.toLowerCase().includes(q);
      const matchBody = n.body_en?.toLowerCase().includes(q);
      if (!matchTitle && !matchBody) return false;
    }
    
    return true;
  });

  const tabs = [
    { id: 'all', label: 'All Alerts' },
    { id: 'unread', label: 'Unread' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'system', label: 'System' }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Notification Center</p>
          <h1 className="text-3xl font-syne font-bold text-foreground tracking-tight">Internal Communications</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground outline-none focus:border-primary/50 transition-all w-full md:w-64 placeholder:text-muted-foreground/50"
            />
          </div>
          <button 
            onClick={markAllRead}
            className="px-4 py-2.5 rounded-xl bg-transparent border border-border text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"
          >
            <Check size={14} /> Mark all read
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-border/30 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="notifTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <Skeleton height={80} rounded="xl" />
          <Skeleton height={80} rounded="xl" />
          <Skeleton height={80} rounded="xl" />
        </div>
      ) : (
        <div className="space-y-1 pt-2">
          <AnimatePresence mode="popLayout">
            {filteredNotifications?.map((notif, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={notif.id}
                onClick={() => handleAction(notif)}
                className={`group flex items-start gap-4 p-4 cursor-pointer transition-colors rounded-xl hover:bg-muted/10 ${index !== 0 ? 'border-t border-border/30' : ''} ${!notif.is_read ? 'bg-primary/[0.02]' : ''}`}
              >
                {/* Status Indicator */}
                <div className="pt-2">
                   <div className={`w-2 h-2 rounded-full ${!notif.is_read ? 'bg-primary ring-4 ring-primary/10 animate-pulse' : 'bg-muted-foreground/30'}`} />
                </div>
                
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  notif.type === 'assignment' 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {notif.type === 'assignment' ? <Briefcase size={16} /> : <AlertCircle size={16} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium truncate ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notif.title_en}
                    </h4>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest whitespace-nowrap ml-4">
                      {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
                    {notif.body_en}
                  </p>
                </div>

                {/* Quick Action Hover */}
                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredNotifications?.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center border border-dashed border-border/50 rounded-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                 <Inbox size={20} />
              </div>
              <h3 className="text-sm font-bold text-foreground mb-1">Inbox Zero</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">No alerts found in this view.</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeNotifications;
