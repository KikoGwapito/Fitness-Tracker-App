import { useEffect } from 'react';
import { FoodLog, DailyGoals, UserProfile } from '../types';
import { format, addDays } from 'date-fns';
import { useHolidays } from './useHolidays';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_STATE_KEY = 'vonas_notification_state';

interface NotificationState {
  date: string;
  macrosExceeded: string[];
  endOfDayWarning: boolean;
  todayEvents: boolean;
  upcomingEvents: boolean;
}

export function useNotifications(
  logs: FoodLog[],
  profile: UserProfile | null,
  schedules: Record<string, string>
) {
  const { holidays } = useHolidays(profile?.country, new Date().getFullYear());

  useEffect(() => {
    // Check permissions for Native or Web
    const checkPermissions = async () => {
      if (Capacitor.isNativePlatform()) {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
      } else {
        if (!('Notification' in window) || Notification.permission !== 'granted') return false;
      }
      return true;
    };

    const checkNotifications = async () => {
      const hasPermission = await checkPermissions();
      if (!hasPermission && !Capacitor.isNativePlatform()) return;

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const savedState = localStorage.getItem(NOTIFICATION_STATE_KEY);
      let state: NotificationState = savedState 
        ? JSON.parse(savedState) 
        : { date: todayStr, macrosExceeded: [], endOfDayWarning: false, todayEvents: false, upcomingEvents: false };

      if (state.date !== todayStr) {
        state = { date: todayStr, macrosExceeded: [], endOfDayWarning: false, todayEvents: false, upcomingEvents: false };
      }

      let stateChanged = false;

      const sendNotify = async (title: string, body: string, id: number) => {
        if (Capacitor.isNativePlatform()) {
          await LocalNotifications.schedule({
            notifications: [
              {
                title,
                body,
                id,
                schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1 second from now
                sound: null,
                attachments: null,
                actionTypeId: '',
                extra: null
              }
            ]
          });
        } else {
          if (Notification.permission !== 'granted') return;
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
              body,
              icon: '/vite.svg',
              badge: '/vite.svg'
            });
          }).catch(() => {
            new Notification(title, { body, icon: '/vite.svg' });
          });
        }
      };

      const todayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return format(logDate, 'yyyy-MM-dd') === todayStr;
      });

      const totals = todayLogs.reduce(
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
        calories: 2200, protein_g: 150, carbs_g: 250, fat_g: 70, sugar_g: 50, sodium_mg: 2300,
      };
      const goals = { ...defaultGoals, ...(profile?.daily_goals || {}) };

      // 1. Macros Exceeded
      const macroChecks = [
        { key: 'calories', name: 'Calories', limit: goals.calories, id: 101 },
        { key: 'protein_g', name: 'Protein', limit: goals.protein_g, id: 102 },
        { key: 'carbs_g', name: 'Carbs', limit: goals.carbs_g, id: 103 },
        { key: 'fat_g', name: 'Fat', limit: goals.fat_g, id: 104 },
        { key: 'sugar_g', name: 'Sugar', limit: goals.sugar_g, id: 105 },
        { key: 'sodium_mg', name: 'Sodium', limit: goals.sodium_mg, id: 106 },
      ];

      for (const macro of macroChecks) {
        if (totals[macro.key as keyof typeof totals] > macro.limit && !state.macrosExceeded.includes(macro.key)) {
          await sendNotify('Macro Limit Exceeded', `You have exceeded your daily limit for ${macro.name}.`, macro.id);
          state.macrosExceeded.push(macro.key);
          stateChanged = true;
        }
      }

      // 2. End of day warning (after 8 PM = 20:00)
      const currentHour = new Date().getHours();
      if (currentHour >= 20 && !state.endOfDayWarning) {
        const isUnderGoals = totals.calories < goals.calories * 0.8;
        if (isUnderGoals) {
          await sendNotify('End of Day Reminder', "You haven't hit your nutrition goals for today yet. Don't forget to log your evening meals!", 201);
          state.endOfDayWarning = true;
          stateChanged = true;
        }
      }

      // 3. Today's Events
      if (!state.todayEvents) {
        const todayHoliday = holidays.find(h => h.date === todayStr);
        const isBirthday = profile?.birthday && format(new Date(profile.birthday), 'MM-dd') === format(new Date(), 'MM-dd');
        const todaySchedule = schedules[todayStr];

        let eventTexts = [];
        if (isBirthday) eventTexts.push("Happy Birthday!");
        if (todayHoliday) eventTexts.push(`It's ${todayHoliday.name}.`);
        if (todaySchedule && todaySchedule.trim() !== '') eventTexts.push(`Schedule: ${todaySchedule}`);

        if (eventTexts.length > 0) {
          await sendNotify("Today's Occasions", eventTexts.join(' '), 301);
          state.todayEvents = true;
          stateChanged = true;
        }
      }

      // 4. Upcoming Events (Tomorrow)
      if (!state.upcomingEvents) {
        const tomorrow = addDays(new Date(), 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const tomorrowHoliday = holidays.find(h => h.date === tomorrowStr);
        const tomorrowBirthday = profile?.birthday && format(new Date(profile.birthday), 'MM-dd') === format(tomorrow, 'MM-dd');
        const tomorrowSchedule = schedules[tomorrowStr];

        let upcomingTexts = [];
        if (tomorrowBirthday) upcomingTexts.push("Your birthday is tomorrow!");
        if (tomorrowHoliday) upcomingTexts.push(`${tomorrowHoliday.name} is tomorrow.`);
        if (tomorrowSchedule && tomorrowSchedule.trim() !== '') upcomingTexts.push(`Schedule tomorrow: ${tomorrowSchedule}`);

        if (upcomingTexts.length > 0) {
          await sendNotify("Upcoming Occasions", upcomingTexts.join(' '), 401);
          state.upcomingEvents = true;
          stateChanged = true;
        }
      }

      if (stateChanged) {
        localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state));
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [logs, profile, schedules, holidays]);
}
