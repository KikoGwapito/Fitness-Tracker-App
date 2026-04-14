import React, { useState, useRef, useEffect } from 'react';
import { Camera as CameraIcon, Plus, Activity, Flame, Droplets, Beef, X, Loader2, MessageSquare, Image as ImageIcon, LogOut, LogIn, ChevronRight, Sparkles, Apple, Star } from 'lucide-react';
import { analyzeMeal } from './lib/gemini';
import { FoodLog, DailyGoals, UserProfile, UserSettings } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage } from './lib/utils';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { firebaseService } from './services/FirebaseService';
import { handleFirestoreError, OperationType } from './lib/error-handler';
import { BottomNav, TabType } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { Progress } from './pages/Progress';
import { UserProfileScreen } from './pages/UserProfileScreen';
import { BasicInfoScreen } from './pages/BasicInfoScreen';
import { MenuScreen } from './pages/Menu';
import { AppInfo } from './pages/AppInfo';
import { FavoritesScreen } from './pages/Favorites';
import { ConfirmModal } from './components/ConfirmModal';
import { ActivityModal } from './components/ActivityModal';
import { useNotifications } from './lib/useNotifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const DEFAULT_GOALS: DailyGoals = {
  calories: 2200,
  protein_g: 150,
  carbs_g: 250,
  fat_g: 70,
  sugar_g: 50,
  sodium_mg: 2300,
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [subPage, setSubPage] = useState<'none' | 'profile' | 'basic-info' | 'app-info' | 'favorites'>('none');
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<Record<string, string>>({});

  // Initialize notifications
  useNotifications(logs, profile, schedules);

  // Apply Settings
  useEffect(() => {
    if (profile?.settings) {
      const { accentColor, fontSize, theme, fontFamily } = profile.settings;
      
      // Accent Color
      if (accentColor) {
        document.documentElement.style.setProperty('--c-accent', accentColor);
      }
      
      // Font Size
      if (fontSize) {
        document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
        document.documentElement.classList.add(`text-${fontSize}`);
      }
      
      // Theme
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }

      // Font Family
      if (fontFamily) {
        document.documentElement.style.setProperty('--font-display', fontFamily);
      } else {
        document.documentElement.style.setProperty('--font-display', 'Anton, sans-serif');
      }
    } else {
      // Defaults
      document.documentElement.style.setProperty('--c-accent', '#FFA0A0');
      document.documentElement.classList.remove('text-small', 'text-large', 'light');
      document.documentElement.classList.add('text-medium');
      document.documentElement.style.setProperty('--font-display', 'Anton, sans-serif');
    }
  }, [profile?.settings]);
  
  const [isLogging, setIsLogging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<FoodLog | null>(null);
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [shouldTriggerCamera, setShouldTriggerCamera] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    clarification_required: string;
    reason: string;
    quick_options: string[] | null;
    data: any;
    isConfirmed?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle URL shortcut for camera
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'camera') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setShouldTriggerCamera(true);
    }
  }, []);

  useEffect(() => {
    if (shouldTriggerCamera && isAuthReady && user) {
      setIsLogging(true);
      setShouldTriggerCamera(false);
      // Wait for modal to render then trigger image selection
      setTimeout(() => {
        handleImageSelect();
      }, 300);
    }
  }, [shouldTriggerCamera, isAuthReady, user]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const mainContentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, subPage]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        await firebaseService.ensureUserProfile(currentUser, DEFAULT_GOALS);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Logs and Profile from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) {
      setLogs([]);
      setProfile(null);
      return;
    }

    // Profile listener
    const profileUnsubscribe = firebaseService.subscribeToProfile(user.uid, setProfile);

    // Logs listener
    const logsUnsubscribe = firebaseService.subscribeToMeals(user.uid, setLogs);

    // Schedules listener
    const schedulesUnsubscribe = firebaseService.subscribeToSchedules(user.uid, setSchedules);

    // Activities listener
    const activitiesUnsubscribe = firebaseService.subscribeToActivities(user.uid, setActivities);

    return () => {
      profileUnsubscribe();
      logsUnsubscribe();
      schedulesUnsubscribe();
      activitiesUnsubscribe();
    };
  }, [user, isAuthReady]);

  const handleLogin = async () => {
    const loggedInUser = await firebaseService.signInWithGoogle();
    if (loggedInUser) {
      setUser(loggedInUser);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSubPage('none');
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeLogs = logs.filter(log => !log.deletedFromLogs);

  const todayLogs = activeLogs.filter(log => {
    const today = new Date().setHours(0, 0, 0, 0);
    const logDate = new Date(log.timestamp).setHours(0, 0, 0, 0);
    return today === logDate;
  });

  const currentTotals = todayLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.macros.calories,
      protein_g: acc.protein_g + log.macros.protein,
      carbs_g: acc.carbs_g + log.macros.carbs,
      fat_g: acc.fat_g + log.macros.fat,
      sugar_g: acc.sugar_g + (log.sugar_g || 0),
      sodium_mg: acc.sodium_mg + (log.sodium_mg || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0, sodium_mg: 0 }
  );

  const handleImageSelect = async (e?: React.ChangeEvent<HTMLInputElement>) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const image = await Camera.getPhoto({
          quality: 60,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt
        });
        
        if (image.dataUrl) {
          setImageMimeType('image/jpeg');
          setSelectedImage(image.dataUrl);
        }
      } catch (error) {
        console.error("Camera error:", error);
      }
    } else {
      if (!e) {
        // If called without event, trigger the hidden file input
        fileInputRef.current?.click();
        return;
      }
      
      const file = e?.target?.files?.[0];
      if (!file) return;

      setImageMimeType('image/jpeg'); // We will force it to jpeg during compression
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressedDataUrl = await compressImage(reader.result as string, 600, 0.6);
          setSelectedImage(compressedDataUrl);
        } catch (err) {
          console.error("Failed to compress image immediately:", err);
          setSelectedImage(reader.result as string); // Fallback to original
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!user) return;
    const logToDelete = logs.find(l => l.id === logId);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Meal',
      message: 'Are you sure you want to delete this meal? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (logToDelete?.isPinned) {
            await firebaseService.updateMealInFirebase(user.uid, logId, { deletedFromLogs: true });
          } else {
            await firebaseService.deleteMealFromFirebase(user.uid, logId);
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Delete failed:', error);
        }
      }
    });
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Activity',
      message: 'Are you sure you want to delete this activity? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await firebaseService.deleteActivityFromFirebase(user.uid, activityId);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error('Delete failed:', error);
        }
      }
    });
  };

  const handleEditActivity = (activity: any) => {
    setEditingActivity(activity);
    setIsActivityModalOpen(true);
  };

  const handleRemoveFavorites = async (foodNames: string[]) => {
    if (!user) return;
    const lowerNames = foodNames.map(n => n.toLowerCase());
    const logsToUpdate = logs.filter(l => l.isPinned && lowerNames.includes((l.foodName || '').toLowerCase()));
    
    for (const log of logsToUpdate) {
      if (log.deletedFromLogs) {
        await firebaseService.deleteMealFromFirebase(user.uid, log.id);
      } else {
        await firebaseService.updateMealInFirebase(user.uid, log.id, { isPinned: false });
      }
    }
  };

  const handleEditLog = (log: FoodLog) => {
    setEditingLog(log);
    setTextInput(log.foodName);
    // Note: We don't restore the image for editing to save bandwidth/complexity, 
    // but we could if we stored the URL.
    setIsLogging(true);
  };

  const handleAnalyze = async () => {
    if (!textInput && !selectedImage && !editingLog) return;
    
    if (editingLog) {
      setConfirmModal({
        isOpen: true,
        title: 'Save Changes',
        message: 'Are you sure you want to save these changes? The AI will recalculate the macros based on your new input.',
        variant: 'primary',
        onConfirm: () => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          performAnalysis();
        }
      });
    } else {
      performAnalysis();
    }
  };

  const performAnalysis = async (additionalContext?: string) => {
    if (isAnalyzing) return; // Prevent double-clicks
    setIsAnalyzing(true);
    try {
      let imagePart;
      let finalImageUrl = selectedImage;
      
      if (selectedImage && imageMimeType) {
        const base64Data = selectedImage.split(',')[1];
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: imageMimeType
          }
        };
      }

      let prompt = textInput;
      if (additionalContext) {
        prompt += `\n\nUser clarification: ${additionalContext}`;
        if (additionalContext === "None of these / Show more" && pendingAnalysis?.quick_options) {
          prompt += `\nPrevious options shown (do not repeat these): ${pendingAnalysis.quick_options.join(', ')}`;
        }
      }

      const result = await analyzeMeal(imagePart, prompt);
      
      if (result.status === 'error') {
        alert(`Analysis Error: ${result.message}`);
        setIsAnalyzing(false);
        return;
      }

      if (result.status === 'pending' || result.status === 'confirmed') {
        // If confirmed, we inject the favorite options manually
        const options = result.status === 'confirmed' 
          ? ["Log Meal Only", "Log & Add to Favorites"]
          : result.quick_options || null;

        setPendingAnalysis({
          clarification_required: result.message || "Please provide more details.",
          reason: result.status === 'confirmed' ? "Final Confirmation" : "Dynamic Identification Phase",
          quick_options: options,
          data: { ...result, finalImageUrl },
          isConfirmed: result.status === 'confirmed'
        });
        setIsAnalyzing(false);
        return;
      }

      await saveConfirmedMeal(result, finalImageUrl, false);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      alert(`Failed to analyze meal: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveConfirmedMeal = async (result: any, finalImageUrl: string | null, isPinned: boolean) => {
    try {
      const mealData = {
        food_name: result.food_name || textInput || "Logged Meal",
        calories: result.macros?.cal || result.macros?.calories || 0,
        protein: result.macros?.p || result.macros?.protein || 0,
        carbs: result.macros?.c || result.macros?.carbs || 0,
        fat: result.macros?.f || result.macros?.fat || 0,
        sugar_g: result.macros?.sugar_g || result.macros?.sugar || 0,
        sodium_mg: result.macros?.sodium_mg || result.macros?.sodium || 0,
        health_score: result.health_score || 10,
        coach_tip: result.message || "Great job logging your meal!",
        status: result.status,
        clarification_required: null,
        reason: null,
        isPinned
      };
      
      if (editingLog) {
        // Update existing
        const updateData: any = {
          ...mealData,
          food_name: textInput || mealData.food_name,
        };
        if (finalImageUrl) {
          updateData.image_url = finalImageUrl;
        }
        await firebaseService.updateMealInFirebase(user!.uid, editingLog.id, updateData);
      } else {
        // Create new
        await firebaseService.saveMealToFirebase(user!.uid, {
          ...mealData,
          image_url: finalImageUrl || undefined
        }, result.status === 'confirmed');
      }

      setIsLogging(false);
      setEditingLog(null);
      setPendingAnalysis(null);
      setTextInput('');
      setSelectedImage(null);
      setImageMimeType(null);
    } catch (error: any) {
      console.error('Failed to save meal:', error);
      alert(`Failed to save meal: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const latestTip = todayLogs.length > 0 ? todayLogs[0].coach_tip : "Log your first meal to get personalized AI insights!";

  const handleUpdateSettings = async (settings: UserSettings) => {
    if (!user) return;
    await firebaseService.updateProfileSettings(user.uid, settings);
  };

  const handleLogFavorite = async (log: FoodLog) => {
    if (!user) return;
    
    // We can just save it directly as a new meal for today
    const mealData = {
      foodName: log.foodName,
      calories: log.macros.calories,
      protein: log.macros.protein,
      carbs: log.macros.carbs,
      fat: log.macros.fat,
      sugar_g: log.sugar_g || 0,
      sodium_mg: log.sodium_mg || 0,
      health_score: log.health_score || 0,
      coach_tip: "Logged from favorites! Stay consistent.",
      status: 'confirmed',
      clarification_required: null,
      reason: null,
      isPinned: true, // Keep it pinned
    };

    try {
      await firebaseService.saveMealToFirebase(user.uid, {
        ...mealData,
        image_url: log.image_url
      }, true);
      
      // Navigate back to dashboard to see the logged meal
      setSubPage('none');
      setActiveTab('dashboard');
    } catch (error: any) {
      console.error('Failed to log favorite meal:', error);
      alert(`Failed to log meal: ${error.message || 'Unknown error'}. Please try again.`);
    }
  };

  const handleToggleFavorite = async (logId: string, currentPinnedStatus: boolean) => {
    if (!user) return;
    try {
      const targetLog = logs.find(l => l.id === logId);
      if (!targetLog) return;
      
      const foodNameLower = (targetLog.foodName || '').toLowerCase();
      const matchingLogs = logs.filter(l => (l.foodName || '').toLowerCase() === foodNameLower);
      
      const updatePromises = matchingLogs.map(l => 
        firebaseService.updateMealInFirebase(user.uid, l.id, { isPinned: !currentPinnedStatus })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-8 border border-accent/20"
        >
          <Activity className="w-12 h-12 text-accent" />
        </motion.div>
        <h1 className="text-6xl md:text-8xl font-display uppercase leading-none mb-4 animate-slam">
          G-<span className="text-stroke">Refine</span>
        </h1>
        <p className="text-ink/60 mb-12 max-w-sm font-light tracking-wide uppercase text-xs">
          Refining oneself through better food choices.
        </p>
        <button
          onClick={handleLogin}
          className="vonas-button vonas-button-primary"
        >
          <LogIn className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg text-ink font-sans selection:bg-accent/30 flex justify-center">
      {/* Main container */}
      <div className="w-full h-[100dvh] flex flex-col md:flex-row relative bg-bg overflow-hidden">
        
        <BottomNav 
          activeTab={activeTab} 
          onChange={handleTabChange} 
          onSnapClick={() => {
            setEditingLog(null);
            setTextInput('');
            setSelectedImage(null);
            setIsLogging(true);
          }} 
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* App Header */}
          <header className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h1 className="text-xl font-display uppercase tracking-[0.2em] text-white">
              G-<span className="text-accent font-light">Refine</span>
            </h1>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsActivityModalOpen(true)}
              className="px-3 py-2 rounded-full bg-white/5 flex items-center gap-2 border border-white/10 transition-colors"
            >
              <Plus className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-display uppercase tracking-widest text-white">Activity</span>
            </motion.button>
          </header>

          <main ref={mainContentRef} className="flex-1 overflow-y-auto pb-24 md:pb-0 relative">
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user} 
                profile={profile} 
                logs={activeLogs} 
                activities={activities}
                onDeleteLog={handleDeleteLog} 
                onEditLog={handleEditLog} 
                onToggleFavorite={handleToggleFavorite}
                schedules={schedules}
              />
            )}
            {activeTab === 'history' && (
              <History 
                logs={activeLogs} 
                activities={activities}
                onEditLog={handleEditLog} 
                onDeleteLog={handleDeleteLog} 
                onEditActivity={handleEditActivity}
                onDeleteActivity={handleDeleteActivity}
                profile={profile} 
                onToggleFavorite={handleToggleFavorite}
                schedules={schedules}
                onSaveSchedule={(date, text) => {
                  if (user) {
                    firebaseService.saveSchedule(user.uid, date, text);
                  }
                }}
              />
            )}
            {activeTab === 'progress' && <Progress logs={activeLogs} profile={profile} activities={activities} />}
            
            {activeTab === 'menu' && subPage === 'none' && (
              <MenuScreen 
                userEmail={user?.email || ''}
                profile={profile}
                logs={activeLogs}
                onNavigate={setSubPage} 
                onLogout={handleLogout} 
                onUpdateSettings={handleUpdateSettings}
              />
            )}
            {activeTab === 'menu' && subPage === 'profile' && (
              <UserProfileScreen 
                user={user} 
                profile={profile} 
                onBack={() => setSubPage('none')} 
              />
            )}
            {activeTab === 'menu' && subPage === 'basic-info' && (
              <BasicInfoScreen 
                user={user} 
                profile={profile} 
                onBack={() => setSubPage('none')} 
              />
            )}
            {activeTab === 'menu' && subPage === 'app-info' && (
              <AppInfo onBack={() => setSubPage('none')} />
            )}
            {activeTab === 'menu' && subPage === 'favorites' && (
              <FavoritesScreen 
                logs={logs} 
                onBack={() => setSubPage('none')} 
                onLogFavorite={handleLogFavorite}
                onRemoveFavorites={handleRemoveFavorites}
                onEditLog={handleEditLog}
                onDeleteLog={handleDeleteLog}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
          </main>
        </div>

        {/* Logging Modal */}
        <AnimatePresence>
          {isLogging && (
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 bg-bg flex flex-col"
            >
              <AnimatePresence>
                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[100] bg-bg/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className="relative flex flex-col items-center justify-center mb-12">
                      {/* Food dropping */}
                      <motion.div
                        animate={{ y: [0, 15, 0], scale: [1, 0.9, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="z-10 relative"
                      >
                        <Apple className="w-16 h-16 text-accent drop-shadow-lg" fill="currentColor" />
                      </motion.div>
                      
                      {/* Scale Platform */}
                      <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="w-24 h-3 bg-white/80 rounded-t-lg mt-1 z-0 shadow-lg"
                      />
                      
                      {/* Scale Base */}
                      <div className="w-32 h-16 bg-white/10 backdrop-blur-md rounded-b-2xl flex items-center justify-center relative overflow-hidden border border-white/20 shadow-2xl">
                        {/* Dial */}
                        <div className="w-10 h-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/5">
                          <motion.div
                            animate={{ rotate: [-45, 135, -45] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="w-1 h-5 bg-accent origin-bottom -mt-4 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                    <h3 className="text-2xl font-display uppercase tracking-widest text-white mb-3 drop-shadow-md">Weighing Macros</h3>
                    <p className="text-sm font-display uppercase tracking-widest text-white/60 animate-pulse">Analyzing nutritional data...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5 max-w-2xl mx-auto w-full">
                <h2 className="text-2xl font-display uppercase text-white">{editingLog ? 'Edit Meal' : 'Log Meal'}</h2>
                <button 
                  onClick={() => {
                    setIsLogging(false);
                    setEditingLog(null);
                  }}
                  className="p-2 bg-white/5 rounded-full text-ink/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 relative max-w-2xl mx-auto w-full">
                
                {pendingAnalysis ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col gap-6"
                  >
                    <div className="vonas-card border-notify/30 bg-notify/5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-notify/10 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-notify" />
                        </div>
                        <h3 className="text-sm font-display uppercase tracking-widest text-notify">
                          {pendingAnalysis.isConfirmed ? "AI Coach Insight" : "AI Coach Question"}
                        </h3>
                      </div>
                      <p className="text-lg font-display uppercase leading-tight text-white mb-2">
                        {pendingAnalysis.clarification_required}
                      </p>
                      <p className="text-[10px] font-display uppercase tracking-widest text-white/40 italic">
                        Reason: {pendingAnalysis.reason}
                      </p>
                    </div>

                    {pendingAnalysis.isConfirmed ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="vonas-card bg-white/5 p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-display text-accent">{pendingAnalysis.data.macros?.cal || pendingAnalysis.data.macros?.calories || 0}</span>
                            <span className="text-[10px] font-display uppercase tracking-widest text-ink/40">Calories</span>
                          </div>
                          <div className="vonas-card bg-white/5 p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-display text-white">{pendingAnalysis.data.macros?.p || pendingAnalysis.data.macros?.protein || 0}g</span>
                            <span className="text-[10px] font-display uppercase tracking-widest text-ink/40">Protein</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-6">
                          {pendingAnalysis.quick_options?.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const isPinned = option.includes("Favorite");
                                saveConfirmedMeal(pendingAnalysis.data, pendingAnalysis.data.finalImageUrl, isPinned);
                              }}
                              className={cn(
                                "w-full py-4 rounded-2xl text-sm font-display uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
                                option.includes("Favorite") 
                                  ? "bg-accent text-bg hover:bg-accent/90" 
                                  : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingAnalysis.quick_options && pendingAnalysis.quick_options.length > 0 && (
                          <div className="flex flex-col gap-2 mb-4">
                            <label className="text-[10px] font-display uppercase tracking-widest text-ink/40">Quick Answers</label>
                            {pendingAnalysis.quick_options.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => performAnalysis(option)}
                                className="w-full text-left px-5 py-4 bg-white/5 hover:bg-accent/10 border border-white/10 hover:border-accent/50 rounded-2xl text-sm font-display uppercase tracking-wider text-white transition-all duration-300 flex items-center justify-between group"
                              >
                                <span>{option}</span>
                                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-accent transition-colors" />
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <label className="text-[10px] font-display uppercase tracking-widest text-ink/40">Or type your answer</label>
                        <textarea 
                          autoFocus
                          placeholder="e.g., It was grilled dry, no oil used."
                          className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder:text-ink/20 focus:outline-none focus:border-accent resize-none transition-all font-light"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              performAnalysis((e.target as HTMLTextAreaElement).value);
                            }
                          }}
                        />
                      </div>
                    )}

                    {!pendingAnalysis.isConfirmed && (
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setPendingAnalysis(null)}
                          className="vonas-button flex-1 py-4 text-white/40 hover:text-white"
                        >
                          Back
                        </button>
                        <button 
                          onClick={() => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) performAnalysis(textarea.value);
                          }}
                          className="vonas-button vonas-button-primary flex-[2] py-4"
                        >
                          Confirm Details
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {/* Image Upload Area */}
                    <div 
                      onClick={() => handleImageSelect()}
                      className={cn(
                        "relative w-full aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all duration-500",
                        selectedImage ? "border-accent/50 bg-white/5" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      {selectedImage ? (
                        <>
                          <img src={selectedImage} alt="Selected meal" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
                          <div className="relative z-10 flex items-center gap-2 bg-bg/80 px-6 py-3 rounded-full backdrop-blur-xl border border-white/10">
                            <ImageIcon className="w-4 h-4 text-accent" />
                            <span className="text-xs font-display uppercase tracking-wider">Change Photo</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                            <CameraIcon className="w-8 h-8 text-ink/40" />
                          </div>
                          <p className="text-xs font-display uppercase tracking-widest text-white">Tap to snap</p>
                          <p className="text-[10px] text-ink/40 mt-2 uppercase tracking-tighter">Or upload from gallery</p>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => handleImageSelect(e)}
                      />
                    </div>

                    {/* Natural Language Input */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-display uppercase tracking-widest text-ink/40">
                        {editingLog ? 'Update description' : 'Describe your meal'}
                      </label>
                      <textarea 
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="e.g., Two poached eggs on sourdough toast with avocado..."
                        className="w-full h-40 bg-white/5 border border-white/10 rounded-2xl p-5 text-white placeholder:text-ink/20 focus:outline-none focus:border-accent resize-none transition-all font-light"
                      />
                    </div>

                    <div className="mt-auto pt-6 pb-safe flex flex-col gap-3">
                      <button 
                        onClick={() => performAnalysis()}
                        disabled={isAnalyzing || (!textInput && !selectedImage && !editingLog)}
                        className="vonas-button vonas-button-primary w-full py-5"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyzing with AI...</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-5 h-5" />
                            <span>{editingLog ? 'Update & Re-analyze' : 'Analyze & Log'}</span>
                          </>
                        )}
                      </button>
                      
                      {!editingLog && (
                        <button 
                          onClick={() => {
                            setIsLogging(false);
                            setActiveTab('menu');
                            setSubPage('favorites');
                          }}
                          className="vonas-button w-full py-5 bg-white/5 text-white hover:bg-white/10 border border-white/10"
                        >
                          <Star className="w-5 h-5 text-accent" />
                          <span>Choose from Favorites</span>
                        </button>
                      )}
                    </div>
                  </>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm Modal */}
        <ConfirmModal 
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />

        {/* Activity Modal */}
        <ActivityModal 
          isOpen={isActivityModalOpen}
          onClose={() => {
            setIsActivityModalOpen(false);
            setEditingActivity(null);
          }}
          profile={profile}
          editingActivity={editingActivity}
          onSave={async (activity) => {
            if (user) {
              if (editingActivity) {
                await firebaseService.updateActivityToFirebase(user.uid, editingActivity.id, activity);
              } else {
                await firebaseService.saveActivityToFirebase(user.uid, activity);
              }
              setEditingActivity(null);
            }
          }}
        />
      </div>
    </div>
  );
}
