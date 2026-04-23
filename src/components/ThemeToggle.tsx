import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-all active:scale-90"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -20, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 20, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-primary">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </div>
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggle;
