import React, { useState, useEffect } from 'react';
import { UserProfile, DailyGoals } from '../types';
import { User, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { Loader2, Save, ChevronLeft, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { COUNTRIES } from '../lib/countries';

interface BasicInfoScreenProps {
  user: User;
  profile: UserProfile | null;
  onBack: () => void;
}

export function BasicInfoScreen({ user, profile, onBack }: BasicInfoScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  
  const hasPasswordProvider = user.providerData.some(p => p.providerId === 'password');
  const [newPassword, setNewPassword] = useState('');

  const [isEditing, setIsEditing] = useState(() => {
    return !profile?.name || !profile?.weight_kg || !profile?.height_cm || !profile?.username || (!hasPasswordProvider);
  });

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    birthday: profile?.birthday || '',
    age: profile?.age || 30,
    gender: profile?.gender || 'male',
    weight_kg: profile?.weight_kg || 70,
    height_cm: profile?.height_cm || 170,
    activity_level: profile?.activity_level || 'moderate',
    goal: profile?.goal || 'maintain',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        username: profile.username || '',
        birthday: profile.birthday || '',
        age: profile.age || 30,
        gender: profile.gender || 'male',
        weight_kg: profile.weight_kg || 70,
        height_cm: profile.height_cm || 170,
        activity_level: profile.activity_level || 'moderate',
        goal: profile.goal || 'maintain',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (formData.birthday) {
      const birthDate = new Date(formData.birthday);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge !== formData.age) {
        setFormData(prev => ({ ...prev, age: calculatedAge > 0 ? calculatedAge : 0 }));
      }
    }
  }, [formData.birthday]);

  const calculateMacros = (): DailyGoals & { bmr: number } => {
    const { age, gender, weight_kg, height_cm, activity_level, goal } = formData;
    
    // Mifflin-St Jeor Equation
    let bmr = 10 * (weight_kg || 70) + 6.25 * (height_cm || 170) - 5 * (age || 30);
    bmr += gender === 'male' ? 5 : -161;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[activity_level as keyof typeof activityMultipliers || 'moderate'];

    // Adjust for goal
    if (goal === 'lose') tdee -= 500;
    if (goal === 'extreme_lose') tdee -= 1000;
    if (goal === 'gain') tdee += 500;
    if (goal === 'extreme_gain') tdee += 1000;

    // Safety limit: Don't let calories go below 1200 for adults
    if (tdee < 1200) tdee = 1200;

    const calories = Math.round(tdee);
    
    // Macros: Protein 2g/kg, Fat 0.8g/kg, Carbs remainder
    const protein_g = Math.round((weight_kg || 70) * 2);
    const fat_g = Math.round((weight_kg || 70) * 0.8);
    
    const proteinCals = protein_g * 4;
    const fatCals = fat_g * 9;
    
    // If calories are extremely low, prioritize protein/fat and prevent negative carbs
    const carbs_g = Math.round(Math.max(0, (calories - proteinCals - fatCals) / 4));
    const sugar_g = Math.round(calories * 0.1 / 4); // 10% of calories from sugar
    const sodium_mg = 2300; // Standard daily limit

    return { calories, protein_g, carbs_g, fat_g, sugar_g, sodium_mg, bmr: Math.round(bmr) };
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorInfo('');
    try {
      if (!formData.birthday) throw new Error("Birthday is required.");
      if (!formData.weight_kg || formData.weight_kg <= 0) throw new Error("A valid specific weight is required.");
      if (!formData.height_cm || formData.height_cm <= 0) throw new Error("A valid height is required.");
      
      if (!hasPasswordProvider && isEditing) {
        if (!newPassword || newPassword.length < 6) {
          throw new Error("A strong password (at least 6 characters) is required.");
        }
        await updatePassword(user, newPassword);
      }

      const calculated = calculateMacros();
      const userRef = doc(db, 'users', user.uid);
      
      try {
        await updateDoc(userRef, {
          ...formData,
          daily_goals: {
            calories: calculated.calories,
            protein_g: calculated.protein_g,
            carbs_g: calculated.carbs_g,
            fat_g: calculated.fat_g,
            sugar_g: calculated.sugar_g,
            sodium_mg: calculated.sodium_mg,
          },
          bmr: calculated.bmr,
        });
      } catch (firestoreErr: any) {
        handleFirestoreError(firestoreErr, OperationType.UPDATE, `users/${user.uid}`);
      }
      
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      let displayMsg = error.message;
      if (displayMsg.startsWith('{')) {
        try {
          const parsed = JSON.parse(displayMsg);
          displayMsg = parsed.error;
        } catch (e) {
            // keep original
        }
      }
      setErrorInfo(displayMsg || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const bmi = formData.weight_kg && formData.height_cm 
    ? (formData.weight_kg / Math.pow(formData.height_cm / 100, 2)).toFixed(1) 
    : '--';

  const getBmiStatus = (bmiValue: string) => {
    if (bmiValue === '--') return { label: 'Unknown', color: 'text-white/40' };
    const num = parseFloat(bmiValue);
    if (num < 18.5) return { label: 'Underweight', color: 'text-blue-400' };
    if (num < 25) return { label: 'Normal', color: 'text-accent' };
    if (num < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-danger' };
  };

  const bmiStatus = getBmiStatus(bmi);
  const previewMacros = calculateMacros();

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
          <h1 className="text-3xl font-display uppercase tracking-tight text-white">Basic Info</h1>
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

      <div className="vonas-card space-y-12">
        {errorInfo && (
          <div className="bg-danger/10 text-danger text-xs p-4 rounded-xl border border-danger/20">
            {errorInfo}
          </div>
        )}
        
        {/* Profile Information */}
        <div className="space-y-8">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Profile Information</h3>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Full Name</label>
            {isEditing ? (
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Jane Doe"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
              />
            ) : (
              <div className="text-2xl font-display text-white">
                {formData.name || <span className="text-white/20 italic text-sm">Not set</span>}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Username</label>
              {isEditing ? (
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="@username"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                />
              ) : (
                <div className="text-xl font-display text-white">
                  {formData.username ? `@${formData.username}` : <span className="text-white/20 italic text-sm">Not set</span>}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Birthday</label>
              {isEditing ? (
                <input 
                  type="date" 
                  value={formData.birthday}
                  onChange={e => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                />
              ) : (
                <div className="text-xl font-display text-white">
                  {formData.birthday || <span className="text-white/20 italic text-sm">Not set</span>}
                </div>
              )}
            </div>
          </div>
          
          {isEditing && !hasPasswordProvider && (
            <div className="space-y-2 pt-4 border-t border-white/5">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-accent">Finish Account Setup: Set a Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Create a strong password (6+ chars)"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white text-sm focus:border-accent/50 focus:outline-none transition-colors"
                />
              </div>
              <p className="text-[10px] text-white/40 ml-2 mt-2">You signed in with Google. Let's create a password so you can sign in directly.</p>
            </div>
          )}
        </div>

        {/* Physical Stats */}
        <div className="space-y-8">
          <div className="flex justify-between items-end border-b border-white/10 pb-4">
            <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Physical Stats</h3>
            <div className="text-right">
              <div className="text-[10px] font-display uppercase tracking-widest text-white/20 mb-1">BMI Index</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-display text-white">{bmi}</span>
                <span className={cn("text-[10px] font-display uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md", bmiStatus.color)}>
                  {bmiStatus.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Age</label>
              <div className="text-2xl font-display text-white">
                {formData.age > 0 ? formData.age : '--'} <span className="text-xs text-white/20 font-sans tracking-normal lowercase">yrs</span>
              </div>
              {isEditing && (
                <p className="text-[10px] text-white/20 mt-1">Calculated from birthday</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Gender</label>
              {isEditing ? (
                <select 
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light appearance-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              ) : (
                <div className="text-2xl font-display uppercase text-white">
                  {formData.gender}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Weight</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.weight_kg}
                  onChange={e => setFormData({ ...formData, weight_kg: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                />
              ) : (
                <div className="text-2xl font-display text-white">
                  {formData.weight_kg} <span className="text-xs text-white/20 font-sans tracking-normal lowercase">kg</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Height</label>
              {isEditing ? (
                <input 
                  type="number" 
                  value={formData.height_cm}
                  onChange={e => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-accent transition-all font-light"
                />
              ) : (
                <div className="text-2xl font-display text-white">
                  {formData.height_cm} <span className="text-xs text-white/20 font-sans tracking-normal lowercase">cm</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fitness Goals */}
        <div className="space-y-8">
          <h3 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-4">Fitness Goals</h3>
          
          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Activity Level</label>
            {isEditing ? (
              <select 
                value={formData.activity_level}
                onChange={e => setFormData({ ...formData, activity_level: e.target.value as any })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-accent transition-all font-light appearance-none"
              >
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="light">Lightly Active (1-3 days/week)</option>
                <option value="moderate">Moderately Active (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very_active">Very Active (Twice a day)</option>
              </select>
            ) : (
              <div className="text-xl font-display uppercase text-white">
                {formData.activity_level.replace('_', ' ')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">Target Goal</label>
            {isEditing ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'extreme_lose', label: 'Extreme Lose' },
                  { id: 'lose', label: 'Lose' },
                  { id: 'maintain', label: 'Maintain' },
                  { id: 'gain', label: 'Gain' },
                  { id: 'extreme_gain', label: 'Extreme Gain' }
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setFormData({ ...formData, goal: g.id as any })}
                    className={cn(
                      "py-4 px-2 rounded-2xl text-[10px] font-display uppercase tracking-widest transition-all border text-center",
                      formData.goal === g.id 
                        ? "bg-accent border-accent text-bg" 
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xl font-display uppercase text-white">
                {formData.goal.replace('_', ' ')} Weight
              </div>
            )}
          </div>
        </div>

        {/* Macro Calculation Preview / Display */}
        <div className="pt-12 border-t border-white/10">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40">
              {isEditing ? 'Calculated Daily Limits' : 'Current Daily Limits'}
            </h4>
            <div className="h-px flex-1 bg-white/10 mx-4" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { label: 'Kcal', value: isEditing ? previewMacros.calories : profile?.daily_goals?.calories || 0, color: 'text-accent' },
              { label: 'Prot', value: isEditing ? previewMacros.protein_g : profile?.daily_goals?.protein_g || 0, color: 'text-blue-400' },
              { label: 'Carb', value: isEditing ? previewMacros.carbs_g : profile?.daily_goals?.carbs_g || 0, color: 'text-amber-400' },
              { label: 'Fat', value: isEditing ? previewMacros.fat_g : profile?.daily_goals?.fat_g || 0, color: 'text-violet-400' },
              { label: 'Sug', value: isEditing ? previewMacros.sugar_g : profile?.daily_goals?.sugar_g || 0, color: 'text-pink-400' },
              { label: 'Sod', value: isEditing ? previewMacros.sodium_mg : profile?.daily_goals?.sodium_mg || 0, color: 'text-orange-400' },
            ].map((macro) => (
              <div key={macro.label} className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center group hover:border-white/20 transition-colors flex flex-col justify-center min-h-[80px]">
                <div className={cn("text-lg sm:text-xl font-display break-words leading-tight", macro.color)}>
                  {macro.value}
                </div>
                <div className="text-[8px] text-white/20 uppercase tracking-widest mt-1 font-display">{macro.label}</div>
              </div>
            ))}
          </div>
        </div>

        {isEditing && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="vonas-button vonas-button-primary w-full py-5 mt-8"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save & Set Limits</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
