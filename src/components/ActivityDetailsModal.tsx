import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, Pencil, Trash2, Clock, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface ActivityDetailsModalProps {
  activity: any | null;
  onClose: () => void;
  onEditActivity?: (activity: any) => void;
  onDeleteActivity?: (activityId: string) => void;
}

export function ActivityDetailsModal({ activity, onClose, onEditActivity, onDeleteActivity }: ActivityDetailsModalProps) {
  if (!activity) return null;

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
          <div className="p-6 pt-8 space-y-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                  <Activity className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-2xl font-display uppercase leading-tight">{activity.activity_name}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="vonas-card p-4 flex flex-col items-center justify-center text-center gap-2">
                <Flame className="w-6 h-6 text-accent" />
                <div>
                  <div className="text-2xl font-display uppercase text-white">{activity.calories_burned}</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40">Calories Burned</div>
                </div>
              </div>
              <div className="vonas-card p-4 flex flex-col items-center justify-center text-center gap-2">
                <Clock className="w-6 h-6 text-blue-400" />
                <div>
                  <div className="text-2xl font-display uppercase text-white">{activity.duration_minutes}</div>
                  <div className="text-[10px] font-display uppercase tracking-widest text-white/40">Duration (min)</div>
                </div>
              </div>
            </div>

            {activity.description && (
              <div className="vonas-card p-4">
                <h3 className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-2">Description</h3>
                <p className="text-sm text-white/80 leading-relaxed">{activity.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/5">
              {onEditActivity && (
                <button 
                  onClick={() => {
                    onEditActivity(activity);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/80 hover:bg-white/10 hover:text-white font-display uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </button>
              )}
              {onDeleteActivity && (
                <button 
                  onClick={() => {
                    onDeleteActivity(activity.id);
                    onClose();
                  }}
                  className="flex-1 py-3 rounded-xl bg-danger/10 text-danger hover:bg-danger hover:text-bg font-display uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
