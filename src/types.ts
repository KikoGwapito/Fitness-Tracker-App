export interface FoodLog {
  id: string;
  userId: string;
  timestamp: number;
  foodName: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  sugar_g: number;
  sodium_mg: number;
  health_score: number;
  coach_tip: string;
  image_url?: string;
  isValidated: boolean;
  status?: 'pending_validation' | 'confirmed';
  clarification_required?: string;
  reason?: string;
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
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light';
}

export interface UserProfile {
  email: string;
  name?: string;
  username?: string;
  profile_picture?: string;
  age?: number;
  gender?: 'male' | 'female';
  weight_kg?: number;
  height_cm?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose' | 'maintain' | 'gain';
  daily_goals: DailyGoals;
  bmr?: number;
  created_at: number;
  settings?: UserSettings;
}
