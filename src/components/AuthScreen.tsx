import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, LogIn, Mail, Lock, UserPlus, Phone, Loader2, ArrowRight } from 'lucide-react';
import { firebaseService } from '../services/FirebaseService';
import { cn } from '../lib/utils';
import { FirebaseError } from 'firebase/app';

interface AuthScreenProps {
  onGoogleLogin: () => void;
  onLoginSuccess: () => void;
  externalError?: string;
}

export function AuthScreen({ onGoogleLogin, onLoginSuccess, externalError }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (externalError) {
      setError(externalError);
    }
  }, [externalError]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Phone verification state
  const [isPhoneMode, setIsPhoneMode] = useState(false); // For linking phone after signup
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  
  useEffect(() => {
    // Setup recaptcha immediately for phone auth
    try {
      firebaseService.setupRecaptcha('recaptcha-container');
    } catch (e) {
      console.error("Recaptcha setup error:", e);
    }
  }, []);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const checkAccountAndProceed = async (
    email: string, 
    action: () => Promise<void>, 
    requireAccount: boolean,
    onNoAccount: () => void
  ) => {
    try {
      const exists = await firebaseService.checkEmailExists(email);
      if (requireAccount && !exists) {
        onNoAccount();
        return;
      }
      if (!requireAccount && exists) {
        setError('This email is already registered. Try signing in instead.');
        return;
      }
      await action();
    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        // Fallback if enumeration protection is on: just try the action
        await action();
      } else {
        throw e;
      }
    }
  };

  const handleAuthError = (e: any, isSignUpFlow: boolean = false) => {
    console.error("Auth error:", e);
    let msg = e.message || 'An error occurred during authentication';
    
    const errorCode = e.code || (e.cause?.code);
    if (errorCode === 'auth/invalid-credential') {
      msg = isSignUpFlow ? 'Invalid account details. Please check your email format.' : 'Incorrect email or password. Please try again.';
    } else if (errorCode === 'auth/email-already-in-use') {
      msg = 'This email is already registered. Try signing in instead.';
    } else if (errorCode === 'auth/weak-password') {
      msg = 'Password is too weak. Please use at least 6 characters.';
    } else if (errorCode === 'auth/too-many-requests') {
      msg = 'Too many attempts. For security, please try again later or reset your password.';
    }
    
    setError(msg);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email to reset password');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await checkAccountAndProceed(email, async () => {
        await firebaseService.sendPasswordReset(email);
        setResetSent(true);
      }, true, () => {
        setError("We couldn't find an account with that email. Please create a new account.");
        setIsForgotPassword(false);
        setIsSignUp(true);
      });
    } catch (e: any) {
      handleAuthError(e, false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await checkAccountAndProceed(email, async () => {
        if (isSignUp) {
          await firebaseService.signUpWithEmail(email, password);
          onLoginSuccess();
        } else {
          await firebaseService.signInWithEmail(email, password);
          onLoginSuccess();
        }
      }, !isSignUp, () => {
        setError("This account doesn't exist yet. Let's create one!");
        setIsSignUp(true);
      });
    } catch (e: any) {
      handleAuthError(e, isSignUp);
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Toggle Sign in / Sign up */}
        {!isForgotPassword && (
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button 
              className={cn("flex-1 py-2 text-xs font-display uppercase tracking-widest rounded-lg transition-all", !isSignUp ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
              onClick={() => { setIsSignUp(false); setError(''); }}
            >
              Sign In
            </button>
            <button 
              className={cn("flex-1 py-2 text-xs font-display uppercase tracking-widest rounded-lg transition-all", isSignUp ? "bg-white/10 text-white" : "text-white/40 hover:text-white")}
              onClick={() => { setIsSignUp(true); setError(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}
        
        {resetSent && (
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs p-3 rounded-xl flex items-center justify-center">
            Password reset email sent! Check your inbox.
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-display uppercase tracking-widest text-white/40 ml-1">Account Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
                  placeholder="you@email.com"
                />
              </div>
            </div>
            
            <button 
              type="submit" disabled={isLoading || resetSent}
              className="w-full bg-white text-black font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
            </button>
            
            <button 
              type="button" 
              onClick={() => { setIsForgotPassword(false); setError(''); setResetSent(false); }}
              className="w-full text-white/40 hover:text-white font-display uppercase tracking-widest text-[10px] py-2"
            >
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-display uppercase tracking-widest text-white/40 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="username"
                  className="w-full bg-black/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
                  placeholder="you@email.com"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-display uppercase tracking-widest text-white/40 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  className="w-full bg-black/30 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
              </div>
              {!isSignUp && (
                <div className="text-right pt-1">
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPassword(true); setError(''); }}
                    className="text-[10px] font-display uppercase tracking-widest text-white/40 hover:text-accent transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="w-full bg-white text-black font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 border-t border-white/5 top-1/2 w-full"></div>
          <span className="relative bg-[#151515] px-4 text-[10px] font-display uppercase tracking-widest text-white/40">OR</span>
        </div>

        <button
          onClick={onGoogleLogin}
          type="button"
          className="w-full border border-white/10 text-white font-display uppercase tracking-widest text-xs py-3.5 rounded-xl flex items-center justify-center gap-3 hover:bg-white/5 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Quick Login with Google
        </button>
      </div>

      <div id="recaptcha-container"></div>
    </div>
  );
}
