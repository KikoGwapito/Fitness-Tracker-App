import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { FoodLog, UserProfile, DailyGoals } from '../types';
import { format, subDays, subWeeks, subMonths, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { CheckCircle2, AlertCircle, Info, TrendingUp, PieChart, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface ProgressProps {
  logs: FoodLog[];
  profile: UserProfile | null;
  activities?: any[];
}

export function Progress({ logs, profile, activities = [] }: ProgressProps) {
  const [view, setView] = useState<'daily' | 'weekly' | 'monthly' | 'annually'>('daily');

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

  const chartData = useMemo(() => {
    const now = new Date();
    
    if (view === 'daily') {
      // Last 7 days
      return Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(now, 6 - i);
        const dayLogs = logs.filter(log => isSameDay(new Date(log.timestamp), date));
        const dayActivities = activities.filter(act => isSameDay(new Date(act.timestamp), date));
        const burned = dayActivities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
        const consumed = dayLogs.reduce((sum, log) => sum + log.macros.calories, 0);
        return {
          name: format(date, 'EEE'),
          calories: Math.max(0, consumed - burned),
          protein: dayLogs.reduce((sum, log) => sum + log.macros.protein, 0),
          carbs: dayLogs.reduce((sum, log) => sum + log.macros.carbs, 0),
          fat: dayLogs.reduce((sum, log) => sum + log.macros.fat, 0),
          sugar: dayLogs.reduce((sum, log) => sum + (log.sugar_g || 0), 0),
          sodium: dayLogs.reduce((sum, log) => sum + (log.sodium_mg || 0), 0),
          burned,
          duration: dayActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0),
        };
      });
    } else if (view === 'weekly') {
      // Last 4 weeks
      return Array.from({ length: 4 }).map((_, i) => {
        const date = subWeeks(now, 3 - i);
        const weekLogs = logs.filter(log => isSameWeek(new Date(log.timestamp), date));
        const weekActivities = activities.filter(act => isSameWeek(new Date(act.timestamp), date));
        const burned = weekActivities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
        const consumed = weekLogs.reduce((sum, log) => sum + log.macros.calories, 0);
        return {
          name: `W${4 - i}`,
          calories: Math.max(0, Math.round((consumed - burned) / 7)),
          protein: Math.round(weekLogs.reduce((sum, log) => sum + log.macros.protein, 0) / 7),
          carbs: Math.round(weekLogs.reduce((sum, log) => sum + log.macros.carbs, 0) / 7),
          fat: Math.round(weekLogs.reduce((sum, log) => sum + log.macros.fat, 0) / 7),
          sugar: Math.round(weekLogs.reduce((sum, log) => sum + (log.sugar_g || 0), 0) / 7),
          sodium: Math.round(weekLogs.reduce((sum, log) => sum + (log.sodium_mg || 0), 0) / 7),
          burned: Math.round(burned / 7),
          duration: Math.round(weekActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / 7),
        };
      });
    } else if (view === 'monthly') {
      // Last 6 months
      return Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(now, 5 - i);
        const monthLogs = logs.filter(log => isSameMonth(new Date(log.timestamp), date));
        const monthActivities = activities.filter(act => isSameMonth(new Date(act.timestamp), date));
        const burned = monthActivities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
        const consumed = monthLogs.reduce((sum, log) => sum + log.macros.calories, 0);
        return {
          name: format(date, 'MMM'),
          calories: Math.max(0, Math.round((consumed - burned) / 30)),
          protein: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.protein, 0) / 30),
          carbs: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.carbs, 0) / 30),
          fat: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.fat, 0) / 30),
          sugar: Math.round(monthLogs.reduce((sum, log) => sum + (log.sugar_g || 0), 0) / 30),
          sodium: Math.round(monthLogs.reduce((sum, log) => sum + (log.sodium_mg || 0), 0) / 30),
          burned: Math.round(burned / 30),
          duration: Math.round(monthActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / 30),
        };
      });
    } else {
      // Annually (Last 12 months)
      return Array.from({ length: 12 }).map((_, i) => {
        const date = subMonths(now, 11 - i);
        const monthLogs = logs.filter(log => isSameMonth(new Date(log.timestamp), date));
        const monthActivities = activities.filter(act => isSameMonth(new Date(act.timestamp), date));
        const burned = monthActivities.reduce((sum, act) => sum + (act.calories_burned || 0), 0);
        const consumed = monthLogs.reduce((sum, log) => sum + log.macros.calories, 0);
        return {
          name: format(date, 'MMM'),
          calories: Math.max(0, Math.round((consumed - burned) / 30)),
          protein: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.protein, 0) / 30),
          carbs: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.carbs, 0) / 30),
          fat: Math.round(monthLogs.reduce((sum, log) => sum + log.macros.fat, 0) / 30),
          sugar: Math.round(monthLogs.reduce((sum, log) => sum + (log.sugar_g || 0), 0) / 30),
          sodium: Math.round(monthLogs.reduce((sum, log) => sum + (log.sodium_mg || 0), 0) / 30),
          burned: Math.round(burned / 30),
          duration: Math.round(monthActivities.reduce((sum, act) => sum + (act.duration_minutes || 0), 0) / 30),
        };
      });
    }
  }, [logs, view, activities]);

  const notifications = useMemo(() => {
    const today = new Date();
    const todayLogs = logs.filter(log => isSameDay(new Date(log.timestamp), today));
    const totals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.macros.calories,
        protein: acc.protein + log.macros.protein,
        carbs: acc.carbs + log.macros.carbs,
        fat: acc.fat + log.macros.fat,
        sugar: acc.sugar + (log.sugar_g || 0),
        sodium: acc.sodium + (log.sodium_mg || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0 }
    );

    const messages: { type: 'success' | 'warning' | 'info'; text: string }[] = [];

    if (totals.calories === 0) {
      messages.push({ type: 'info', text: "No meals logged today. Start tracking to see progress!" });
    } else if (totals.calories > goals.calories) {
      messages.push({ type: 'warning', text: `Calorie limit exceeded by ${totals.calories - goals.calories} kcal.` });
    } else if (totals.calories >= goals.calories * 0.9) {
      messages.push({ type: 'success', text: "Perfect! You've hit your daily calorie target." });
    }

    if (totals.sugar > goals.sugar_g) {
      messages.push({ type: 'warning', text: `Sugar alert! Exceeded limit by ${Math.round(totals.sugar - goals.sugar_g)}g.` });
    }
    if (totals.sodium > goals.sodium_mg) {
      messages.push({ type: 'warning', text: `Sodium alert! Exceeded limit by ${Math.round(totals.sodium - goals.sodium_mg)}mg.` });
    }

    return messages;
  }, [logs, goals]);

  return (
    <div className="flex-1 overflow-y-auto pb-32 px-6 pt-12 space-y-12 max-w-5xl mx-auto w-full">
      <header>
        <h1 className="text-5xl font-display uppercase leading-none mb-2 animate-slam">
          Progress <br /> <span className="text-stroke">Metrics</span>
        </h1>
        <p className="text-[10px] font-display uppercase tracking-widest text-white/40">Track your nutrition journey</p>
      </header>

      {/* Notifications */}
      <div className="space-y-3">
        {notifications.map((note, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-4 rounded-2xl border flex items-start gap-3",
              note.type === 'success' ? "bg-success/10 border-success/20 text-success" :
              note.type === 'warning' ? "bg-danger/10 border-danger/20 text-danger" :
              "bg-accent/10 border-accent/20 text-accent"
            )}
          >
            {note.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
             note.type === 'warning' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
             <Info className="w-4 h-4 shrink-0 mt-0.5" />}
            <p className="text-[10px] font-display uppercase tracking-wider leading-relaxed">{note.text}</p>
          </motion.div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10 overflow-x-auto hide-scrollbar">
        {['daily', 'weekly', 'monthly', 'annually'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as any)}
            className={cn(
              "flex-1 min-w-[80px] py-3 text-[10px] font-display uppercase tracking-widest rounded-xl transition-all duration-300",
              view === v ? "bg-accent text-bg shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Calorie Trend */}
      <div className="vonas-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm font-display uppercase tracking-widest text-white">Calorie Trend</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                itemStyle={{ color: 'var(--c-accent)', fontSize: '12px', fontFamily: 'Anton', textTransform: 'uppercase' }}
              />
              <Line 
                type="monotone" 
                dataKey="calories" 
                stroke="var(--c-accent)" 
                strokeWidth={3}
                dot={{ fill: 'var(--c-accent)', strokeWidth: 2, r: 4, stroke: '#0a0a0a' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Macro Distribution */}
      <div className="vonas-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <PieChart className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm font-display uppercase tracking-widest text-white">Macro Distribution</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="protein" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
              <Bar dataKey="carbs" stackId="a" fill="#f59e0b" />
              <Bar dataKey="fat" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="sugar" stackId="a" fill="#ec4899" />
              <Bar dataKey="sodium" stackId="a" fill="#10b981" />
              <Bar dataKey="calories" stackId="a" fill="var(--c-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 flex-wrap mt-8">
          {[
            { label: 'Protein', color: 'bg-blue-500' },
            { label: 'Carbs', color: 'bg-amber-500' },
            { label: 'Fat', color: 'bg-violet-500' },
            { label: 'Sugar', color: 'bg-pink-500' },
            { label: 'Sodium', color: 'bg-emerald-500' },
            { label: 'Calories', color: 'bg-accent' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 text-[8px] font-display uppercase tracking-widest text-white/40">
              <div className={cn("w-2 h-2 rounded-full", item.color)} /> {item.label}
            </div>
          ))}
        </div>
      </div>
      {/* Activity Trend */}
      <div className="vonas-card">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10">
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <h3 className="text-sm font-display uppercase tracking-widest text-white">Activity Trend</h3>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="rgba(255,255,255,0.2)" 
                fontSize={10} 
                fontFamily="Anton"
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-bg/90 border border-white/10 rounded-xl p-3 backdrop-blur-xl shadow-xl">
                        <p className="text-white font-display uppercase tracking-widest mb-2">{label}</p>
                        <div className="space-y-1">
                          <p className="text-accent text-xs font-display uppercase tracking-wider">
                            {data.burned} kcal burned
                          </p>
                          <p className="text-blue-400 text-xs font-display uppercase tracking-wider">
                            {data.duration} min duration
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="burned" name="Calories Burned" fill="var(--c-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 flex-wrap mt-8">
          <div className="flex items-center gap-2 text-[8px] font-display uppercase tracking-widest text-white/40">
            <div className="w-2 h-2 rounded-full bg-accent" /> Calories Burned
          </div>
        </div>
      </div>
    </div>
  );
}
