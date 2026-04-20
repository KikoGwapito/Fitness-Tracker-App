export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  username?: string;
  photoUrl?: string;
  profile_picture?: string;
  createdAt: number;
  age?: number;
  gender?: string;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: string;
  goal?: string;
  daily_goals?: DailyGoals;
  settings?: UserSettings;
  country?: string;
  language?: string;
  birthday?: string;
  tour_completed?: boolean;
}

export interface DailyGoals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface UserSettings {
  notifications?: boolean;
  theme: 'dark' | 'light' | 'system';
  accentColor?: string;
  fontSize?: string;
  fontFamily?: string;
}

export interface FoodLog {
  id: string;
  userId: string;
  foodName: string;
  timestamp: any;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  sugar_g?: number;
  sodium_mg?: number;
  health_score?: number;
  coach_tip?: string;
  status?: 'pending' | 'confirmed' | 'error';
  clarification_required?: string;
  reason?: string;
  image_url?: string;
  isValidated?: boolean;
  isPinned?: boolean;
  deletedFromLogs?: boolean;
}

export interface Schedule {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: number;
}
