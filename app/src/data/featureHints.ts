// MAINTAINER NOTE: When adding new features to PetBase, add a corresponding
// entry here. See planning docs "New Feature Categorization Process" for the
// basic vs. advanced decision rule.

import type { FeatureHint, HintCategory } from '../types/onboarding';

export const CATEGORY_ACCENTS: Record<HintCategory, string> = {
  pets: 'bg-secondary-container/20 border-secondary/20',
  cards: 'bg-tertiary-container/20 border-tertiary/20',
  services: 'bg-secondary-container/20 border-secondary/20',
  community: 'bg-tertiary-container/20 border-tertiary/20',
  messaging: 'bg-primary-container/20 border-primary-container/20',
  social: 'bg-primary-container/20 border-primary-container/20',
  family: 'bg-secondary-container/20 border-secondary/20',
  settings: 'bg-surface-container-high border-outline-variant',
  dashboard: 'bg-primary-container/20 border-primary-container/20',
  safety: 'bg-error-container/20 border-error/20',
};

export const HINTS: FeatureHint[] = [
  // ─── Pets ───────────────────────────────────────────────────────────────────
  { id: 'weight-tracking', title: 'Track your pet\'s weight over time', description: 'Log weight entries to spot trends and keep your pet healthy.', cta: 'Go to pets', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-pet' },
  { id: 'body-condition-score', title: 'Assess body condition score', description: 'Use the BCS scale to monitor your pet\'s fitness at a glance.', cta: 'Go to pets', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-pet' },
  { id: 'diet-feeding', title: 'Set up diet & feeding schedule', description: 'Configure feeding times and portion sizes so the whole family stays in sync.', cta: 'Go to pets', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-pet' },
  { id: 'mood-logging', title: 'Log daily mood & energy', description: 'Track how your pet is feeling day to day — spot patterns early.', cta: 'Go to pets', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-pet' },
  { id: 'health-insights', title: 'View health insights dashboard', description: 'See trends, alerts, and summaries across all your pet\'s health data.', cta: 'View insights', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-medical-record' },
  { id: 'mark-lost', title: 'Know how to report a lost pet', description: 'Learn the one-tap lost pet report that alerts nearby PetBase users.', cta: 'Go to pets', to: '/pets', category: 'pets', accentClasses: CATEGORY_ACCENTS.pets, prerequisite: 'add-pet' },

  // ─── Cards ──────────────────────────────────────────────────────────────────
  { id: 'multi-pet-cards', title: 'Create a multi-pet card', description: 'Combine all your pets into a single shareable card for sitters.', cta: 'Go to cards', to: '/pets?openCards=true', category: 'cards', accentClasses: CATEGORY_ACCENTS.cards, prerequisite: 'create-card' },
  { id: 'card-templates', title: 'Try vet/sitter/emergency templates', description: 'Pick a template designed for the situation — vet visit, pet sitter, or emergency.', cta: 'Go to cards', to: '/pets?openCards=true', category: 'cards', accentClasses: CATEGORY_ACCENTS.cards, prerequisite: 'create-card' },
  { id: 'card-sharing', title: 'Customize sharing toggles', description: 'Control exactly which fields are visible on your shared cards.', cta: 'Go to cards', to: '/pets?openCards=true', category: 'cards', accentClasses: CATEGORY_ACCENTS.cards, prerequisite: 'create-card' },
  { id: 'card-qr-pdf', title: 'Export QR code or PDF', description: 'Download a printable PDF or QR code to stick on your pet\'s collar.', cta: 'Go to cards', to: '/pets?openCards=true', category: 'cards', accentClasses: CATEGORY_ACCENTS.cards, prerequisite: 'create-card' },
  { id: 'card-expiration', title: 'Set card expiration dates', description: 'Add an auto-expiry so temporary cards don\'t stay active forever.', cta: 'Go to cards', to: '/pets?openCards=true', category: 'cards', accentClasses: CATEGORY_ACCENTS.cards, prerequisite: 'create-card' },

  // ─── Services ───────────────────────────────────────────────────────────────
  { id: 'save-services', title: 'Save favorite services', description: 'Bookmark your go-to vet, groomer, or sitter for quick access.', cta: 'Search services', to: '/search', category: 'services', accentClasses: CATEGORY_ACCENTS.services, prerequisite: 'find-services' },
  { id: 'community-tips', title: 'Add tips for local services', description: 'Help other pet parents by sharing your experience with local providers.', cta: 'Search services', to: '/search', category: 'services', accentClasses: CATEGORY_ACCENTS.services, prerequisite: 'find-services' },
  { id: 'emergency-filter', title: 'Use 24/7 emergency filter', description: 'Quickly find emergency vets and clinics that are open right now.', cta: 'Search services', to: '/search', category: 'services', accentClasses: CATEGORY_ACCENTS.services, prerequisite: 'find-services' },

  // ─── Community ──────────────────────────────────────────────────────────────
  { id: 'create-group', title: 'Create your own group', description: 'Start a group for your neighborhood, breed, or interest.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },
  { id: 'post-discussion', title: 'Start a discussion', description: 'Ask a question or share advice in your community groups.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },
  { id: 'events-rsvp', title: 'Discover & RSVP to events', description: 'Find local pet meetups, walks, and adoption events near you.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },
  { id: 'adoption-listings', title: 'Browse adoption listings', description: 'Find pets looking for their forever home in your area.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },
  { id: 'buddy-matching', title: 'Find a pet buddy match', description: 'Match your pet with compatible companions for playdates.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },
  { id: 'playdate-scheduling', title: 'Schedule a playdate', description: 'Set up a playdate with another pet parent in just a few taps.', cta: 'Go to community', to: '/community', category: 'community', accentClasses: CATEGORY_ACCENTS.community, prerequisite: 'join-community' },

  // ─── Messaging ──────────────────────────────────────────────────────────────
  { id: 'send-dm', title: 'Send your first direct message', description: 'Chat privately with other pet parents you\'ve connected with.', cta: 'Go to messages', to: '/messages', category: 'messaging', accentClasses: CATEGORY_ACCENTS.messaging, prerequisite: null },
  { id: 'gif-emoji-picker', title: 'Use GIFs & emoji reactions', description: 'Express yourself with GIFs and emoji reactions in conversations.', cta: 'Go to messages', to: '/messages', category: 'messaging', accentClasses: CATEGORY_ACCENTS.messaging, prerequisite: null },
  { id: 'voice-memos', title: 'Send a voice memo', description: 'Record and send a quick voice message when typing won\'t do.', cta: 'Go to messages', to: '/messages', category: 'messaging', accentClasses: CATEGORY_ACCENTS.messaging, prerequisite: null },
  { id: 'pin-conversations', title: 'Pin important conversations', description: 'Keep your most important chats at the top of your inbox.', cta: 'Go to messages', to: '/messages', category: 'messaging', accentClasses: CATEGORY_ACCENTS.messaging, prerequisite: null },

  // ─── Social ─────────────────────────────────────────────────────────────────
  { id: 'public-profile', title: 'Customize your public profile', description: 'Choose what other pet parents see when they visit your profile.', cta: 'Go to settings', to: '/settings', category: 'social', accentClasses: CATEGORY_ACCENTS.social, prerequisite: 'complete-profile' },
  { id: 'friend-requests', title: 'Send a friend request', description: 'Connect with pet parents you meet in groups or at events.', cta: 'Find friends', to: '/community', category: 'social', accentClasses: CATEGORY_ACCENTS.social, prerequisite: null },
  { id: 'follow-pets', title: 'Follow pets you love', description: 'Stay updated on pets that catch your eye — new photos, milestones, and more.', cta: 'Browse pets', to: '/community', category: 'social', accentClasses: CATEGORY_ACCENTS.social, prerequisite: null },

  // ─── Family ─────────────────────────────────────────────────────────────────
  { id: 'invite-family', title: 'Invite household members', description: 'Share pet management with your partner, kids, or housemates.', cta: 'Go to settings', to: '/settings', category: 'family', accentClasses: CATEGORY_ACCENTS.family, prerequisite: 'create-family' },
  { id: 'parental-controls', title: 'Set up parental controls', description: 'Restrict what children in your household can access.', cta: 'Go to settings', to: '/settings', category: 'family', accentClasses: CATEGORY_ACCENTS.family, prerequisite: 'create-family' },
  { id: 'audit-log', title: 'Review family audit log', description: 'See who made changes to your pets\' profiles and health records.', cta: 'Go to settings', to: '/settings', category: 'family', accentClasses: CATEGORY_ACCENTS.family, prerequisite: 'create-family' },

  // ─── Settings & Security ────────────────────────────────────────────────────
  { id: 'emergency-contacts', title: 'Set up emergency contacts', description: 'Add trusted contacts who can be reached if something happens.', cta: 'Go to settings', to: '/settings', category: 'settings', accentClasses: CATEGORY_ACCENTS.settings, prerequisite: null },
  { id: 'encrypted-backup', title: 'Create an encrypted backup', description: 'Back up your data with end-to-end encryption for peace of mind.', cta: 'Go to settings', to: '/settings', category: 'settings', accentClasses: CATEGORY_ACCENTS.settings, prerequisite: null },
  { id: 'cross-device-sync', title: 'Set up cross-device sync', description: 'Access your PetBase on your phone, tablet, and computer.', cta: 'Go to settings', to: '/settings', category: 'settings', accentClasses: CATEGORY_ACCENTS.settings, prerequisite: null },
  { id: 'data-export', title: 'Export your data (GDPR)', description: 'Download a complete copy of all your PetBase data.', cta: 'Go to settings', to: '/settings', category: 'settings', accentClasses: CATEGORY_ACCENTS.settings, prerequisite: null },

  // ─── Dashboard ──────────────────────────────────────────────────────────────
  { id: 'widget-customization', title: 'Customize dashboard widgets', description: 'Rearrange, resize, and toggle widgets to make your dashboard yours.', cta: 'Edit dashboard', to: '/', category: 'dashboard', accentClasses: CATEGORY_ACCENTS.dashboard, prerequisite: null },
  { id: 'expense-tracking', title: 'Track pet expenses', description: 'Log vet bills, food costs, and more to understand your pet spending.', cta: 'View expenses', to: '/', category: 'dashboard', accentClasses: CATEGORY_ACCENTS.dashboard, prerequisite: 'add-pet' },

  // ─── Safety ─────────────────────────────────────────────────────────────────
  { id: 'safety-alerts', title: 'View local safety alerts', description: 'Stay informed about pet-related safety warnings in your area.', cta: 'View alerts', to: '/', category: 'safety', accentClasses: CATEGORY_ACCENTS.safety, prerequisite: null },
  { id: 'lost-pet-alerts', title: 'Configure lost pet alert radius', description: 'Set how far your lost pet alert reaches when you need it most.', cta: 'Go to settings', to: '/settings', category: 'safety', accentClasses: CATEGORY_ACCENTS.safety, prerequisite: 'add-pet' },
];

export const TOTAL_HINTS = HINTS.length;
export const TOTAL_FEATURES = 10 + TOTAL_HINTS; // 48 total (basic + advanced)

/** All unique categories in display order */
export const HINT_CATEGORIES: HintCategory[] = [
  'pets', 'cards', 'services', 'community', 'messaging',
  'social', 'family', 'settings', 'dashboard', 'safety',
];
