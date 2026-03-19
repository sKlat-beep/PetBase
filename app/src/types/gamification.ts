export interface GamificationState {
  totalPoints: number;
  level: number;
  levelLabel: string;
  badges: Badge[];
  streaks: Streak[];
  history: PointEvent[];  // last 50 events
  lastDailyCheck: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: number;
}

export interface Streak {
  id: string;
  name: string;
  currentCount: number;
  bestCount: number;
  lastUpdated: number;
}

export interface PointEvent {
  action: string;
  points: number;
  timestamp: number;
  petId?: string;
}

export type PointAction =
  | 'add-pet' | 'upload-photo' | 'complete-profile'
  | 'create-card' | 'share-card'
  | 'log-medical' | 'join-group' | 'create-post' | 'send-friend-request'
  | 'complete-onboarding' | 'vaccine-streak' | 'daily-streak' | 'pet-anniversary';
