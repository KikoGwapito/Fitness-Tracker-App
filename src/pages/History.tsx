import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Flame, Beef, Pencil, Trash2, Droplets, Activity, ChevronDown, ChevronUp, AlertCircle, Star, CalendarHeart, Plus } from 'lucide-react';
import { FoodLog, DailyGoals, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MealDetailsModal } from '../components/MealDetailsModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { useHolidays } from '../lib/useHolidays';

import { ActivityDetailsModal } from '../components/ActivityDetailsModal';

interface HistoryProps {
  logs: FoodLog[];
  activities?: any[];
  onEditLog: (log: FoodLog) => void;
  onDeleteLog: (logId: string) => void;
  onEditActivity?: (activity: any) => void;
  onDeleteActivity?: (activityId: string) => void;
  profile: UserProfile | null;
  onToggleFavorite: (logId: string, currentPinnedStatus: boolean) => void;
  schedules?: Record<string, string>;
  onSaveSchedule?: (date: string, text: string) => void;
}

export function History({ logs, activities = [], onEditLog, onDeleteLog, onEditActivity, onDeleteActivity, profile, onToggleFavorite, schedules = {}, onSaveSchedule }: HistoryProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMealsOpen, setIsMealsOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<FoodLog | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => {
    if (selectedMeal) {
      const updatedMeal = logs.find(l => l.id === selectedMeal.id);
      if (updatedMeal) {
        setSelectedMeal(updatedMeal);
      } else {
        setSelectedMeal(null);
      }
    }
  }, [logs]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = monthStart;
  const endDate = monthEnd;

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const { holidays } = useHolidays(profile?.country, currentDate.getFullYear());

  const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

  const selectedLogs = logs.filter(log => isSameDay(new Date(log.timestamp), selectedDate));
  const selectedActivities = activities.filter(act => isSameDay(new Date(act.timestamp), selectedDate));

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
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-5xl mx-auto w-full">
      <header>
        <h1 className="text-5xl font-display uppercase leading-none mb-2 animate-slam">
          History <br /> <span className="text-stroke">Archive</span>
        </h1>
        <p className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-8">Review your past performance</p>
        
        <div className="flex items-end justify-between">
          <div>
            <button 
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setCurrentDate(today);
              }}
              className="text-3xl font-display uppercase leading-none text-accent hover:text-accent/80 transition-colors text-left"
            >
              {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
            </button>
            {(() => {
              const dayString = format(selectedDate, 'yyyy-MM-dd');
              const holiday = holidays.find(h => h.date === dayString);
              const isBirthday = profile?.birthday && format(new Date(profile.birthday), 'MM-dd') === format(selectedDate, 'MM-dd');
              const scheduleText = schedules[dayString];
              
              return (
                <div className="mt-2 space-y-1">
                  {isBirthday && (
                    <p className="text-pink-400 text-xs font-display uppercase tracking-widest flex items-center gap-1">
                      <CalendarHeart className="w-3 h-3" /> Happy Birthday!
                    </p>
                  )}
                  {(!isBirthday && holiday) && (
                    <p className="text-blue-400 text-xs font-display uppercase tracking-widest">
                      {holiday.name}
                    </p>
                  )}
                  {(scheduleText && scheduleText.trim() !== '') && (
                    <p className="text-violet-400 text-xs font-display uppercase tracking-widest flex items-center gap-1">
                      <CalendarHeart className="w-3 h-3" /> {scheduleText}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
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
            const dayString = format(day, 'yyyy-MM-dd');
            const holiday = holidays.find(h => h.date === dayString);
            const isBirthday = profile?.birthday && format(new Date(profile.birthday), 'MM-dd') === format(day, 'MM-dd');
            const scheduleText = schedules[dayString];
            const hasSchedule = !!scheduleText && scheduleText.trim() !== '';

            const activeRings = [
              hasSchedule && { color: "border-violet-500/60", text: "text-violet-400" },
              isBirthday && { color: "border-pink-500/60", text: "text-pink-400" },
              (!isBirthday && holiday) && { color: "border-blue-500/60", text: "text-blue-400" },
              isToday(day) && { color: "border-accent/40", text: "text-accent" }
            ].filter(Boolean) as { color: string, text: string }[];

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "aspect-square rounded-full flex items-center justify-center text-xs relative transition-all duration-300 font-display uppercase",
                  !isCurrentMonth && "text-white/10",
                  isCurrentMonth && !isSelected && (activeRings.length > 0 ? activeRings[0].text : "text-white/40 hover:bg-white/5"),
                  isSelected && "bg-accent text-bg scale-110"
                )}
              >
                <span className="relative z-10">{format(day, 'd')}</span>
                
                {!isSelected && activeRings.map((ring, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "absolute rounded-full border pointer-events-none transition-all duration-300",
                      ring.color,
                      idx === 0 ? "inset-0" : idx === 1 ? "-inset-[3px]" : idx === 2 ? "-inset-[6px]" : "-inset-[9px]"
                    )} 
                  />
                ))}

                {status !== 'none' && !isSelected && (
                  <div className={cn(
                    "absolute bottom-1 w-1 h-1 rounded-full",
                    status === 'good' ? "bg-accent" : status === 'high' ? "bg-danger" : "bg-blue-500"
                  )} />
                )}
                {isBirthday && isSelected && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
                )}
                {isSelected && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsScheduleModalOpen(true);
                    }}
                    className="absolute -top-2 -right-2 bg-bg border border-white/20 text-accent rounded-full p-1 shadow-lg z-10 hover:bg-white/10 transition-colors"
                  >
                    {hasSchedule ? <Pencil className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Summary */}
      <div className="space-y-8">
        <div className="flex items-end justify-between">
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
                    <div 
                      key={log.id} 
                      className="vonas-card group cursor-pointer"
                      onClick={() => setSelectedMeal(log)}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden relative">
                          {log.image_url ? (
                            <img src={log.image_url} alt="Meal" className="w-full h-full object-cover" />
                          ) : (
                            <Beef className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-display uppercase tracking-wider truncate mb-1">{log.food_name}</h3>
                          <div className="flex items-center gap-3 text-[10px] font-display uppercase tracking-widest text-white/40">
                            <span className="text-accent">{log.macros.calories} kcal</span>
                            <span>{format(new Date(log.timestamp), 'h:mm a')}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-display uppercase tracking-widest text-white/40 mb-1">Health</div>
                          <div className={cn(
                            "text-xs font-display px-2 py-1 rounded-md inline-block",
                            log.health_score >= 8 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                            log.health_score >= 5 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            "bg-danger/10 text-danger border border-danger/20"
                          )}>
                            {log.health_score}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-white/5">
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(log.id, !!log.isPinned); }}
                          className={cn(
                            "flex items-center gap-2 text-[10px] font-display uppercase tracking-widest transition-colors",
                            log.isPinned ? "text-accent" : "text-white/40"
                          )}
                        >
                          <Star className={cn("w-3 h-3", log.isPinned && "fill-accent")} /> {log.isPinned ? "Favorited" : "Favorite"}
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); onEditLog(log); }}
                          className="flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-white/40 transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); onDeleteLog(log.id); }}
                          className="flex items-center gap-2 text-[10px] font-display uppercase tracking-widest text-white/40 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </motion.button>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapsible Activities List */}
        <div className="space-y-4">
          <button 
            onClick={() => setIsActivitiesOpen(!isActivitiesOpen)}
            className="vonas-card w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                <Activity className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" />
              </div>
              <span className="text-sm font-display uppercase tracking-widest">Activities ({selectedActivities.length})</span>
            </div>
            {isActivitiesOpen ? <ChevronUp className="w-5 h-5 text-white/20" /> : <ChevronDown className="w-5 h-5 text-white/20" />}
          </button>

          <AnimatePresence>
            {isActivitiesOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                {selectedActivities.length === 0 ? (
                  <div className="text-center py-12 vonas-card border-dashed">
                    <p className="text-white/20 text-[10px] font-display uppercase tracking-widest">No activities logged</p>
                  </div>
                ) : (
                  selectedActivities.map(act => (
                    <div 
                      key={act.id} 
                      className="vonas-card cursor-pointer hover:border-white/20 transition-colors"
                      onClick={() => setSelectedActivity(act)}
                    >
                      <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Activity className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-display uppercase tracking-wider truncate mb-1">{act.activity_name || act.activityName}</h3>
                          <div className="flex items-center gap-3 text-[10px] font-display uppercase tracking-widest text-white/40">
                            <span className="text-accent">{act.calories_burned} kcal burned</span>
                            <span>{act.duration_minutes} min</span>
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

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        selectedDate={selectedDate}
        scheduleText={schedules[format(selectedDate, 'yyyy-MM-dd')] || ''}
        onSaveSchedule={(text) => onSaveSchedule?.(format(selectedDate, 'yyyy-MM-dd'), text)}
      />

      <MealDetailsModal 
        log={selectedMeal} 
        onClose={() => setSelectedMeal(null)} 
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onToggleFavorite={onToggleFavorite}
      />

      <ActivityDetailsModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        onEditActivity={onEditActivity}
        onDeleteActivity={onDeleteActivity}
      />
    </div>
  );
}
