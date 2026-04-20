import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, LogIn, Mail, Lock, UserPlus, Phone, Loader2, ArrowRight } from 'lucide-react';
import { firebaseService } from '../services/FirebaseService';
import { cn } from '../lib/utils';

interface AuthScreenProps {
  onGoogleLogin: () => void;
  onLoginSuccess: () => void;
  externalError?: string;
  isLoading?: boolean;
}

export function AuthScreen({ onGoogleLogin, onLoginSuccess, externalError, isLoading }: AuthScreenProps) {
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20"
      >
        <Activity className="w-10 h-10 text-accent" />
      </motion.div>
      <h1 className="text-5xl md:text-6xl font-display uppercase leading-none mb-2 text-white">
        G-<span className="text-stroke">Refine</span>
      </h1>
      <p className="text-ink/60 mb-8 max-w-sm font-light tracking-wide uppercase text-xs">
        Refining oneself through better food choices.
      </p>

      <div className="vonas-card max-w-md w-full bg-[#151515] border-white/5 space-y-6 text-left">
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}
        
        <button
          onClick={onGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full bg-white text-black font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </div>
  );
}
