import React from 'react';
import { ChevronLeft, Info, Activity } from 'lucide-react';
import { motion } from 'motion/react';

export function AppInfo({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-5xl mx-auto w-full">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-display uppercase tracking-tight text-white">App Info</h1>
      </header>
      
      <div className="vonas-card space-y-12">
        <div className="flex items-center gap-6 mb-8 border-b border-white/10 pb-8">
          <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center border border-accent/20 shadow-2xl">
            <Activity className="w-10 h-10 text-accent" />
          </div>
          <div>
            <h2 className="text-3xl font-display uppercase text-white leading-none mb-2">G-Refine</h2>
            <p className="text-[10px] font-display uppercase tracking-widest text-white/20">Version 1.0.0</p>
          </div>
        </div>
        
        <div className="space-y-6 text-sm leading-relaxed text-white/60 font-light">
          <p className="text-lg font-display uppercase text-white/80 leading-tight">Refining oneself through better food choices.</p>
          <p>G-Refine is your personal AI-powered nutrition assistant designed to help you make better decisions about what you eat.</p>
          <p>Inspired by modern aesthetics and powered by advanced Gemini AI models to provide instant nutritional feedback.</p>
        </div>
        
        <div className="pt-12 mt-12 border-t border-white/10 text-[10px] font-display uppercase tracking-[0.2em] text-white/20 text-center">
          &copy; {new Date().getFullYear()} G-Refine. All rights reserved.
        </div>
      </div>
    </div>
  );
}
