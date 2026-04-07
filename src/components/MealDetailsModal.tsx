import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Droplets, Beef, Apple, Star, Activity, Pencil, Trash2 } from 'lucide-react';
import { FoodLog } from '../types';
import { cn } from '../lib/utils';

interface MealDetailsModalProps {
  log: FoodLog | null;
  onClose: () => void;
  onEditLog?: (log: FoodLog) => void;
  onDeleteLog?: (logId: string) => void;
  onToggleFavorite?: (logId: string, currentPinnedStatus: boolean) => void;
}

export function MealDetailsModal({ log, onClose, onEditLog, onDeleteLog, onToggleFavorite }: MealDetailsModalProps) {
  if (!log) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-bg border border-white/10 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {log.image_url && (
            <div className="w-full h-48 relative shrink-0">
              <img src={log.image_url} alt={log.foodName} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
            </div>
          )}
          
          <div className={cn("p-6 space-y-6", !log.image_url && "pt-8")}>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-display uppercase leading-tight">{log.foodName}</h2>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/40 font-display uppercase tracking-widest">
                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {log.isPinned && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-accent"><Star className="w-3 h-3 fill-accent" /> Favorite</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {onToggleFavorite && (
                  <button 
                    onClick={() => onToggleFavorite(log.id, !!log.isPinned)}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      log.isPinned ? "bg-accent/10 text-accent hover:bg-accent/20" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-accent"
                    )}
                  >
                    <Star className={cn("w-4 h-4", log.isPinned && "fill-accent")} />
                  </button>
                )}
                {onEditLog && (
                  <button 
                    onClick={() => {
                      onEditLog(log);
                      onClose();
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {onDeleteLog && (
                  <button 
                    onClick={() => {
                      onDeleteLog(log.id);
                      onClose();
                    }}
                    className="p-2 bg-danger/10 hover:bg-danger/20 text-danger/40 hover:text-danger rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-display truncate">{log.macros.calories}</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Calories</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Beef className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-display truncate">{log.macros.protein}g</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Protein</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Apple className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-display truncate">{log.macros.carbs}g</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Carbs</div>
                </div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-display truncate">{log.macros.fat}g</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Fat</div>
                </div>
              </div>
              
              {log.sugar_g !== undefined && (
                <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-display truncate">{log.sugar_g}g</div>
                    <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Sugar</div>
                  </div>
                </div>
              )}
              
              {log.sodium_mg !== undefined && (
                <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-display truncate">{log.sodium_mg}mg</div>
                    <div className="text-[10px] font-display uppercase tracking-widest text-white/40 truncate">Sodium</div>
                  </div>
                </div>
              )}
            </div>

            {log.coach_tip && (
              <div className="bg-accent/10 border border-accent/20 rounded-2xl p-4">
                <div className="text-[10px] font-display uppercase tracking-widest text-accent mb-2">AI Insight</div>
                <p className="text-sm text-white/80 leading-relaxed">{log.coach_tip}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
