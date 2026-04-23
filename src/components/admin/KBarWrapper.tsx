import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarSearch,
  KBarResults,
  useMatches,
} from 'kbar';
import type { Action } from 'kbar';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  ClipboardList,
  Wallet,
  PlusCircle,
  AlertCircle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RenderResults = () => {
  const { results } = useMatches();

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#475569] bg-white/5">
            {item}
          </div>
        ) : (
          <div
            className={cn(
              'px-4 py-3 flex items-center justify-between cursor-pointer transition-all border-l-2',
              active
                ? 'bg-gold/10 text-gold border-gold'
                : 'text-[#94A3B8] border-transparent hover:bg-white/5'
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon as React.ReactNode}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{item.name}</span>
                {item.subtitle && (
                  <span className="text-xs text-[#475569]">{item.subtitle}</span>
                )}
              </div>
            </div>
            {(item.shortcut?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1">
                {item.shortcut!.map((sc: string) => (
                  <kbd
                    key={sc}
                    className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-[#475569]"
                  >
                    {sc.toUpperCase()}
                  </kbd>
                ))}
              </div>
            )}
          </div>
        )
      }
    />
  );
};

const KBarWrapper = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();

  const actions: Action[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      shortcut: ['g', 'd'],
      keywords: 'home stats',
      perform: () => navigate('/admin/dashboard'),
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'employees',
      name: 'Employees',
      shortcut: ['g', 'e'],
      keywords: 'staff workers',
      perform: () => navigate('/admin/employees'),
      icon: <Users size={18} />,
    },
    {
      id: 'clients',
      name: 'Clients',
      shortcut: ['g', 'c'],
      keywords: 'customers clients',
      perform: () => navigate('/admin/clients'),
      icon: <UserCheck size={18} />,
    },
    {
      id: 'services',
      name: 'Services',
      shortcut: ['g', 's'],
      keywords: 'catalogue services',
      perform: () => navigate('/admin/services'),
      icon: <Briefcase size={18} />,
    },
    {
      id: 'jobs',
      name: 'Jobs',
      shortcut: ['g', 'j'],
      keywords: 'pipeline projects',
      perform: () => navigate('/admin/jobs'),
      icon: <ClipboardList size={18} />,
    },
    {
      id: 'finance',
      name: 'Finance',
      shortcut: ['g', 'f'],
      keywords: 'money wallet revenue',
      perform: () => navigate('/admin/finance'),
      icon: <Wallet size={18} />,
    },
    {
      id: 'new-employee',
      name: 'Create Employee',
      keywords: 'add new staff',
      perform: () => navigate('/admin/employees/new'),
      icon: <PlusCircle size={18} />,
    },
    {
      id: 'pending',
      name: 'View Pending Requests',
      keywords: 'admin actions review',
      perform: () => navigate('/admin/requests'),
      icon: <AlertCircle size={18} />,
    },
  ];

  return (
    <KBarProvider actions={actions}>
      <KBarPortal>
        <KBarPositioner className="z-[100] bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[580px] bg-[#0F1629] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <KBarSearch
              defaultPlaceholder="Search pages, clients, jobs…"
              className="w-full bg-transparent border-none outline-none p-5 text-lg text-white font-medium placeholder:text-[#475569] border-b border-white/5"
            />
            <div className="pb-4 max-h-96 overflow-y-auto">
              <RenderResults />
            </div>
          </motion.div>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </KBarProvider>
  );
};

export default KBarWrapper;
