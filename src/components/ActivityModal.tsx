import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Flame, Clock, Send, Loader2, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeActivity } from '../lib/gemini';
import { UserProfile } from '../types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  editingActivity?: any;
  onSave: (activity: { activityName: string; duration_minutes: number; calories_burned: number; source: 'manual'; description?: string }) => Promise<void>;
}

export function ActivityModal({ isOpen, onClose, profile, editingActivity, onSave }: ActivityModalProps) {
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [pendingActivity, setPendingActivity] = useState<{activityName: string, duration_minutes: number, calories_burned: number, description?: string} | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingActivity) {
        setPendingActivity({
          activityName: editingActivity.activity_name || editingActivity.activityName,
          duration_minutes: editingActivity.duration_minutes,
          calories_burned: editingActivity.calories_burned,
          description: editingActivity.description
        });
        setChatHistory([{ role: 'ai', text: `Editing activity: ${editingActivity.activity_name || editingActivity.activityName}. You can update the details below.` }]);
      } else {
        setPendingActivity(null);
        setChatHistory([]);
      }
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      // Reset state when closed
      setDescription('');
      setChatHistory([]);
      setPendingActivity(null);
      setIsAnalyzing(false);
      setIsSaving(false);
    }
  }, [isOpen, editingActivity]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pendingActivity]);

  const handleAnalyze = async () => {
    if (!description.trim()) return;
    
    const userText = description.trim();
    setDescription('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeActivity(userText, profile, chatHistory);
      
      if (result.status === 'needs_clarification') {
        setChatHistory(prev => [...prev, { role: 'ai', text: result.question || "Could you provide more details?" }]);
      } else if (result.status === 'success') {
        setPendingActivity({
          activityName: result.activityName,
          duration_minutes: result.duration_minutes,
          calories_burned: result.calories_burned
        });
        setChatHistory(prev => [...prev, { role: 'ai', text: `I've calculated your activity: ${result.activityName} for ${result.duration_minutes} minutes burned approximately ${result.calories_burned} kcal.` }]);
      }
    } catch (error) {
      console.error('Failed to analyze activity:', error);
      setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I couldn't analyze that. Please try again." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!pendingActivity) return;
    
    setIsSaving(true);
    try {
      await onSave({
        ...pendingActivity,
        source: 'manual'
      });
      onClose();
    } catch (error) {
      console.error('Failed to save activity:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-bg border-t border-white/10 rounded-t-3xl p-6 pb-safe flex flex-col max-h-[90vh] h-[80vh]"
          >
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-accent" />
                </div>
                <h2 className="text-xl font-display uppercase tracking-wider text-white">AI Activity Coach</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {chatHistory.length === 0 && (
                <div className="text-center text-white/40 mt-10 text-sm font-light">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Describe your activity and I'll calculate the calories burned.</p>
                  <p className="mt-2 text-xs">"I ran 5km in 30 minutes"</p>
                  <p className="text-xs">"Did an intense hour of weightlifting"</p>
                </div>
              )}
              
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={cn(
                  "max-w-[85%] p-4 rounded-2xl text-sm font-light",
                  msg.role === 'user' 
                    ? "bg-accent/20 text-white ml-auto rounded-tr-sm" 
                    : "bg-white/5 text-white/80 mr-auto rounded-tl-sm"
                )}>
                  {msg.text}
                </div>
              ))}
              
              {isAnalyzing && (
                <div className="bg-white/5 text-white/80 mr-auto rounded-2xl rounded-tl-sm p-4 max-w-[85%] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                  <span className="text-sm font-light">Analyzing...</span>
                </div>
              )}
              
              {pendingActivity && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-accent/10 border border-accent/20 rounded-2xl p-4 mt-4"
                >
                  <h3 className="text-xs font-display uppercase tracking-widest text-accent mb-3">Activity Summary</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1">Activity</div>
                      <div className="text-sm text-white">{pendingActivity.activityName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</div>
                      <div className="text-sm text-white">{pendingActivity.duration_minutes} min</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1"><Flame className="w-3 h-3 text-accent" /> Burned</div>
                      <div className="text-2xl font-display text-accent">{pendingActivity.calories_burned} <span className="text-sm opacity-60">kcal</span></div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="vonas-button vonas-button-primary w-full py-3"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm & Save Activity'}
                  </button>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 pt-2">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }}
                className="relative"
              >
                <input 
                  ref={inputRef}
                  type="text" 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your activity..."
                  disabled={isAnalyzing || isSaving}
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-white focus:outline-none focus:border-accent transition-all font-light disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!description.trim() || isAnalyzing || isSaving}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-accent rounded-full flex items-center justify-center text-bg disabled:opacity-50 disabled:bg-white/10 disabled:text-white/40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
