/** Firestore document: users/{uid}/settings/onboarding */
export interface OnboardingState {
  // Getting Started checklist
  completedSteps: Record<string, number>; // stepId -> completion timestamp
  skippedSteps: string[];
  guideCompleted: boolean;
  guideCompletedAt?: number;

  // Onboarding tour
  tourCompleted: boolean;

  // Advanced feature hints
  dismissedHints: string[];
  completedHints: string[];

  // Gamification
  discoveryCount: number;
  milestoneBadges: string[];
  petParentLevel: PetParentLevel;

  // Metadata
  savedAt: number;
  version: 1;
}

export type PetParentLevel =
  | 'curious-kitten'
  | 'savvy-sitter'
  | 'seasoned-companion'
  | 'pet-pro';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  auto: boolean;
  skippable: boolean;
  path: string;
  state?: Record<string, unknown>;
}

export interface FeatureHint {
  id: string;
  title: string;
  description: string;
  cta: string;
  to: string;
  category: HintCategory;
  accentClasses: string;
  prerequisite: string | null;
}

export type HintCategory =
  | 'pets'
  | 'cards'
  | 'services'
  | 'community'
  | 'messaging'
  | 'social'
  | 'family'
  | 'settings'
  | 'dashboard'
  | 'safety';
