import React from 'react';
import { Home, Calendar, BarChart2, Menu as MenuIcon, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export type TabType = 'dashboard' | 'history' | 'progress' | 'menu';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
  onSnapClick: () => void;
}

export function BottomNav({ activeTab, onChange, onSnapClick }: BottomNavProps) {
  const leftTabs = [
    { id: 'dashboard', icon: Home, label: 'Today' },
    { id: 'history', icon: Calendar, label: 'History' },
  ] as const;

  const rightTabs = [
    { id: 'progress', icon: BarChart2, label: 'Progress' },
    { id: 'menu', icon: MenuIcon, label: 'Menu' },
  ] as const;

  const renderTab = (tab: any) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          "flex flex-col items-center justify-center w-16 h-full gap-1 transition-all duration-300 relative group",
          isActive ? "text-accent" : "text-white/20 hover:text-white/40"
        )}
      >
        <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
        <span className="text-[8px] font-display uppercase tracking-widest">{tab.label}</span>
        {isActive && (
          <motion.div 
            layoutId="activeTab"
            className="absolute -bottom-1 w-1 h-1 bg-accent rounded-full"
          />
        )}
      </button>
    );
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-bg/80 backdrop-blur-2xl border-t border-white/5 pb-safe z-40">
      <div className="flex justify-between items-center h-20 px-6 relative">
        <div className="flex gap-2">
          {leftTabs.map(renderTab)}
        </div>

        {/* Center Snap Button */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onSnapClick} 
            className="w-16 h-16 bg-accent rounded-full flex items-center justify-center shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] text-bg hover:bg-accent/90 transition-all border-[8px] border-bg relative group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Camera className="w-6 h-6 relative z-10" />
          </motion.button>
        </div>

        <div className="flex gap-2">
          {rightTabs.map(renderTab)}
        </div>
      </div>
    </div>
  );
}
