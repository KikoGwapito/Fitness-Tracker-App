import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Beef, Pencil, Trash2, Droplets, Activity, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { FoodLog, DailyGoals, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HistoryProps {
  logs: FoodLog[];
  onEditLog: (log: FoodLog) => void;
  onDeleteLog: (logId: string) => void;
  profile: UserProfile | null;
}

export function History({ logs, onEditLog, onDeleteLog, profile }: HistoryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMealsOpen, setIsMealsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = monthStart;
  const endDate = monthEnd;

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  const selectedLogs = logs.filter(log => isSameDay(new Date(log.timestamp), selectedDate));

  const dailyTotals = selectedLogs.reduce(
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

  const goals: DailyGoals = profile?.daily_goals || {
    calories: 2200,
    protein_g: 150,
    carbs_g: 250,
    fat_g: 70,
    sugar_g: 50,
    sodium_mg: 2300,
  };

  const chartData = [
    { name: 'Calories', value: dailyTotals.calories, goal: goals.calories, unit: 'kcal', color: 'bg-accent' },
    { name: 'Protein', value: dailyTotals.protein_g, goal: goals.protein_g, unit: 'g', color: 'bg-blue-500' },
    { name: 'Carbs', value: dailyTotals.carbs_g, goal: goals.carbs_g, unit: 'g', color: 'bg-amber-500' },
    { name: 'Fat', value: dailyTotals.fat_g, goal: goals.fat_g, unit: 'g', color: 'bg-violet-500' },
    { name: 'Sugar', value: dailyTotals.sugar_g, goal: goals.sugar_g, unit: 'g', color: 'bg-pink-500' },
    { name: 'Sodium', value: dailyTotals.sodium_mg, goal: goals.sodium_mg, unit: 'mg', color: 'bg-emerald-500' },
  ];

  const getDayStatus = (day: Date) => {
    const dayLogs = logs.filter(log => isSameDay(new Date(log.timestamp), day));
    if (dayLogs.length === 0) return 'none';
    const totalCalories = dayLogs.reduce((sum, log) => sum + log.macros.calories, 0);
    if (totalCalories > goals.calories) return 'high';
    if (totalCalories > goals.calories * 0.7) return 'good';
    return 'low';
  };

  const isOverAny = chartData.some(d => d.value > d.goal);

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12">
      <header>
        <h1 className="text-5xl font-display uppercase leading-none mb-2 animate-slam">
          History <br /> <span className="text-stroke">Archive</span>
        </h1>
        <p className="text-[10px] font-display uppercase tracking-widest text-white/40">Review your past performance</p>
      </header>

      {/* Calendar */}
      <div className="vonas-card relative">
        <div className="flex justify-between items-center mb-8">
          <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="text-lg font-display uppercase tracking-widest text-white hover:text-accent transition-colors flex items-center gap-2"
            >
              {format(currentDate, dateFormat)}
              <ChevronDown className={cn("w-4 h-4 transition-transform", isPickerOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isPickerOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-bg/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50 w-64"
                >
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(i);
                          setCurrentDate(newDate);
                          setIsPickerOpen(false);
                        }}
                        className={cn(
                          "text-[10px] font-display uppercase py-2 rounded-lg transition-colors",
                          currentDate.getMonth() === i ? "bg-accent text-bg" : "hover:bg-white/5 text-white/40"
                        )}
                      >
                        {format(new Date(2024, i, 1), 'MMM')}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <button 
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(currentDate.getFullYear() - 1);
                        setCurrentDate(newDate);
                      }}
                      className="p-1 hover:bg-white/5 rounded-lg"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-display">{currentDate.getFullYear()}</span>
                    <button 
                      onClick={() => {
                        const newDate = new Date(currentDate);
                        newDate.setFullYear(currentDate.getFullYear() + 1);
                        setCurrentDate(newDate);
                      }}
                      className="p-1 hover:bg-white/5 rounded-lg"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-full text-white/40 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-[10px] font-display uppercase tracking-widest text-white/20 py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: startDate.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const status = getDayStatus(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center text-xs relative transition-all duration-300 font-display uppercase",
                  !isCurrentMonth && "text-white/10",
                  isCurrentMonth && !isSelected && "text-white/40 hover:bg-white/5",
                  isSelected && "bg-accent text-bg scale-110",
                  isToday(day) && !isSelected && "border border-accent/30 text-accent"
                )}
              >
                {format(day, 'd')}
                {status !== 'none' && !isSelected && (
                  <div className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    status === 'good' ? "bg-accent" : status === 'high' ? "bg-danger" : "bg-blue-500"
                  )} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary */}
      <div className="space-y-8">
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-display uppercase leading-none">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
          </h3>
          <div className="text-[10px] font-display uppercase tracking-widest text-white/40">Daily Performance</div>
        </div>

        {isOverAny && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-danger/10 border border-danger/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-danger" />
            <p className="text-xs font-display uppercase tracking-wider text-danger">Daily limit exceeded!</p>
          </motion.div>
        )}

        {/* Totals Graphs - Separated */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {chartData.map((data) => {
            const percent = Math.min(100, (data.value / data.goal) * 100);
            const isOver = data.value > data.goal;
            
            return (
              <div key={data.name} className="vonas-card space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1">{data.name}</p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-2xl font-display uppercase", isOver ? "text-danger" : "text-white")}>
                        {Math.round(data.value)}
                      </span>
                      <span className="text-[10px] font-display uppercase text-white/20">/ {data.goal}{data.unit}</span>
                    </div>
                  </div>
                  {isOver && (
                    <div className="px-2 py-0.5 bg-danger/10 border border-danger/20 rounded text-[8px] font-display uppercase text-danger animate-pulse">
                      Exceeded
                    </div>
                  )}
                </div>
                
                <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={cn(
                      "h-full rounded-full transition-colors duration-500",
                      isOver ? "bg-danger shadow-[0_0_10px_rgba(255,68,68,0.5)]" : data.color
                    )}
                  />
                  {/* Goal Marker */}
                  <div className="absolute top-0 right-0 h-full w-px bg-white/20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Collapsible Meal List */}
        <div className="space-y-4">
          <button 
            onClick={() => setIsMealsOpen(!isMealsOpen)}
            className="vonas-card w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <Beef className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" />
              </div>
              <span className="text-sm font-display uppercase tracking-widest">Meals ({selectedLogs.length})</span>
            </div>
            {isMealsOpen ? <ChevronUp className="w-5 h-5 text-white/20" /> : <ChevronDown className="w-5 h-5 text-white/20" />}
          </button>

          <AnimatePresence>
            {isMealsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                {selectedLogs.length === 0 ? (
                  <div className="text-center py-12 vonas-card border-dashed">
                    <p className="text-white/20 text-[10px] font-display uppercase tracking-widest">No meals logged</p>
                  </div>
                ) : (
                  selectedLogs.map(log => (
                    <div key={log.id} className="vonas-card group">
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative">
                          {log.image_url ? (
                            <img src={log.image_url} alt={log.foodName} className="w-full h-full object-cover opacity-60" />
                          ) : (
                            <Beef className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-display uppercase truncate group-hover:text-accent transition-colors">{log.foodName}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[8px] font-display uppercase tracking-wider text-white/40">
                            <span className="flex items-center gap-1"><Flame className="w-2.5 h-2.5 text-accent" /> {log.macros.calories}</span>
                            <span className="flex items-center gap-1"><Beef className="w-2.5 h-2.5 text-blue-400" /> {log.macros.protein}g</span>
                            <span className="flex items-center gap-1"><Droplets className="w-2.5 h-2.5 text-amber-400" /> {log.macros.carbs}g</span>
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-violet-400" /> {log.macros.fat}g</span>
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-pink-400" /> {log.sugar_g || 0}g</span>
                            <span className="flex items-center gap-1"><Activity className="w-2.5 h-2.5 text-emerald-400" /> {log.sodium_mg || 0}mg</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-between h-full gap-2">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-display",
                            log.health_score >= 8 ? "bg-success/10 text-success border border-success/20" :
                            log.health_score >= 5 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                            "bg-danger/10 text-danger border border-danger/20"
                          )}>
                            {log.health_score}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => onEditLog(log)}
                              className="p-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-lg transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => onDeleteLog(log.id)}
                              className="p-1.5 bg-danger/10 hover:bg-danger/20 text-danger/40 hover:text-danger rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
