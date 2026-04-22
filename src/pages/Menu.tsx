import React, { useState, useRef, useEffect } from 'react';
import { User, Info, LogOut, ChevronRight, Settings, Activity, Palette, Type, Moon, Sun, ChevronLeft, Star, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { UserProfile, FoodLog, UserSettings } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DataManagementModal } from '../components/DataManagementModal';

interface MenuProps {
  onNavigate: (page: 'profile' | 'basic-info' | 'app-info' | 'favorites') => void;
  onLogout: () => void;
  onUpdateSettings: (settings: UserSettings) => void;
  userEmail?: string;
  profile: UserProfile | null;
  logs: FoodLog[];
}

const FONT_SIZES: { label: string; value: UserSettings['fontSize'] }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Anton (Default)', value: 'Anton, sans-serif' },
  { label: 'Oswald (Fitness)', value: 'Oswald, sans-serif' },
  { label: 'Bebas Neue (Bold)', value: 'Bebas Neue, sans-serif' },
  { label: 'Inter (Clean)', value: 'Inter, sans-serif' },
];

export function MenuScreen({ onNavigate, onLogout, onUpdateSettings, userEmail, profile, logs }: MenuProps) {
  const [view, setView] = useState<'main' | 'settings'>('main');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [view]);

  const bmi = profile?.weight_kg && profile?.height_cm 
    ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1) 
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

  const currentSettings: UserSettings = profile?.settings || {
    accentColor: '#FFA0A0',
    fontSize: 'medium',
    theme: 'dark',
    fontFamily: 'Anton, sans-serif'
  };

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-5xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {view === 'main' ? (
          <motion.div 
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-12"
          >
            <header className="flex items-center gap-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-110">
                  {profile?.profile_picture ? (
                    <img src={profile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-white/20" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full border-4 border-bg flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-bg rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-display uppercase tracking-tight text-white leading-none mb-1">{profile?.name || 'User'}</h1>
                <p className="text-[10px] font-display uppercase tracking-widest text-white/40">{userEmail}</p>
              </div>
            </header>

            {/* Profile Summary Card */}
            <div className="vonas-card space-y-8">
              <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                  <div className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 mb-2">Current BMI Index</div>
                  <div className="text-5xl font-display text-white">{bmi}</div>
                </div>
                <div className={cn("text-[10px] font-display uppercase tracking-widest px-3 py-1.5 rounded-md bg-white/5 border border-white/10", bmiStatus.color)}>
                  {bmiStatus.label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:border-accent/30 transition-colors">
                  <div className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 mb-2">Daily Goal</div>
                  <div className="text-2xl font-display text-accent">{profile?.daily_goals?.calories || 0} <span className="text-[10px] font-sans tracking-normal lowercase text-white/20">kcal</span></div>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 group hover:border-accent/30 transition-colors">
                  <div className="text-[10px] font-display uppercase tracking-[0.2em] text-white/40 mb-2">Weight</div>
                  <div className="text-2xl font-display text-white">{profile?.weight_kg || 0} <span className="text-[10px] font-sans tracking-normal lowercase text-white/20">kg</span></div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-display uppercase tracking-[0.3em] text-white/20 px-2 mb-4">Account Settings</h3>
              <MenuButton icon={Star} label="Favorite Meals" onClick={() => onNavigate('favorites')} />
              <MenuButton icon={Settings} label="Edit Profile" onClick={() => onNavigate('profile')} />
              <MenuButton icon={Activity} label="Health Goals & Info" onClick={() => onNavigate('basic-info')} />
              <MenuButton icon={Download} label="Statements & Reports" onClick={() => setIsDataModalOpen(true)} />
              <MenuButton icon={Palette} label="App Settings" onClick={() => setView('settings')} />
              <MenuButton icon={Info} label="App Information" onClick={() => onNavigate('app-info')} />
            </div>
            
            <div className="pt-8">
              <MenuButton icon={LogOut} label="Logout" onClick={onLogout} variant="danger" />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-12"
          >
            <header className="flex items-center gap-4">
              <button 
                onClick={() => setView('main')}
                className="p-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-display uppercase tracking-tight text-white leading-none">Settings</h1>
            </header>

            <div className="space-y-8">
              {/* Accent Color */}
              <div className="vonas-card space-y-6">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-display uppercase tracking-widest">Accent Color</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                    <input
                      type="color"
                      value={currentSettings.accentColor}
                      onChange={(e) => onUpdateSettings({ ...currentSettings, accentColor: e.target.value })}
                      className="absolute -inset-2 w-16 h-16 cursor-pointer opacity-0 z-10"
                    />
                    <div 
                      className="absolute inset-0 pointer-events-none" 
                      style={{ backgroundColor: currentSettings.accentColor }} 
                    />
                  </div>
                  <div className="text-sm font-display uppercase tracking-widest text-white/60">
                    {currentSettings.accentColor}
                  </div>
                </div>
              </div>

              {/* Font Size */}
              <div className="vonas-card space-y-6">
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-display uppercase tracking-widest">Font Size</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.value}
                      onClick={() => onUpdateSettings({ ...currentSettings, fontSize: size.value })}
                      className={cn(
                        "py-3 rounded-xl border font-display uppercase text-[10px] tracking-widest transition-all",
                        currentSettings.fontSize === size.value 
                          ? "bg-accent text-bg border-accent" 
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div className="vonas-card space-y-6">
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 text-accent" />
                  <h3 className="text-xs font-display uppercase tracking-widest">Font Style</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {FONT_FAMILIES.map((font) => (
                    <button
                      key={font.value}
                      onClick={() => onUpdateSettings({ ...currentSettings, fontFamily: font.value })}
                      className={cn(
                        "py-4 rounded-xl border font-display uppercase text-[10px] tracking-widest transition-all",
                        currentSettings.fontFamily === font.value 
                          ? "bg-accent text-bg border-accent" 
                          : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="vonas-card space-y-6">
                <div className="flex items-center gap-3">
                  {currentSettings.theme === 'dark' ? <Moon className="w-4 h-4 text-accent" /> : <Sun className="w-4 h-4 text-accent" />}
                  <h3 className="text-xs font-display uppercase tracking-widest">Appearance</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onUpdateSettings({ ...currentSettings, theme: 'dark' })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 rounded-xl border font-display uppercase text-[10px] tracking-widest transition-all",
                      currentSettings.theme === 'dark' 
                        ? "bg-accent text-bg border-accent" 
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    <Moon className="w-3 h-3" />
                    Dark
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ ...currentSettings, theme: 'light' })}
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 rounded-xl border font-display uppercase text-[10px] tracking-widest transition-all",
                      currentSettings.theme === 'light' 
                        ? "bg-accent text-bg border-accent" 
                        : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    <Sun className="w-3 h-3" />
                    Light
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DataManagementModal 
        isOpen={isDataModalOpen} 
        onClose={() => setIsDataModalOpen(false)} 
        userProfile={profile}
        foodLogs={logs}
      />
    </div>
  );
}

function MenuButton({ icon: Icon, label, onClick, variant = 'default' }: any) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 group",
        variant === 'danger' 
          ? 'bg-danger/5 border-danger/20 text-danger hover:bg-danger/10' 
          : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-2 rounded-lg transition-colors",
          variant === 'danger' ? 'bg-danger/10' : 'bg-white/5 group-hover:bg-accent/20 group-hover:text-accent'
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-display uppercase tracking-widest text-xs">{label}</span>
      </div>
      {variant !== 'danger' && (
        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
      )}
    </motion.button>
  );
}
