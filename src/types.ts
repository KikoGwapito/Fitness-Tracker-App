export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  photoUrl?: string;
  createdAt: number;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdBy: string;
  creatorName?: string;
  createdAt: number;
}
