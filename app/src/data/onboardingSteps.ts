// MAINTAINER NOTE: When adding new features to PetBase, add a corresponding
// entry here. See planning docs "New Feature Categorization Process" for the
// basic vs. advanced decision rule.

import type { OnboardingStep } from '../types/onboarding';

export const STEPS: OnboardingStep[] = [
  {
    id: 'add-pet',
    label: 'Add your first pet',
    description: 'Create a profile for your furry companion.',
    auto: true,
    skippable: false,
    path: '/pets',
    state: { openAddModal: true },
  },
  {
    id: 'add-pet-photo',
    label: 'Give your pet a face',
    description: 'Upload a photo so your pet stands out.',
    auto: true,
    skippable: true,
    path: '/pets',
  },
  {
    id: 'log-health-record',
    label: 'Log a vaccine or vet visit',
    description: 'Track your pet\'s health history in one place.',
    auto: true,
    skippable: true,
    path: '/pets',
  },
  {
    id: 'create-qr-card',
    label: 'Create a QR pet card',
    description: 'Generate a shareable emergency or sitter card with a scannable QR code.',
    auto: false,
    skippable: true,
    path: '/pets?openCards=true',
  },
  {
    id: 'join-community',
    label: 'Join a community',
    description: 'Connect with other pet parents and find local meetups.',
    auto: false,
    skippable: true,
    path: '/community',
  },
  {
    id: 'discover-services',
    label: 'Find nearby pet services',
    description: 'Search for top-rated vets, groomers, and sitters near you.',
    auto: false,
    skippable: true,
    path: '/search',
  },
  {
    id: 'send-message',
    label: 'Send your first message',
    description: 'Chat privately with other pet parents you\'ve connected with.',
    auto: false,
    skippable: true,
    path: '/messages',
  },
  {
    id: 'setup-profile',
    label: 'Set up your profile',
    description: 'Add your display name and avatar to unlock local service matching.',
    auto: true,
    skippable: true,
    action: 'open-settings',
    section: 'section-profile',
  },
];

export const TOTAL_STEPS = STEPS.length;

// ── Step ID migration map ──────────────────────────────────────────────────
// Maps old step IDs (v1) → new step IDs (v2). Used by onboardingService to
// migrate existing user progress without losing completion state.
// If a value is null the old step is considered "done" (removed from the list).
export const STEP_ID_MIGRATION: Record<string, string | null> = {
  'add-medical-record': 'log-health-record',
  'create-card':        'create-qr-card',
  'find-services':      'discover-services',
  'complete-profile':   'setup-profile',
  'create-family':      null, // removed — mark as completed so progress is preserved
  'enable-notifications': null,
  'privacy-settings':   null,
};
