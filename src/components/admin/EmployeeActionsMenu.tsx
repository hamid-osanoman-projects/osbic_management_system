import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreVertical, 
  Edit, 
  Key, 
  UserX, 
  UserCheck,
  Trash2 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface EmployeeActionsMenuProps {
  employee: any;
  onEdit: (employee: any) => void;
  onResetPassword: (employee: any) => void;
  onToggleStatus: (employee: any) => void;
  onDelete: (employee: any) => void;
}

const EmployeeActionsMenu: React.FC<EmployeeActionsMenuProps> = ({ 
  employee, 
  onEdit, 
  onResetPassword, 
  onToggleStatus,
  onDelete 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actions = [
    { 
      id: 'edit', 
      label: 'Edit Profile', 
      icon: Edit, 
      onClick: () => { onEdit(employee); setIsOpen(false); },
      className: 'text-white hover:bg-white/5'
    },
    { 
      id: 'reset', 
      label: 'Reset Password', 
      icon: Key, 
      onClick: () => { onResetPassword(employee); setIsOpen(false); },
      className: 'text-white hover:bg-white/5'
    },
    { 
      id: 'status', 
      label: employee.is_active ? 'Deactivate' : 'Activate', 
      icon: employee.is_active ? UserX : UserCheck, 
      onClick: () => { onToggleStatus(employee); setIsOpen(false); },
      className: employee.is_active ? 'text-red-400 hover:bg-red-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'
    },
    { 
      id: 'delete', 
      label: 'Delete Employee', 
      icon: Trash2, 
      onClick: () => { onDelete(employee); setIsOpen(false); },
      className: 'text-red-500 hover:bg-red-500/10'
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-[#475569] hover:text-white hover:bg-white/5 transition-all"
      >
        <MoreVertical size={18} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-48 bg-[#161B2E] border border-white/10 rounded-xl shadow-2xl z-[60] py-1.5 overflow-hidden"
          >
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors",
                  action.className
                )}
              >
                <action.icon size={16} />
                <span>{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeeActionsMenu;
