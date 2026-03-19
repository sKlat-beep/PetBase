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
    label: 'Upload a pet photo',
    description: 'Give your pet a face — upload an avatar or photo.',
    auto: true,
    skippable: true,
    path: '/pets',
  },
  {
    id: 'add-medical-record',
    label: 'Log a vaccine or vet visit',
    description: 'Track your pet\'s health history in one place.',
    auto: true,
    skippable: true,
    path: '/pets',
  },
  {
    id: 'create-card',
    label: 'Create a pet card',
    description: 'Generate an emergency or sitter card for your pet.',
    auto: false,
    skippable: true,
    path: '/pets?openCards=true',
  },
  {
    id: 'find-services',
    label: 'Find nearby services',
    description: 'Search for top-rated vets, groomers, and sitters near you.',
    auto: false,
    skippable: true,
    path: '/search',
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
    id: 'complete-profile',
    label: 'Complete your profile',
    description: 'Add your address and avatar to unlock local service matching.',
    auto: true,
    skippable: true,
    path: '/settings',
  },
  {
    id: 'create-family',
    label: 'Create or join a family',
    description: 'Invite family members to co-manage your pets.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-family' },
  },
  {
    id: 'enable-notifications',
    label: 'Stay in the loop',
    description: 'Enable email or push notifications in Settings → Notifications.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-notifications' },
  },
  {
    id: 'privacy-settings',
    label: 'Control your privacy',
    description: 'Control who can message you or invite you to groups in Settings → Privacy.',
    auto: false,
    skippable: true,
    path: '/settings',
    state: { scrollTo: 'section-privacy' },
  },
];

export const TOTAL_STEPS = STEPS.length;
