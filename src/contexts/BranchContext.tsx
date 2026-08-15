import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface BranchContextType {
  branches: Branch[];
  loadingBranches: boolean;
  selectedBranchId: string | null;     // null = "All Branches"
  setSelectedBranchId: (id: string | null) => void;
  selectedBranch: Branch | null;        // full object for the selected branch
  createBranch: (data: Omit<Branch, 'id' | 'created_at'>) => Promise<void>;
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const STORAGE_KEY = 'osbic_selected_branch_id';

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Restore from localStorage on load
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });

  // Persist selection to localStorage whenever it changes
  const setSelectedBranchId = (id: string | null) => {
    setSelectedBranchIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Invalidate all branch-filtered queries so pages refresh automatically
    queryClient.invalidateQueries({ queryKey: ['admin'] });
    queryClient.invalidateQueries({ queryKey: ['employee'] });
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
    queryClient.invalidateQueries({ queryKey: ['accounts_overview'] });
  };

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) {
          console.warn('Branches query returned error (table might not exist yet):', error);
          return [];
        }
        return (data || []) as Branch[];
      } catch (err) {
        console.error('Error fetching branches:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });

  // Validate that the stored branch still exists (handles deactivated branches)
  useEffect(() => {
    if (!loadingBranches && branches.length > 0 && selectedBranchId) {
      const stillExists = branches.some(b => b.id === selectedBranchId && b.is_active);
      if (!stillExists) {
        setSelectedBranchId(null);
      }
    }
  }, [branches, loadingBranches]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  // Create branch
  const createBranch = async (data: Omit<Branch, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('branches').insert(data);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  };

  // Update branch
  const updateBranch = async (id: string, data: Partial<Branch>) => {
    const { error } = await supabase.from('branches').update(data).eq('id', id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  };

  return (
    <BranchContext.Provider value={{
      branches,
      loadingBranches,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch,
      createBranch,
      updateBranch,
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch must be used within a BranchProvider');
  return context;
};
