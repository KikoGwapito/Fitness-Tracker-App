import React from 'react';
import { Activity, Flame, Beef, Droplets, MessageSquare, Trash2, Edit2, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { MacroRing } from '../components/MacroRing';
import { FoodLog, DailyGoals, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';

interface DashboardProps {
  user: User;
  profile: UserProfile | null;
  logs: FoodLog[];
  onDeleteLog: (logId: string) => void;
  onEditLog: (log: FoodLog) => void;
  onToggleFavorite: (logId: string, currentPinnedStatus: boolean) => void;
}

export function Dashboard({ user, profile, logs, onDeleteLog, onEditLog, onToggleFavorite }: DashboardProps) {
  const todayLogs = logs.filter(log => {
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

  const defaultGoals: DailyGoals = {
    calories: 2200,
    protein_g: 150,
    carbs_g: 250,
    fat_g: 70,
    sugar_g: 50,
    sodium_mg: 2300,
  };

  const goals: DailyGoals = {
    ...defaultGoals,
    ...(profile?.daily_goals || {}),
  };

  const latestTip = todayLogs.length > 0 ? todayLogs[0].coach_tip : "Log your first meal to get personalized AI insights!";
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'there';

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 space-y-12 max-w-5xl mx-auto w-full">
      {/* Header */}
      <header className="pt-12 pb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-display uppercase tracking-[0.3em] text-accent mb-2">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-5xl font-display leading-none uppercase">
            Hello, <br /> <span className="text-stroke">{firstName}</span>
          </h1>
        </div>
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-xl">
          <Activity className="w-6 h-6 text-accent" />
        </div>
      </header>

      {/* Hero Stats - Full No Scroll Side */}
      <section className="space-y-8">
        <div className="relative flex flex-col items-center">
          <MacroRing 
            value={currentTotals.calories} 
            max={goals.calories} 
            color="var(--c-accent)" 
            label="Calories" 
            size={240} 
            strokeWidth={12}
          />
          <div className="mt-6 text-center">
            <div className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1">Remaining</div>
            <div className={cn(
              "text-4xl font-display uppercase",
              currentTotals.calories > goals.calories ? "text-danger" : "text-white"
            )}>
              {Math.max(0, goals.calories - currentTotals.calories)} <span className="text-sm opacity-40">kcal</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          <MacroRing 
            value={currentTotals.protein_g} 
            max={goals.protein_g} 
            color="#3b82f6" 
            label="Protein" 
            size={90} 
            strokeWidth={6}
          />
          <MacroRing 
            value={currentTotals.carbs_g} 
            max={goals.carbs_g} 
            color="#f59e0b" 
            label="Carbs" 
            size={90} 
            strokeWidth={6}
          />
          <MacroRing 
            value={currentTotals.fat_g} 
            max={goals.fat_g} 
            color="#8b5cf6" 
            label="Fat" 
            size={90} 
            strokeWidth={6}
          />
          <MacroRing 
            value={currentTotals.sugar_g} 
            max={goals.sugar_g} 
            color="#ec4899" 
            label="Sugar" 
            size={90} 
            strokeWidth={6}
          />
          <MacroRing 
            value={currentTotals.sodium_mg} 
            max={goals.sodium_mg} 
            color="#10b981" 
            label="Sodium" 
            size={90} 
            strokeWidth={6}
            unit="mg"
          />
        </div>

        {/* Daily Targets Summary */}
        <div className="vonas-card grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { label: 'Kcal', value: goals.calories, color: 'text-accent' },
            { label: 'Prot', value: goals.protein_g, color: 'text-blue-400' },
            { label: 'Carb', value: goals.carbs_g, color: 'text-amber-400' },
            { label: 'Fat', value: goals.fat_g, color: 'text-violet-400' },
            { label: 'Sug', value: goals.sugar_g, color: 'text-pink-400' },
            { label: 'Sod', value: goals.sodium_mg, color: 'text-emerald-400' },
          ].map((target) => (
            <div key={target.label} className="text-center group">
              <div className={cn("text-lg font-display", target.color)}>{target.value}</div>
              <div className="text-[8px] font-display uppercase tracking-widest text-white/20">{target.label}</div>
            </div>
          ))}
        </div>

      </section>

      {/* AI Coach Insight */}
      <section>
        <div className="vonas-card relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-info transition-all duration-500 group-hover:w-full group-hover:opacity-5"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <MessageSquare className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-2">AI Coach Insight</h3>
              <p className="text-sm text-white/80 leading-relaxed font-light italic">
                "{latestTip}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Logs */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display uppercase tracking-tight">Recent Meals</h2>
          <span className="text-[10px] font-display uppercase tracking-widest text-white/40">{todayLogs.length} logged</span>
        </div>
        
        {todayLogs.length === 0 ? (
          <div className="text-center py-16 vonas-card border-dashed">
            <p className="text-white/20 text-[10px] font-display uppercase tracking-widest">No meals logged today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayLogs.map(log => (
              <motion.div 
                key={log.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="vonas-card group"
              >
                <div className="flex gap-5 items-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative">
                    {log.image_url ? (
                      <img src={log.image_url} alt={log.foodName} className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <Beef className="w-6 h-6 text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-display uppercase break-words group-hover:text-accent transition-colors">{log.foodName}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] font-display uppercase tracking-wider text-white/40">
                      <span className="flex items-center gap-1.5"><Flame className="w-3 h-3 text-accent" /> {log.macros.calories}</span>
                      <span className="flex items-center gap-1.5"><Beef className="w-3 h-3 text-blue-400" /> {log.macros.protein}g</span>
                      <span className="flex items-center gap-1.5"><Droplets className="w-3 h-3 text-amber-400" /> {log.macros.carbs}g</span>
                      <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-violet-400" /> {log.macros.fat}g</span>
                      <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-pink-400" /> {log.sugar_g || 0}g</span>
                      <span className="flex items-center gap-1.5"><Activity className="w-3 h-3 text-emerald-400" /> {log.sodium_mg || 0}mg</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center">
                    <div className="text-[8px] font-display uppercase tracking-widest text-white/40 mb-1">Score</div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-display",
                      log.health_score >= 8 ? "bg-success/10 text-success border border-success/20" :
                      log.health_score >= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-danger/10 text-danger border border-danger/20"
                    )}>
                      {log.health_score}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onToggleFavorite(log.id, !!log.isPinned)}
                    className={cn(
                      "flex items-center gap-2 text-[10px] font-display uppercase tracking-widest transition-colors",
                      log.isPinned ? "text-accent hover:text-accent/80" : "text-white/40 hover:text-accent"
                    )}
                  >
                    <Star className={cn("w-3 h-3", log.isPinned && "fill-accent")} /> {log.isPinned ? "Favorited" : "Favorite"}
                  </button>
                  <button 
                    onClick={() => onEditLog(log)}
                    className="flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button 
                    onClick={() => onDeleteLog(log.id)}
                    className="flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-white/40 hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
