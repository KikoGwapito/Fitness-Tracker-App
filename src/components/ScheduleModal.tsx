import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CalendarClock, Eraser, Undo2 } from 'lucide-react';
import { format, isToday } from 'date-fns';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  scheduleText: string;
  onSaveSchedule: (text: string) => void;
}

export function ScheduleModal({
  isOpen,
  onClose,
  selectedDate,
  scheduleText,
  onSaveSchedule
}: ScheduleModalProps) {
  const [scheduleInput, setScheduleInput] = useState(scheduleText);
  const [clearedText, setClearedText] = useState<string | null>(null);

  useEffect(() => {
    setScheduleInput(scheduleText);
    setClearedText(null);
  }, [scheduleText, isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (scheduleInput.trim()) {
      setClearedText(scheduleInput);
      setScheduleInput('');
    }
  };

  const handleUndo = () => {
    if (clearedText !== null) {
      setScheduleInput(clearedText);
      setClearedText(null);
    }
  };

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
          className="bg-bg border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-bg/95 backdrop-blur-xl border-b border-white/10 p-6 flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-display uppercase leading-none text-accent">
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
              </h3>
              <p className="text-[10px] font-display uppercase tracking-widest text-white/40 mt-2 flex items-center gap-1">
                <CalendarClock className="w-3 h-3" /> Schedule & Notes
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="relative">
              <textarea
                value={scheduleInput}
                onChange={(e) => {
                  setScheduleInput(e.target.value);
                  if (clearedText !== null) setClearedText(null); // Hide undo if they start typing
                }}
                placeholder="Add a schedule or note for this day..."
                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent resize-none transition-all font-light"
                autoFocus
              />
              {scheduleInput.trim() && (
                <button
                  onClick={handleClear}
                  className="absolute top-3 right-3 p-1.5 bg-bg/50 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-colors backdrop-blur-sm"
                  title="Clear text"
                >
                  <Eraser className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                {clearedText !== null && (
                  <button
                    onClick={handleUndo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display uppercase tracking-wider text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" /> Undo Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={onClose}
                  className="px-4 py-3 rounded-xl text-xs font-display uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onSaveSchedule(scheduleInput);
                    onClose();
                  }}
                  className="px-6 py-3 rounded-xl text-xs font-display uppercase tracking-wider bg-accent text-bg hover:bg-accent/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
