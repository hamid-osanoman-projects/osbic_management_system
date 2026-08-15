import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, ChevronRight, ChevronLeft, Menu, MapPin, Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import LanguageToggle from '../shared/LanguageToggle';
import ThemeToggle from '../ThemeToggle';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TopBarNotifications } from '../employee/TopBarNotifications';
import { useBranch } from '../../contexts/BranchContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminTopBarProps {
  setMobileMenuOpen: (open: boolean) => void;
}

const AdminTopBar = ({ setMobileMenuOpen }: AdminTopBarProps) => {
  const location = useLocation();
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { branches, selectedBranchId, setSelectedBranchId, selectedBranch } = useBranch();
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  const pathnames = location.pathname.split('/').filter(Boolean);



  return (
    <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-background/50 backdrop-blur-xl border-b border-border z-40 sticky top-0">
      {/* Left: Breadcrumbs & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center bg-muted/50 border border-border rounded-xl text-foreground hover:bg-muted transition-colors"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex flex-col justify-center hidden sm:flex">
          <h2 className="text-xl font-syne font-bold text-foreground capitalize leading-none mb-0.5">
            {(() => {
              const lastPath = pathnames[pathnames.length - 1];
              if (!lastPath) return 'Dashboard';
              const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
              if (uuidRegex.test(lastPath)) {
                const parentPath = pathnames[pathnames.length - 2];
                if (parentPath === 'employees') return 'Employee Details';
                if (parentPath === 'clients') return 'Client Details';
                if (parentPath === 'jobs') return 'Job Details';
                if (parentPath === 'leads') return 'Lead Details';
                return 'Details';
              }
              return lastPath.replace(/-/g, ' ');
            })()}
          </h2>
        <nav className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
          {pathnames.slice(1).map((name, index) => {
            const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
            const isLast = index === pathnames.slice(1).length - 1;
            const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
            const label = uuidRegex.test(name) ? 'Details' : name.replace(/-/g, ' ');
            return (
              <span key={name} className="flex items-center gap-1.5">
                {isRtl ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
                {isLast ? (
                  <span className="text-primary capitalize">{label}</span>
                ) : (
                  <Link to={routeTo} className="hover:text-primary transition-colors capitalize">
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search trigger */}
        <button
          className="hidden md:flex items-center gap-3 px-4 py-2 bg-muted/50 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-all group w-60"
          aria-label="Open command palette"
        >
          <Search size={15} className="group-hover:text-primary transition-colors" />
          <span className="text-sm flex-1 text-left">Quick search…</span>
          <kbd className="text-[10px] bg-muted/50 px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
        </button>

        <ThemeToggle />
        <LanguageToggle variant="minimal" />

        {/* Branch Switcher (Admin) */}
        <div className="relative">
          <button
            onClick={() => setBranchDropdownOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              selectedBranchId
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin size={12} />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {selectedBranch ? selectedBranch.name : 'All Branches'}
            </span>
            <ChevronDown size={12} className={`transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {branchDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-1">
                    <button
                      onClick={() => { setSelectedBranchId(null); setBranchDropdownOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        !selectedBranchId ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Globe size={13} /> All Branches
                      {!selectedBranchId && <span className="ml-auto text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                    </button>
                    {branches.filter(b => b.is_active).map(b => (
                      <button
                        key={b.id}
                        onClick={() => { setSelectedBranchId(b.id); setBranchDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          selectedBranchId === b.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary font-mono">{b.code.slice(0,2)}</span>
                        <span className="truncate">{b.name}</span>
                        {selectedBranchId === b.id && <span className="ml-auto text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">ACTIVE</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Notification bell */}
        <TopBarNotifications />

        {/* Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-border">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-bold text-foreground leading-tight">{profile?.full_name}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">{profile?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 overflow-hidden flex items-center justify-center">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name || 'Admin'} />
              : <span className="text-primary font-bold">{profile?.full_name?.[0]?.toUpperCase()}</span>}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
