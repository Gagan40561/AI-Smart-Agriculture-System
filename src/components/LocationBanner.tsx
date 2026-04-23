import React from 'react';
import { MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocationBannerProps {
  show: boolean;
  onClose: () => void;
  error?: string | null;
  denied?: boolean;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({ show, onClose, error, denied }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500/10 border-b border-amber-500/20 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <MapPin size={16} className="text-amber-500" />
              </div>
              <p className="text-sm text-amber-200/80">
                <span className="font-bold text-amber-500">
                  {denied ? "Location access denied." : "Location error."}
                </span> {error || "Showing default location weather as fallback."}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors text-stone-500 hover:text-stone-300"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
