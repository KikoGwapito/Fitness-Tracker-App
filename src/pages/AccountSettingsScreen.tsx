import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';
import { ChevronLeft, Save, Loader2, Lock, User as UserIcon, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { firebaseService } from '../services/FirebaseService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface AccountSettingsScreenProps {
  user: User;
  profile: UserProfile | null;
  onBack: () => void;
}

export function AccountSettingsScreen({ user, profile, onBack }: AccountSettingsScreenProps) {
  const [username, setUsername] = useState(profile?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);
    try {
      if (hasPasswordProvider) {
        await firebaseService.reauthenticateAndVerify(user, deleteConfirmation, 'email');
      }
      await firebaseService.deleteAccountAndData(user);
    } catch (e: any) {
      console.error(e);
      setDeleteError(e.message || "Failed to delete account. You may need to log out and log back in.");
    } finally {
      setIsDeleting(false);
    }
  };

  const [resetSent, setResetSent] = useState(false);

  const handleSendResetLink = async () => {
    if (!user.email) return;
    try {
      await firebaseService.sendPasswordReset(user.email);
      setSuccess("Password reset email sent! Check your inbox.");
      setResetSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to send reset email.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // 1. Update Username in Firestore
      if (username !== profile?.username) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { username });
      }

      // 2. Update Password if requested
      if (newPassword) {
        if (hasPasswordProvider) {
          // Re-authenticate first
          if (!currentPassword) {
            throw new Error("Current password is required to set a new password.");
          }
          if (user.email) {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
          }
        } 
        
        // Actually set the new password
        await updatePassword(user, newPassword);
      }

      setSuccess("Account settings updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Failed to update account settings.';
      
      const errorCode = err.code || (err.cause?.code);
      if (errorCode === 'auth/invalid-credential') {
        msg = 'Incorrect current password. Please verify and try again.';
      } else if (errorCode === 'auth/requires-recent-login') {
        msg = 'For security, please log out and log back in before making these changes.';
      }
      
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-2xl mx-auto w-full">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/10 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-display uppercase tracking-tight text-white leading-none">Account & Security</h1>
      </header>

      <form onSubmit={handleSave} className="vonas-card space-y-8">
        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-4 rounded-xl">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-accent/10 border border-accent/20 text-accent text-xs p-4 rounded-xl">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-4">Profile Identity</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 ml-1">Username</label>
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="@username"
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[10px] text-white/40 ml-2 mt-2">This is how other users will see you.</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-4">Security</h3>
          
          {hasPasswordProvider && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 ml-1">Current Password</label>
                <button 
                  type="button"
                  onClick={handleSendResetLink}
                  disabled={resetSent}
                  className="text-[10px] font-display uppercase tracking-[0.2em] text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                >
                  Forgot it?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 ml-1">
              {hasPasswordProvider ? 'New Password' : 'Set a Password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
              />
            </div>
            {!hasPasswordProvider && (
              <p className="text-[10px] text-white/40 ml-2 mt-2">You currently sign in via Google. Set a password to also allow normal email sign-in.</p>
            )}
            {hasPasswordProvider && (
              <p className="text-[10px] text-white/40 ml-2 mt-2">Leave blank to keep your current password.</p>
            )}
          </div>
        </div>

        <button 
          type="submit"
          disabled={isSaving}
          className="vonas-button vonas-button-primary w-full py-5 mt-4"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </form>
      
      <div className="pt-8 border-t border-white/10 mt-12 pb-8">
        <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-danger mb-4">Danger Zone</h3>
        <button 
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="w-full flex items-center justify-center gap-2 text-danger bg-danger/5 hover:bg-danger/10 border border-danger/20 hover:border-danger/40 px-4 py-4 rounded-xl transition-all font-display uppercase tracking-widest text-xs"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg/95 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="vonas-card max-w-sm w-full bg-[#151515] border-danger/30 space-y-6 relative"
            >
              <div className="w-12 h-12 bg-danger/20 rounded-full flex items-center justify-center border border-danger/30 mx-auto">
                <AlertTriangle className="w-6 h-6 text-danger" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-display uppercase tracking-widest text-white mb-2">Delete Account</h2>
                <p className="text-xs text-white/60 leading-relaxed font-light mb-6">
                  This action is permanent. All your meals, profile data, and settings will be instantly deleted. 
                </p>
                
                {hasPasswordProvider && (
                  <div className="text-left space-y-2 mb-6">
                    <label className="text-[10px] font-display uppercase tracking-widest text-white/40">Verify Password to continue</label>
                    <input 
                      type="password" 
                      value={deleteConfirmation}
                      onChange={e => setDeleteConfirmation(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-black/30 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-danger/50 focus:outline-none transition-colors"
                    />
                  </div>
                )}

                {deleteError && (
                  <p className="text-danger text-xs mb-4 p-2 bg-danger/10 border border-danger/20 rounded-lg">{deleteError}</p>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteError('');
                      setDeleteConfirmation('');
                    }}
                    className="flex-1 py-3 text-xs font-display uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || (hasPasswordProvider && !deleteConfirmation)}
                    className="flex-1 py-3 text-xs font-display uppercase tracking-widest text-white bg-danger hover:bg-danger/80 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
