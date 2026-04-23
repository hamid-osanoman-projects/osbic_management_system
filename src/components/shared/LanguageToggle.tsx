import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LanguageToggle: React.FC<{ variant?: 'minimal' | 'full' }> = ({ variant = 'full' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = i18n.language;
  const isRtl = i18n.dir() === 'rtl';

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ar', label: 'العربية', flag: '🇴🇲' }
  ];

  const toggleLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center transition-all duration-200 outline-none",
          variant === 'full' 
            ? "bg-muted/50 border border-border px-3 py-2 rounded-xl gap-2 hover:bg-muted"
            : "w-10 h-10 rounded-xl hover:bg-muted/50"
        )}
      >
        <Globe size={18} className="text-muted-foreground" />
        {variant === 'full' && (
          <>
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              {currentLang}
            </span>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={cn(
                "absolute top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-2xl z-50 p-2 overflow-hidden",
                isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
              )}
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group",
                    currentLang === lang.code 
                      ? "bg-primary/10 text-primary font-bold" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg grayscale group-hover:grayscale-0 transition-all">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                  {currentLang === lang.code && <Check size={14} className="text-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageToggle;
