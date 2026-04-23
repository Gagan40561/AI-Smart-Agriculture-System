import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <motion.div 
      whileHover={{ scale: 1.1, rotate: 5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full"
      >
        {/* Leaf Shape */}
        <path 
          d="M12 2C12 2 4 6 4 14C4 18.4183 7.58172 22 12 22C16.4183 22 20 18.4183 20 14C20 6 12 2 12 2Z" 
          fill="url(#leafGradient)"
        />
        
        {/* Circuit Lines */}
        <path 
          d="M12 22V12M12 12L17 7M12 12L7 7M12 17L15 14M12 17L9 14" 
          stroke="white" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="opacity-90"
        />
        
        {/* Circuit Nodes */}
        <circle cx="17" cy="7" r="1" fill="white" />
        <circle cx="7" cy="7" r="1" fill="white" />
        <circle cx="15" cy="14" r="0.8" fill="white" />
        <circle cx="9" cy="14" r="0.8" fill="white" />
        <circle cx="12" cy="12" r="1.2" fill="white" />

        <defs>
          <linearGradient id="leafGradient" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22c55e" />
            <stop offset="1" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};
