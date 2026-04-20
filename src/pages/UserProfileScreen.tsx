import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Loader2, Save, ChevronLeft, Camera, Trash2, Bell, BellOff, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../lib/countries';

interface UserProfileScreenProps {
  user: User;
  profile: UserProfile | null;
  onBack: () => void;
}

export function UserProfileScreen({ user, profile, onBack }: UserProfileScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    profile_picture: profile?.profile_picture || '',
    country: profile?.country || 'US',
    language: profile?.language || 'English',
    birthday: profile?.birthday || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        profile_picture: profile.profile_picture || '',
        country: profile.country || 'US',
        language: profile.language || 'English',
        birthday: profile.birthday || '',
      });
    }
  }, [profile]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFormData(prev => ({ ...prev, profile_picture: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePicture = () => {
    setFormData(prev => ({ ...prev, profile_picture: '' }));
  };

  const calculateAge = (birthday: string) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const age = calculateAge(formData.birthday);
      
      const updateData: any = {
        name: formData.name,
        username: formData.username,
        profile_picture: formData.profile_picture,
        country: formData.country,
        language: formData.language,
        birthday: formData.birthday,
      };

      if (age !== null) {
        updateData.age = age;
      }

      await updateDoc(userRef, updateData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-5xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white border border-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-display uppercase tracking-tight text-white">Profile</h1>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-[10px] font-display uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
          >
            Edit
          </button>
        )}
      </header>

      <div className="vonas-card space-y-12 flex flex-col items-center">
        {/* Profile Picture */}
        <div className="relative">
          <div className="w-40 h-40 rounded-full bg-white/5 border-4 border-bg overflow-hidden flex items-center justify-center shadow-2xl relative group">
            {formData.profile_picture ? (
              <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            ) : (
              <span className="text-6xl font-display text-white/10">
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </span>
            )}
            <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {isEditing && (
            <div className="absolute -bottom-2 -right-2 flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 bg-accent rounded-full flex items-center justify-center text-bg hover:bg-accent/80 border-4 border-bg shadow-xl transition-all hover:scale-110"
              >
                <Camera className="w-5 h-5" />
              </button>
              {formData.profile_picture && (
                <button 
                  onClick={handleDeletePicture}
                  className="w-12 h-12 bg-danger rounded-full flex items-center justify-center text-white hover:bg-danger/80 border-4 border-bg shadow-xl transition-all hover:scale-110"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Form Fields */}
        <div className="w-full space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Full Name</label>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                placeholder="Enter your name"
              />
            ) : (
              <div className="text-2xl font-display uppercase text-white">
                {formData.name || 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Username</label>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                placeholder="@username"
              />
            ) : (
              <div className="text-xl font-display uppercase text-white/60">
                {formData.username ? `@${formData.username}` : 'Not set'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Birthday & Age</label>
            {isEditing ? (
              <div className="flex gap-4 items-center">
                <input 
                  type="date" 
                  value={formData.birthday}
                  onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                />
                {formData.birthday && (
                  <div className="text-xl font-display text-white/60 w-20 text-center">
                    {calculateAge(formData.birthday)} yrs
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xl font-display text-white">
                {formData.birthday || '--'} 
                {formData.birthday && <span className="text-white/40 ml-2">({calculateAge(formData.birthday)} yrs)</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Country</label>
              {isEditing ? (
                <select 
                  value={formData.country}
                  onChange={e => {
                    const country = COUNTRIES.find(c => c.code === e.target.value);
                    setFormData({ 
                      ...formData, 
                      country: e.target.value,
                      language: country ? country.languages[0] : formData.language
                    });
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light appearance-none"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xl font-display text-white">
                  {COUNTRIES.find(c => c.code === formData.country)?.name || formData.country}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Language</label>
              {isEditing ? (
                <select 
                  value={formData.language}
                  onChange={e => setFormData({ ...formData, language: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light appearance-none"
                >
                  {(COUNTRIES.find(c => c.code === formData.country)?.languages || ['English']).map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xl font-display text-white">
                  {formData.language || '--'}
                </div>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="pt-8 border-t border-white/10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-display uppercase tracking-widest text-white">Push Notifications</h3>
                  <p className="text-xs text-white/40 mt-1">Get alerts for goals, macros, and occasions.</p>
                </div>
                {notificationPermission === 'granted' ? (
                  <div className="flex items-center gap-2 text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20">
                    <Bell className="w-4 h-4" />
                    <span className="text-xs font-display uppercase tracking-widest">Enabled</span>
                  </div>
                ) : notificationPermission === 'denied' ? (
                  <div className="flex items-center gap-2 text-danger bg-danger/10 px-3 py-1.5 rounded-lg border border-danger/20">
                    <BellOff className="w-4 h-4" />
                    <span className="text-xs font-display uppercase tracking-widest">Blocked</span>
                  </div>
                ) : (
                  <button 
                    onClick={requestNotificationPermission}
                    className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="text-xs font-display uppercase tracking-widest">Enable</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="vonas-button vonas-button-primary w-full py-5"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
