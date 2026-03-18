import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useHousehold } from '../contexts/HouseholdContext';
import { DEFAULT_PERMISSIONS, DEFAULT_PARENTAL_CONTROLS } from '../types/household';
import type { MemberPermissions, ParentalControls } from '../types/household';

interface HouseholdPermissionsResult {
  /** Whether the current user is a household member at all */
  isMember: boolean;
  /** Whether the current user is the Family Leader */
  isLeader: boolean;
  /** Current user's role label */
  role: string | null;
  /** Resolved permissions (always defined, defaults if no household) */
  permissions: MemberPermissions;
  /** Resolved parental controls (always defined, defaults if no household) */
  parentalControls: ParentalControls;
  /** Permission check helpers */
  canEditPetInfo: boolean;
  canAddMedicalInfo: boolean;
  canCreateRevokePetCards: boolean;
  /** Parental control checks */
  communityAccessDisabled: boolean;
  discoverabilityDisabled: boolean;
  forcePrivateProfile: boolean;
}

/**
 * Returns the current user's household permissions and parental controls.
 * Leaders always have full permissions. Non-members get unrestricted defaults.
 */
export function useHouseholdPermissions(): HouseholdPermissionsResult {
  const { user } = useAuth();
  const { household, members } = useHousehold();

  return useMemo(() => {
    const uid = user?.uid;
    const member = uid ? members.find(m => m.uid === uid) : undefined;
    const isMember = !!member;
    const isLeader = member?.role === 'Family Leader';
    const role = member?.role ?? null;

    // Leaders always get full permissions
    const permissions: MemberPermissions = isLeader
      ? { editPetInfo: true, addMedicalInfo: true, createRevokePetCards: true }
      : member?.permissions ?? DEFAULT_PERMISSIONS;

    const parentalControls: ParentalControls = member?.parentalControls ?? DEFAULT_PARENTAL_CONTROLS;

    // Non-members are unrestricted (they own their own pets)
    const inHousehold = !!household && isMember;

    return {
      isMember,
      isLeader,
      role,
      permissions,
      parentalControls,
      canEditPetInfo: !inHousehold || isLeader || permissions.editPetInfo,
      canAddMedicalInfo: !inHousehold || isLeader || permissions.addMedicalInfo,
      canCreateRevokePetCards: !inHousehold || isLeader || permissions.createRevokePetCards,
      communityAccessDisabled: inHousehold && !isLeader && parentalControls.disableCommunityAccess,
      discoverabilityDisabled: inHousehold && !isLeader && parentalControls.disableDiscoverability,
      forcePrivateProfile: inHousehold && !isLeader && parentalControls.forcePrivateProfile,
    };
  }, [user, household, members]);
}
