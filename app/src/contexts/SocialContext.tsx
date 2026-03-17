import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { UserProfile } from '../types/user';
import {
    searchPublicProfiles,
    sendFriendRequest as fsSendFriendRequest,
    acceptFriendRequest as fsAcceptFriendRequest,
    rejectFriendRequest as fsRejectFriendRequest,
    cancelFriendRequest as fsCancelFriendRequest,
    removeFriend as removeFriendFirestore,
    subscribeFriendRequests,
    createNotification,
    type FriendRequestDoc,
} from '../lib/firestoreService';
import { getAvatarUrl } from '../lib/tokenService';

export interface PublicProfile {
    uid: string;
    displayName: string;
    username?: string;
    avatarUrl: string;
    visibility: 'Public' | 'Friends Only' | 'Private';
    publicStatus: 'None' | 'Open to Playdates' | 'Looking for Walking Buddies';
    pets: { type: string; count: number }[];
    blockedUsers?: string[]; // best-effort — only present if we have their full profile
    friends?: string[]; // UIDs of this user's friends — used for mutual-friends PYMK scoring
}

// FriendRequest is the canonical type used throughout the app.
// status includes 'cancelled' for audit-trail purposes.
export interface FriendRequest {
    id: string;
    fromUid: string;
    toUid: string;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    createdAt: number;
    updatedAt?: number;
}

