import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { markFamilyCreated } from '../components/GettingStartedGuide';
import {
  createHousehold as fsCreateHousehold,
  joinHouseholdByCode as fsJoinByCode,
  getHousehold,
  getHouseholdMembers,
  leaveHousehold as fsLeave,
  kickHouseholdMember as fsKick,
  regenerateInviteCode as fsRegenerate,
  updateMemberRole as fsUpdateRole,
  updateMemberPermissions as fsUpdatePerms,
  updateParentalControls as fsUpdateParental,
  addAuditEntry as fsAddAudit,
  getAuditLog as fsGetAuditLog,
  ensureHouseholdForFamily as fsEnsureHousehold,
} from '../lib/firestoreService';
import type { Household, HouseholdMember, HouseholdRole, MemberPermissions, ParentalControls, AuditEntry } from '../types/household';

interface HouseholdContextValue {
  household: Household | null;
  members: HouseholdMember[];
  auditLog: AuditEntry[];
  loading: boolean;
  error: string | null;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  kickMember: (uid: string) => Promise<void>;
  regenerateCode: () => Promise<void>;
  updateMemberRole: (uid: string, role: HouseholdRole) => Promise<void>;
  updateMemberPermissions: (uid: string, permissions: MemberPermissions) => Promise<void>;
  updateParentalControls: (uid: string, controls: ParentalControls) => Promise<void>;
  addAuditEntry: (action: string) => Promise<void>;
  promoteToFamily: () => Promise<Household>;
  clearError: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load household whenever the user's profile reports a householdId
  useEffect(() => {
    const hid = (profile as any)?.householdId as string | null | undefined;
    if (!user || !hid) {
      setHousehold(null);
      setMembers([]);
      setAuditLog([]);
      return;
    }
    setLoading(true);
    Promise.all([getHousehold(hid), getHouseholdMembers(hid), fsGetAuditLog(hid)])
      .then(([hh, mems, log]) => {
        setHousehold(hh);
        setMembers(mems);
        setAuditLog(log);
      })
      .catch(() => setError('Failed to load household data.'))
      .finally(() => setLoading(false));
  }, [user, (profile as any)?.householdId]);

  const createHousehold = useCallback(async (name: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const hh = await fsCreateHousehold(
        user.uid,
        user.displayName ?? 'Unknown',
        name,
      );
      const mems = await getHouseholdMembers(hh.id);
      setHousehold(hh);
      setMembers(mems);
      setAuditLog([]);
      markFamilyCreated();
    } catch (e: any) {
      setError(e.message ?? 'Failed to create household.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const hh = await fsJoinByCode(
        user.uid,
        user.displayName ?? 'Unknown',
        code,
      );
      const [mems, log] = await Promise.all([getHouseholdMembers(hh.id), fsGetAuditLog(hh.id)]);
      setHousehold(hh);
      setMembers(mems);
      setAuditLog(log);
      markFamilyCreated();
    } catch (e: any) {
      setError(e.message ?? 'Failed to join household.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const leaveHousehold = useCallback(async () => {
    if (!user || !household) return;
    setLoading(true);
    setError(null);
    try {
      const isOwner = household.ownerId === user.uid;
      await fsLeave(household.id, user.uid, isOwner, members.length);
      setHousehold(null);
      setMembers([]);
      setAuditLog([]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to leave household.');
    } finally {
      setLoading(false);
    }
  }, [user, household, members.length]);

  const kickMember = useCallback(async (uid: string) => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      await fsKick(household.id, uid);
      setMembers(prev => prev.filter(m => m.uid !== uid));
    } catch (e: any) {
      setError(e.message ?? 'Failed to remove member.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  const regenerateCode = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      const newCode = await fsRegenerate(household.id);
      setHousehold(prev => prev ? { ...prev, inviteCode: newCode } : prev);
    } catch (e: any) {
      setError(e.message ?? 'Failed to regenerate invite code.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  const updateMemberRole = useCallback(async (uid: string, role: HouseholdRole) => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      await fsUpdateRole(household.id, uid, role);
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role } : m));
    } catch (e: any) {
      setError(e.message ?? 'Failed to update member role.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  const updateMemberPermissions = useCallback(async (uid: string, permissions: MemberPermissions) => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      await fsUpdatePerms(household.id, uid, permissions);
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, permissions } : m));
    } catch (e: any) {
      setError(e.message ?? 'Failed to update permissions.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  const updateParentalControls = useCallback(async (uid: string, controls: ParentalControls) => {
    if (!household) return;
    setLoading(true);
    setError(null);
    try {
      await fsUpdateParental(household.id, uid, controls);
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, parentalControls: controls } : m));
    } catch (e: any) {
      setError(e.message ?? 'Failed to update parental controls.');
    } finally {
      setLoading(false);
    }
  }, [household]);

  const addAuditEntry = useCallback(async (action: string) => {
    if (!household || !user) return;
    try {
      const entry = await fsAddAudit(household.id, {
        actorUid: user.uid,
        actorName: user.displayName ?? 'Unknown',
        action,
        timestamp: Date.now(),
      });
      setAuditLog(prev => [entry, ...prev]);
    } catch {
      // audit log failure is non-critical
    }
  }, [household, user]);

  const promoteToFamily = useCallback(async (): Promise<Household> => {
    if (!user) throw new Error('Not authenticated');
    setLoading(true);
    setError(null);
    try {
      const hh = await fsEnsureHousehold(user.uid, user.displayName ?? 'Unknown');
      const [mems, log] = await Promise.all([getHouseholdMembers(hh.id), fsGetAuditLog(hh.id)]);
      setHousehold(hh);
      setMembers(mems);
      setAuditLog(log);
      return hh;
    } catch (e: any) {
      setError(e.message ?? 'Failed to set up family.');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <HouseholdContext.Provider value={{
      household, members, auditLog, loading, error,
      createHousehold, joinHousehold, leaveHousehold, kickMember, regenerateCode,
      updateMemberRole, updateMemberPermissions, updateParentalControls,
      addAuditEntry, promoteToFamily,
      clearError: () => setError(null),
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
