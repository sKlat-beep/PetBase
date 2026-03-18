/**
 * UserProfileModal — shows a user's public profile in a modal overlay.
 * Can be triggered from anywhere by passing a uid (null = closed).
 *
 * Sections rendered (all respect privacy settings):
 *  - Header: avatar, display name, @username
 *  - Public status badge (visibility-gated)
 *  - Action bar: Message, Friend, Invite to Group, Block, Report
 *
 * TODO (future): Pet type badges — data requires users/{uid}/pets subcollection
 *   fetch; deferred until Phase 5 profile enrichment.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  X, User, MessageSquare, UserPlus, UserCheck, UserMinus,
  ShieldOff, Shield, Users, ChevronDown, Loader2, Flag, Award,
} from 'lucide-react';
import { getBadgeById } from '../../utils/badges';
import { useAuth } from '../../contexts/AuthContext';
import { useSocial } from '../../contexts/SocialContext';
import { useCommunity } from '../../contexts/CommunityContext';
import { useMessaging } from '../../contexts/MessagingContext';
import { getAvatarUrl } from '../../lib/tokenService';
import { fetchPublicProfileById, type PublicProfileDetails } from '../../lib/firestoreService';
import ReportModal from '../community/ReportModal';

// ── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  'Open to Playdates': '🐾 Open to Playdates',
  'Looking for Walking Buddies': '🦮 Looking for Walking Buddies',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface UserProfileModalProps {
  uid: string | null;
  onClose: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function UserProfileModal({ uid, onClose }: UserProfileModalProps) {
  const navigate = useNavigate();
  const { user, profile: myProfile } = useAuth();
  const {
    directory,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    isBlocked,
    isBlockedBy,
  } = useSocial();
  const { groups, inviteUserToGroup } = useCommunity();
  const { setActiveUid } = useMessaging();

  const [targetProfile, setTargetProfile] = useState<PublicProfileDetails | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteGroupDropdownOpen, setInviteGroupDropdownOpen] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [removeFriendDropdownOpen, setRemoveFriendDropdownOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const directoryRef = useRef(directory);
  useEffect(() => { directoryRef.current = directory; }, [directory]);

  // Focus close button on open
  useEffect(() => {
    if (uid) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [uid]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [onClose]);

  // Load profile when uid changes
  useEffect(() => {
    if (!uid) {
      setTargetProfile(null);
      setAvatarUrl('');
      return;
    }

    // Try directory cache first (use ref — avoids re-firing when directory updates)
    const cached = directoryRef.current.find(p => p.uid === uid);
    if (cached) {
      setTargetProfile({
        uid: cached.uid,
        displayName: cached.displayName,
        username: cached.username,
        avatarUrl: cached.avatarUrl,
        visibility: cached.visibility,
        publicStatus: cached.publicStatus,
        disableDMs: false,
        disableGroupInvites: false,
        showLastActive: true,
      });
      // Still fetch full details (for disableDMs / disableGroupInvites)
    }

    setLoading(true);
    fetchPublicProfileById(uid)
      .then(details => {
        setTargetProfile(details);
        if (details) {
          getAvatarUrl(details.uid, details.avatarUrl)
            .then(setAvatarUrl)
            .catch(() => setAvatarUrl(''));
        }
      })
      .catch(() => {
        if (!cached) setTargetProfile(null);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  if (!uid) return null;
  if (!user || !myProfile) return null;

  const isMeViewing = uid === user.uid;

  // Friend relationship
  const myRequests = friendRequests;
  const sentByMe = myRequests.find(r => r.fromUid === user.uid && r.toUid === uid && r.status === 'pending');
  const sentByThem = myRequests.find(r => r.fromUid === uid && r.toUid === user.uid && r.status === 'pending');
  const isFriend = myProfile.friends.includes(uid);
  const isBlockedByMe = isBlocked(uid);

  // Visibility check
  const canSeeDetails =
    targetProfile?.visibility === 'Public' ||
    (targetProfile?.visibility === 'Friends Only' && isFriend) ||
    isMeViewing;

  // Groups where I'm Owner or Moderator
  const myAdminGroups = groups.filter(g => {
    const myRole = g.members[user.uid]?.role;
    return myRole === 'Owner' || myRole === 'Moderator';
  });

  const handleMessage = () => {
    if (!targetProfile?.disableDMs) {
      setActiveUid(uid);
      navigate('/messages');
      onClose();
    }
  };

  const handleBlock = async () => {
    if (isBlockedByMe) {
      await unblockUser(uid);
      onClose();
    } else {
      if (window.confirm(`Block ${targetProfile?.displayName ?? uid}? They will no longer appear in your community.`)) {
        await blockUser(uid);
        onClose();
      }
    }
  };

  const handleInviteToGroup = async (groupId: string) => {
    setInviteError('');
    setInviteSuccess('');
    setInviteGroupDropdownOpen(false);
    try {
      await inviteUserToGroup(groupId, uid);
      const groupName = groups.find(g => g.id === groupId)?.name ?? 'the group';
      setInviteSuccess(`Invite sent to ${targetProfile?.displayName ?? uid} for "${groupName}".`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invite.';
      setInviteError(message);
    }
  };

  const handleReport = () => {
    setReportModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onMouseDown={onClose}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-profile-modal-title"
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full sm:max-w-sm bg-white dark:bg-neutral-900
                   border border-neutral-200 dark:border-neutral-700 shadow-2xl
                   rounded-t-2xl sm:rounded-2xl overflow-hidden z-10 flex flex-col"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <h2 id="user-profile-modal-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Profile
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close profile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                       text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200
                       hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors
                       focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Loading state */}
          {loading && !targetProfile && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          )}

          {/* Not found */}
          {!loading && !targetProfile && (
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 py-8">
              Profile not found.
            </p>
          )}

          {/* Profile body */}
          {targetProfile && (
            <>
              {/* Blocked-by guard: target has blocked us — show neutral placeholder */}
              {isBlockedBy(uid) ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                      <User className="w-7 h-7 text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate text-base">
                        User
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">This user is not available</p>
                  </div>
                </>
              ) : (
              <>
              {/* Avatar + identity */}
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={targetProfile.displayName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-2xl object-cover bg-neutral-100 dark:bg-neutral-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-neutral-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100 truncate text-base">
                    {targetProfile.displayName}
                  </p>
                  {targetProfile.username && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                      {targetProfile.username.includes('#') ? (
                        <>
                          @{targetProfile.username.split('#')[0]}
                          <span className="opacity-60">#{targetProfile.username.split('#')[1]}</span>
                        </>
                      ) : (
                        <>@{targetProfile.username}</>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Private profile placeholder */}
              {targetProfile.visibility === 'Private' && !isMeViewing && (
                <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 text-center">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">This profile is private</p>
                </div>
              )}

              {/* Pets */}
              {canSeeDetails && targetProfile.visibility !== 'Private' && (
                <>
                  {/* Public status badge */}
                  {targetProfile.publicStatus && targetProfile.publicStatus !== 'None' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                    bg-emerald-50 dark:bg-emerald-900/30
                                    text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                      {STATUS_LABELS[targetProfile.publicStatus] ?? targetProfile.publicStatus}
                    </div>
                  )}

                  {/* Achievement badges */}
                  {targetProfile.badges && targetProfile.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {targetProfile.badges.map(b => {
                        const def = getBadgeById(b.id);
                        if (!def) return null;
                        return (
                          <span key={b.id} title={def.description} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-medium">
                            <span>{def.emoji}</span> {def.title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Feedback messages */}
              {inviteError && (
                <p className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-lg px-3 py-2">
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                  {inviteSuccess}
                </p>
              )}

              {/* ── Action bar ── */}
              {!isMeViewing && (
                <div className="flex flex-wrap gap-2 pt-1">

                  {/* Message button */}
                  {!targetProfile.disableDMs && (
                    <button
                      onClick={handleMessage}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                 bg-emerald-50 dark:bg-emerald-900/30
                                 text-emerald-700 dark:text-emerald-400
                                 hover:bg-emerald-100 dark:hover:bg-emerald-900/50
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  )}

                  {/* Friend button */}
                  {!isFriend && !sentByMe && !sentByThem && (
                    <button
                      onClick={() => sendFriendRequest(uid)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900
                                 hover:bg-neutral-800 dark:hover:bg-neutral-200
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Friend
                    </button>
                  )}

                  {sentByMe && (
                    <button
                      onClick={() => cancelFriendRequest(sentByMe.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400
                                 hover:bg-neutral-200 dark:hover:bg-neutral-600
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      title="Cancel friend request"
                    >
                      <UserCheck className="w-4 h-4" />
                      Pending
                    </button>
                  )}

                  {sentByThem && (
                    <>
                      <button
                        onClick={() => acceptFriendRequest(sentByThem.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-emerald-500 text-white hover:bg-emerald-600
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <UserCheck className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(sentByThem.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300
                                   hover:bg-neutral-200 dark:hover:bg-neutral-600
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {isFriend && (
                    <div className="relative">
                      <button
                        onClick={() => setRemoveFriendDropdownOpen(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-emerald-50 dark:bg-emerald-900/30
                                   text-emerald-700 dark:text-emerald-400
                                   hover:bg-emerald-100 dark:hover:bg-emerald-900/50
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <UserCheck className="w-4 h-4" />
                        Friends
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {removeFriendDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-neutral-800
                                        border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg min-w-[150px]">
                          <button
                            onClick={() => { removeFriend(uid); setRemoveFriendDropdownOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400
                                       hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                            Remove Friend
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invite to Group button */}
                  {!targetProfile.disableGroupInvites && myAdminGroups.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => { setInviteGroupDropdownOpen(v => !v); setInviteError(''); setInviteSuccess(''); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300
                                   hover:bg-neutral-200 dark:hover:bg-neutral-600
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <Users className="w-4 h-4" />
                        Invite to Group
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {inviteGroupDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-neutral-800
                                        border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg min-w-[180px]">
                          {myAdminGroups.map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleInviteToGroup(g.id)}
                              disabled={!!g.members[uid]}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-700 dark:text-neutral-300
                                         hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl transition-colors
                                         disabled:opacity-40 disabled:cursor-not-allowed first:rounded-t-xl last:rounded-b-xl"
                            >
                              {g.name}
                              {g.members[uid] && (
                                <span className="ml-auto text-[10px] text-neutral-400">Already member</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Block/Unblock */}
                  <button
                    onClick={handleBlock}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
                               ${isBlockedByMe
                                 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                 : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400'
                               }`}
                  >
                    <ShieldOff className="w-4 h-4" />
                    {isBlockedByMe ? 'Unblock' : 'Block'}
                  </button>

                  {/* Report */}
                  <button
                    onClick={handleReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                               bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400
                               hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                </div>
              )}
              </>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* ReportModal */}
      {uid && (
        <ReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetType="user"
          targetId={uid}
        />
      )}
    </div>
  );
}
