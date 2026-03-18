export type HouseholdRole = 'Family Leader' | 'Extended Family' | 'Child' | 'Member';

export interface MemberPermissions {
  editPetInfo: boolean;
  addMedicalInfo: boolean;
  createRevokePetCards: boolean;
}

export interface ParentalControls {
  forcePrivateProfile: boolean;
  disableDiscoverability: boolean;
  disableCommunityAccess: boolean;
}

export interface AuditEntry {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  timestamp: number;
}

export interface Household {
  id: string;
  name: string;
  namePublic: string;           // plaintext name readable by all members
  ownerId: string;
  inviteCode: string;           // 6-char alphanumeric, uppercase
  inviteCodeExpiresAt?: number; // ms epoch; null = never expires
  createdAt: number;
}

export interface HouseholdMember {
  uid: string;
  displayName: string;
  displayNamePublic: string;    // plaintext name readable by all members
  role: HouseholdRole;
  joinedAt: number;
  permissions: MemberPermissions;
  parentalControls?: ParentalControls;
}

export const DEFAULT_PERMISSIONS: MemberPermissions = {
  editPetInfo: true,
  addMedicalInfo: true,
  createRevokePetCards: false,
};

export const EXTENDED_FAMILY_PERMISSIONS: MemberPermissions = {
  editPetInfo: true,
  addMedicalInfo: true,
  createRevokePetCards: true,
};

export const ROLE_DESCRIPTIONS: Record<HouseholdRole, string> = {
  'Family Leader': 'Full control: manage members, roles, permissions, invite codes, and all pet data.',
  'Extended Family': 'Trusted member: can edit pets, add medical info, and create/revoke pet cards by default.',
  'Child': 'Restricted member: parental controls available to limit profile visibility and community access.',
  'Member': 'Standard member: can edit pets and add medical info. Cannot create pet cards by default.',
};

export const MAX_HOUSEHOLD_MEMBERS = 20;

export const DEFAULT_PARENTAL_CONTROLS: ParentalControls = {
  forcePrivateProfile: false,
  disableDiscoverability: false,
  disableCommunityAccess: false,
};
