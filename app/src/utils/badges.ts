export interface BadgeDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_pet', title: 'Pet Parent', description: 'Added your first pet', emoji: '🐾' },
  { id: 'first_post', title: 'Community Voice', description: 'Made your first group post', emoji: '💬' },
  { id: 'first_card', title: 'Card Maker', description: 'Created your first pet card', emoji: '🪪' },
  { id: 'five_friends', title: 'Social Butterfly', description: 'Connected with 5 friends', emoji: '🦋' },
  { id: 'vaccine_champion', title: 'Vaccine Champion', description: 'All pets vaccinated and up to date', emoji: '💉' },
  { id: 'streak_7', title: 'Week Warrior', description: '7-day health logging streak', emoji: '🔥' },
  { id: 'streak_30', title: 'Streak Master', description: '30-day health logging streak', emoji: '⚡' },
  { id: 'community_pillar', title: 'Community Pillar', description: 'Received 50 reactions on your posts', emoji: '🏛️' },
  { id: 'explorer', title: 'Explorer', description: 'Joined 3 community groups', emoji: '🧭' },
  { id: 'family_founder', title: 'Family Founder', description: 'Created a household', emoji: '👨‍👩‍👧‍👦' },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find(b => b.id === id);
}

export function checkBadgeEligibility(context: {
  petCount: number;
  postCount: number;
  cardCount: number;
  friendCount: number;
  allVaccinesCurrent: boolean;
  streakCount: number;
  totalReactionsReceived: number;
  groupCount: number;
  hasHousehold: boolean;
  existingBadgeIds: string[];
}): string[] {
  const newBadges: string[] = [];
  const has = new Set(context.existingBadgeIds);

  if (!has.has('first_pet') && context.petCount >= 1) newBadges.push('first_pet');
  if (!has.has('first_post') && context.postCount >= 1) newBadges.push('first_post');
  if (!has.has('first_card') && context.cardCount >= 1) newBadges.push('first_card');
  if (!has.has('five_friends') && context.friendCount >= 5) newBadges.push('five_friends');
  if (!has.has('vaccine_champion') && context.allVaccinesCurrent) newBadges.push('vaccine_champion');
  if (!has.has('streak_7') && context.streakCount >= 7) newBadges.push('streak_7');
  if (!has.has('streak_30') && context.streakCount >= 30) newBadges.push('streak_30');
  if (!has.has('community_pillar') && context.totalReactionsReceived >= 50) newBadges.push('community_pillar');
  if (!has.has('explorer') && context.groupCount >= 3) newBadges.push('explorer');
  if (!has.has('family_founder') && context.hasHousehold) newBadges.push('family_founder');

  return newBadges;
}
