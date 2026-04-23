import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' }
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language.split('-')[0]) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 text-stone-400 hover:text-white transition-colors rounded-xl hover:bg-white/5"
        aria-label="Select Language"
      >
        <Languages size={20} />
        <span className="text-xs font-bold uppercase hidden sm:inline-block">{currentLanguage.code}</span>
        <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                    i18n.language.split('-')[0] === lang.code
                      ? "bg-emerald-500/10 text-emerald-500 font-bold"
                      : "text-stone-400 hover:bg-white/5 hover:text-stone-200"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs font-bold">{lang.name}</span>
                    <span className="text-[10px] opacity-60">{lang.nativeName}</span>
                  </div>
                  {i18n.language.split('-')[0] === lang.code && (
                    <Check size={16} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
