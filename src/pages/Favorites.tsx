import React, { useState, useRef, useMemo } from 'react';
import { ChevronLeft, Star, Plus, Flame, Beef, Droplets, Activity, Trash2, CheckSquare, Square, Search } from 'lucide-react';
import { FoodLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ConfirmModal } from '../components/ConfirmModal';
import { MealDetailsModal } from '../components/MealDetailsModal';

interface FavoritesProps {
  logs: FoodLog[];
  onBack: () => void;
  onLogFavorite: (log: FoodLog) => void;
  onRemoveFavorites: (foodNames: string[]) => void;
  onEditLog: (log: FoodLog) => void;
  onDeleteLog: (logId: string) => void;
  onToggleFavorite: (logId: string, currentPinnedStatus: boolean) => void;
}

export function FavoritesScreen({ logs, onBack, onLogFavorite, onRemoveFavorites, onEditLog, onDeleteLog, onToggleFavorite }: FavoritesProps) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealLog, setSelectedMealLog] = useState<FoodLog | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const pinnedLogs = logs.filter(log => log.isPinned);
  
  const uniquePinnedLogs = Array.from(
    new Map(pinnedLogs.map(log => [(log.foodName || '').toLowerCase(), log])).values()
  );

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return uniquePinnedLogs;
    const query = searchQuery.toLowerCase();
    return uniquePinnedLogs.filter(log => 
      (log.foodName || '').toLowerCase().includes(query)
    );
  }, [uniquePinnedLogs, searchQuery]);

  const handlePressStart = (foodName: string) => {
    if (selectionMode) return;
    timerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedMeals([foodName]);
    }, 500);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const toggleSelection = (foodName: string) => {
    setSelectedMeals(prev => 
      prev.includes(foodName) ? prev.filter(n => n !== foodName) : [...prev, foodName]
    );
  };

  const handleDeleteSelected = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Favorites',
      message: `Are you sure you want to remove ${selectedMeals.length} meal(s) from favorites?`,
      onConfirm: () => {
        onRemoveFavorites(selectedMeals);
        setSelectionMode(false);
        setSelectedMeals([]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteSingle = (foodName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Favorite',
      message: `Are you sure you want to remove ${foodName} from favorites?`,
      onConfirm: () => {
        onRemoveFavorites([foodName]);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-8 max-w-5xl mx-auto w-full">
      <header className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-display uppercase tracking-tight text-white leading-none">Favorites</h1>
          </div>
        </div>
        
        {uniquePinnedLogs.length > 0 && (
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-white/40" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search favorites..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        )}
      </header>

      {uniquePinnedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
          <Star className="w-12 h-12 mb-4" />
          <p className="font-display uppercase tracking-widest text-sm">No favorites yet</p>
          <p className="text-xs font-light mt-2">Pin meals after logging them to see them here.</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
          <Search className="w-12 h-12 mb-4" />
          <p className="font-display uppercase tracking-widest text-sm">No results found</p>
          <p className="text-xs font-light mt-2">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const foodName = (log.foodName || '');
            const foodNameLower = foodName.toLowerCase();
            const isSelected = selectedMeals.includes(foodNameLower);

            return (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onPointerDown={() => handlePressStart(foodNameLower)}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (selectionMode) {
                    toggleSelection(foodNameLower);
                  } else {
                    setSelectedMealLog(log);
                  }
                }}
                className={cn(
                  "vonas-card p-5 flex items-center justify-between group gap-4 select-none transition-colors cursor-pointer",
                  selectionMode && isSelected ? "border-accent bg-accent/5" : ""
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {selectionMode && (
                    <div className="flex-shrink-0">
                      {isSelected ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-white/40" />}
                    </div>
                  )}
                  {log.image_url ? (
                    <img src={log.image_url} alt={foodName} className="w-16 h-16 rounded-xl object-cover border border-white/10 flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Star className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display uppercase tracking-wider text-white mb-2 truncate">{foodName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-display uppercase tracking-widest text-white/40">
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-accent" /> {log.macros.calories}</span>
                      <span className="flex items-center gap-1"><Beef className="w-3 h-3 text-blue-400" /> {log.macros.protein}g</span>
                      <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-amber-400" /> {log.macros.carbs}g</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-violet-400" /> {log.macros.fat}g</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-pink-400" /> {log.sugar_g || 0}g</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> {log.sodium_mg || 0}mg</span>
                    </div>
                  </div>
                </div>
                
                {!selectionMode && (
                  <div className="flex flex-col items-end justify-between h-full gap-2 flex-shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-display",
                      log.health_score >= 8 ? "bg-success/10 text-success border border-success/20" :
                      log.health_score >= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-danger/10 text-danger border border-danger/20"
                    )}>
                      {log.health_score}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSingle(foodNameLower); }}
                        className="w-8 h-8 rounded-full bg-danger/10 text-danger flex items-center justify-center border border-danger/20 hover:bg-danger hover:text-bg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onLogFavorite(log); }}
                        className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center border border-accent/20 hover:bg-accent hover:text-bg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectionMode && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 bg-bg/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center justify-between z-50 shadow-2xl"
          >
            <span className="text-sm font-display uppercase tracking-widest">{selectedMeals.length} Selected</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { setSelectionMode(false); setSelectedMeals([]); }}
                className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white text-xs font-display uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteSelected}
                disabled={selectedMeals.length === 0}
                className="px-4 py-2 rounded-xl bg-danger text-bg hover:bg-danger/90 text-xs font-display uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        variant="danger"
      />

      <MealDetailsModal 
        log={selectedMealLog} 
        onClose={() => setSelectedMealLog(null)} 
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
