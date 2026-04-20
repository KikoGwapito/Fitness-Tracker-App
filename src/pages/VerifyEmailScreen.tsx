import React, { useState } from 'react';
import { User, sendEmailVerification, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, ArrowRight, RefreshCcw, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface VerifyEmailScreenProps {
  user: User;
}

export function VerifyEmailScreen({ user }: VerifyEmailScreenProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    setIsSending(true);
    setError('');
    try {
      await sendEmailVerification(user);
      setIsSent(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to resend. Please try again later.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    await user.reload();
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 border border-accent/20"
      >
        <Mail className="w-10 h-10 text-accent" />
      </motion.div>
      <h1 className="text-3xl font-display uppercase tracking-widest text-white mb-4">
        Verify Your Email
      </h1>
      <p className="text-white/60 mb-8 max-w-sm font-light text-sm">
        We sent an email to <span className="text-white font-medium">{user.email}</span>. 
        Please click the link inside to continue using G-Refine.
      </p>

      <div className="vonas-card max-w-sm w-full bg-[#151515] border-white/5 space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl flex items-center justify-center">
            {error}
          </div>
        )}
        
        {isSent && (
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs p-3 rounded-xl flex items-center justify-center">
            Verification email sent!
          </div>
        )}

        <button 
          onClick={handleRefresh}
          className="w-full bg-white text-black font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" /> I've Verified My Email
        </button>

        <button 
          onClick={handleResend}
          disabled={isSending || isSent}
          className="w-full border border-white/10 text-white font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend Email"}
        </button>
        
        <div className="pt-4 mt-4 border-t border-white/10">
          <button 
            onClick={handleLogout}
            className="w-full text-white/40 hover:text-white font-display uppercase tracking-widest text-[10px] py-2 flex items-center justify-center gap-2"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