interface SocialContextValue {
    directory: PublicProfile[];
    friendRequests: FriendRequest[];
    pendingRequests: FriendRequest[];   // incoming: toUid === currentUser.uid, status === 'pending'
    sentRequests: FriendRequest[];      // outgoing: fromUid === currentUser.uid, status === 'pending'
    searchUsers: (query: string) => Promise<PublicProfile[]>;
    sendFriendRequest: (toUid: string) => Promise<void>;
    acceptFriendRequest: (requestId: string) => Promise<void>;
    rejectFriendRequest: (requestId: string) => Promise<void>;
    cancelFriendRequest: (requestId: string) => Promise<void>;
    removeFriend: (friendUid: string) => Promise<void>;
    blockUser: (targetUid: string) => Promise<void>;
    unblockUser: (targetUid: string) => void;
    isBlocked: (targetUid: string) => boolean;
    isBlockedBy: (targetUid: string) => boolean;
    acceptFriendRequestAndGreet: (requestId: string, navigate: (path: string) => void) => Promise<void>;
}

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
    const { user, profile, updateProfile } = useAuth();
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [directory, setDirectory] = useState<PublicProfile[]>([]);

    const pendingRequests = useMemo(
        () => friendRequests.filter(r => r.toUid === user?.uid && r.status === 'pending'),
        [friendRequests, user]
    );
    const sentRequests = useMemo(
        () => friendRequests.filter(r => r.fromUid === user?.uid && r.status === 'pending'),
        [friendRequests, user]
    );

    // Load real public profiles from Firestore for the directory
    useEffect(() => {
        if (!user) return;
        searchPublicProfiles('').then(rawProfiles => {
            const mapped: PublicProfile[] = rawProfiles
                .filter(p => p.uid !== user.uid && p.visibility !== 'Private')
                .map(p => ({
                    uid: p.uid,
                    displayName: p.displayName,
                    username: p.username,
                    avatarUrl: '', // resolved lazily via tokenService.getAvatarUrl(uid)
                    visibility: p.visibility as PublicProfile['visibility'],
                    publicStatus: p.publicStatus as PublicProfile['publicStatus'],
                    pets: [],
                    friends: p.friends ?? [],
                }));
            setDirectory(mapped);
        }).catch(() => { /* silent fail — directory stays empty */ });
    }, [user]);

    // Subscribe to Firestore friendRequests (two queries merged — Firestore has no OR across fields)
    useEffect(() => {
        if (!user) { setFriendRequests([]); return; }
        const unsub = subscribeFriendRequests(
            user.uid,
            (docs: FriendRequestDoc[]) => {
                setFriendRequests(docs.map(d => ({
                    id: d.id,
                    fromUid: d.fromUid,
                    toUid: d.toUid,
                    status: d.status,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                })));
            },
            (err) => { console.error('friendRequests subscription error', err); },
        );
        return unsub;
    }, [user]);

    const searchUsers = useCallback(async (query: string): Promise<PublicProfile[]> => {
        if (!profile) return [];

        try {
            const rawProfiles = await searchPublicProfiles(query);
            const filtered = rawProfiles.filter(p => {
                // 1. Don't return self
                if (user && p.uid === user.uid) return false;

                // 2. Hide private profiles
                if (p.visibility === 'Private') return false;

                // 3. Hide blocked users
                if (profile.blockedUsers.includes(p.uid)) return false;

                // 4. Friends Only check
                if (p.visibility === 'Friends Only' && !profile.friends.includes(p.uid)) {
                    return false;
                }

                return true;
            });

            // Resolve all avatars concurrently for performance
            return Promise.all(filtered.map(async (p) => ({
                uid: p.uid,
                displayName: p.displayName,
                username: p.username,
                avatarUrl: await getAvatarUrl(p.uid, p.avatarUrl), // Task-20 compliant; fallback handled inside tokenService
                visibility: p.visibility as any,
                publicStatus: p.publicStatus as any,
                pets: [],
                friends: p.friends ?? [],
            })));
        } catch (err) {
            console.error('Failed to search users', err);
            return [];
        }
    }, [profile, user]);

    const sendFriendRequest = useCallback(async (toUid: string) => {
        if (!user) return;
        await fsSendFriendRequest(user.uid, toUid);
        // State is updated via onSnapshot subscription
        createNotification(toUid, {
            type: 'friend_request',
            fromUid: user.uid,
            fromName: profile?.displayName,
            message: `${profile?.displayName ?? 'Someone'} sent you a friend request`,
            read: false,
            createdAt: Date.now(),
        }).catch(() => {});
    }, [user, profile]);

    const acceptFriendRequest = useCallback(async (requestId: string) => {
        if (!user || !profile) return;
        const req = friendRequests.find(r => r.id === requestId);
        if (!req) return;
        await fsAcceptFriendRequest(requestId, req.fromUid, req.toUid);
        // Firestore batch also writes to both users' friends arrays;
        // AuthContext will pick up the profile update via its own subscription.
        createNotification(req.fromUid, {
            type: 'friend_accepted',
            fromUid: user.uid,
            fromName: profile.displayName,
            message: `${profile.displayName} accepted your friend request`,
            read: false,
            createdAt: Date.now(),
        }).catch(() => {});
    }, [user, profile, friendRequests]);

    const rejectFriendRequest = useCallback(async (requestId: string) => {
        if (!user) return;
        await fsRejectFriendRequest(requestId);
    }, [user]);

    const cancelFriendRequest = useCallback(async (requestId: string) => {
        if (!user) return;
        await fsCancelFriendRequest(requestId);
    }, [user]);

    const removeFriend = useCallback(async (friendUid: string) => {
        if (!user || !profile) return;
        await removeFriendFirestore(user.uid, friendUid);
        // Clean up local friend requests
        setFriendRequests(prev => prev.filter(req =>
            !(req.fromUid === friendUid || req.toUid === friendUid)
        ));
    }, [user, profile]);

    const blockUser = useCallback(async (targetUid: string) => {
        if (!profile || !user) return;

        // Single updateProfile call with all mutations
        if (!profile.blockedUsers.includes(targetUid)) {
            const update: Partial<UserProfile> = {
                blockedUsers: [...profile.blockedUsers, targetUid],
            };
            if (profile.friends.includes(targetUid)) {
                update.friends = profile.friends.filter(id => id !== targetUid);
            }
            await updateProfile(update);
        }

        // Cancel/reject any pending friend requests involving targetUid (fire-and-forget)
        friendRequests.forEach(req => {
            if (req.status !== 'pending') return;
            if (req.fromUid === targetUid && req.toUid === user.uid) {
                // Received request from the blocked user → reject it
                fsRejectFriendRequest(req.id).catch(() => {});
            } else if (req.fromUid === user.uid && req.toUid === targetUid) {
                // Sent request to the blocked user → cancel it
                fsCancelFriendRequest(req.id).catch(() => {});
            }
        });
    }, [profile, updateProfile, friendRequests, user]);

    const unblockUser = useCallback((targetUid: string) => {
        if (!profile) return;
        updateProfile({
            blockedUsers: profile.blockedUsers.filter(id => id !== targetUid)
        });
    }, [profile, updateProfile]);

    /**
     * Returns true if the current user has blocked targetUid.
     */
    const isBlocked = useCallback((targetUid: string): boolean => {
        if (!profile) return false;
        return profile.blockedUsers.includes(targetUid);
    }, [profile]);

    /**
     * Best-effort check: returns true if targetUid has blocked the current user.
     * Only works if the target's PublicProfile is in the local directory AND contains
     * a blockedUsers field (which requires the profile to have been loaded with that data).
     * Server-side security rules are the authoritative gate — this is a UI hint only.
     */
    const isBlockedBy = useCallback((targetUid: string): boolean => {
        if (!user) return false;
        const targetProfile = directory.find(p => p.uid === targetUid);
        if (!targetProfile || !targetProfile.blockedUsers) return false;
        return targetProfile.blockedUsers.includes(user.uid);
    }, [user, directory]);

    const acceptFriendRequestAndGreet = useCallback(
        async (requestId: string, navigate: (path: string) => void) => {
            const req = friendRequests.find(r => r.id === requestId); // capture BEFORE await
            await acceptFriendRequest(requestId);
            if (req) navigate(`/messages?uid=${req.fromUid}`);
        },
        [acceptFriendRequest, friendRequests]
    );

    return (
        <SocialContext.Provider value={{
            directory,
            friendRequests,
            pendingRequests,
            sentRequests,
            searchUsers,
            sendFriendRequest,
            acceptFriendRequest,
            rejectFriendRequest,
            cancelFriendRequest,
            removeFriend,
            blockUser,
            unblockUser,
            isBlocked,
            isBlockedBy,
            acceptFriendRequestAndGreet,
        }}>
            {children}
        </SocialContext.Provider>
    );
}

export const useSocial = () => useContext(SocialContext)!;

// ---------------------------------------------------------------------------
// PYMK scoring helpers (exported so widgets can use the canonical weights)
// ---------------------------------------------------------------------------

export interface PymkCandidate {
    uid: string;
    displayName: string;
    avatarUrl: string;
    friendIds?: string[];   // UIDs of this candidate's friends (from PublicProfile.friends)
    groupIds?: string[];    // group IDs this candidate belongs to
}

export interface PymkSuggestion {
    uid: string;
    displayName: string;
    avatarUrl: string;
    score: number;
    mutualFriends: number;
    sharedGroups: number;
}

/**
 * Score a PYMK candidate relative to the current user.
 * Mutual friends are weighted higher (×3) than shared groups (×2).
 */
export function pymkScore(
    candidate: PymkCandidate,
    myFriends: Set<string>,
    myGroups: Set<string>,
): number {
    const mutualFriends = candidate.friendIds?.filter(id => myFriends.has(id)).length ?? 0;
    const sharedGroups = candidate.groupIds?.filter(id => myGroups.has(id)).length ?? 0;
    return (mutualFriends * 3) + (sharedGroups * 2); // weight mutual friends higher
}
