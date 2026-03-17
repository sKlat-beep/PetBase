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
  ownerId: string;
  inviteCode: string;  // 6-char alphanumeric, uppercase
  createdAt: number;
}

export interface HouseholdMember {
  uid: string;
  displayName: string;
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

export const DEFAULT_PARENTAL_CONTROLS: ParentalControls = {
  forcePrivateProfile: false,
  disableDiscoverability: false,
  disableCommunityAccess: false,
};
