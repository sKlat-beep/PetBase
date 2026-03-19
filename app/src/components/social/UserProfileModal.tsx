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
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
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
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

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
      setBlockConfirmOpen(true);
    }
  };

  const confirmBlock = async () => {
    setBlockConfirmOpen(false);
    await blockUser(uid);
    onClose();
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
        className="relative w-full sm:max-w-sm bg-surface
                   border border-outline-variant shadow-2xl
                   rounded-t-2xl sm:rounded-2xl overflow-hidden z-10 flex flex-col"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant shrink-0">
          <h2 id="user-profile-modal-title" className="text-lg font-bold text-on-surface">
            Profile
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close profile"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg
                       text-on-surface-variant hover:text-on-surface
                       hover:bg-surface-container transition-colors
                       focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">

          {/* Loading state */}
          {loading && !targetProfile && (
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined text-[24px] animate-spin text-on-surface-variant">progress_activity</span>
            </div>
          )}

          {/* Not found */}
          {!loading && !targetProfile && (
            <p className="text-center text-sm text-on-surface-variant py-8">
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
                    <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[28px] text-on-surface-variant">person</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface truncate text-base">
                        User
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-container border border-outline-variant p-4 text-center">
                    <span className="material-symbols-outlined text-[24px] mx-auto mb-2 text-on-surface-variant block">shield</span>
                    <p className="text-sm font-medium text-on-surface-variant">This user is not available</p>
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
                    className="w-16 h-16 rounded-2xl object-cover bg-surface-container shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[28px] text-on-surface-variant">person</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-on-surface truncate text-base">
                    {targetProfile.displayName}
                  </p>
                  {targetProfile.username && (
                    <p className="text-sm text-on-surface-variant truncate">
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
                <div className="rounded-xl bg-surface-container border border-outline-variant p-4 text-center">
                  <span className="material-symbols-outlined text-[24px] mx-auto mb-2 text-on-surface-variant block">shield</span>
                  <p className="text-sm font-medium text-on-surface-variant">This profile is private</p>
                </div>
              )}

              {/* Pets */}
              {canSeeDetails && targetProfile.visibility !== 'Private' && (
                <>
                  {/* Public status badge */}
                  {targetProfile.publicStatus && targetProfile.publicStatus !== 'None' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                                    bg-primary-container
                                    text-on-primary-container text-sm font-medium">
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
                          <span key={b.id} title={def.description} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container text-xs font-medium">
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
                <p className="text-sm text-error bg-error-container rounded-lg px-3 py-2">
                  {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-sm text-on-primary-container bg-primary-container rounded-lg px-3 py-2">
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
                                 bg-primary-container
                                 text-on-primary-container
                                 hover:bg-primary-container/80
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      Message
                    </button>
                  )}

                  {/* Friend button */}
                  {!isFriend && !sentByMe && !sentByThem && (
                    <button
                      onClick={() => sendFriendRequest(uid)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                 bg-on-surface text-surface
                                 hover:bg-on-surface/90
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      Add Friend
                    </button>
                  )}

                  {sentByMe && (
                    <button
                      onClick={() => cancelFriendRequest(sentByMe.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                 bg-surface-container text-on-surface-variant
                                 hover:bg-surface-container-high
                                 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      title="Cancel friend request"
                    >
                      <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                      Pending
                    </button>
                  )}

                  {sentByThem && (
                    <>
                      <button
                        onClick={() => acceptFriendRequest(sentByThem.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-primary text-on-primary hover:bg-primary/90
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        Accept
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(sentByThem.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                                   bg-surface-container text-on-surface-variant
                                   hover:bg-surface-container-high
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
                                   bg-primary-container
                                   text-on-primary-container
                                   hover:bg-primary-container/80
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                        Friends
                        <span className="material-symbols-outlined text-[12px]">expand_more</span>
                      </button>
                      {removeFriendDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-surface-container-low
                                        border border-outline-variant rounded-xl shadow-lg min-w-[150px]">
                          <button
                            onClick={() => { removeFriend(uid); setRemoveFriendDropdownOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-error
                                       hover:bg-error-container rounded-xl transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">person_remove</span>
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
                                   bg-surface-container text-on-surface-variant
                                   hover:bg-surface-container-high
                                   transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                      >
                        <span className="material-symbols-outlined text-[16px]">group</span>
                        Invite to Group
                        <span className="material-symbols-outlined text-[12px]">expand_more</span>
                      </button>
                      {inviteGroupDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 z-20 bg-surface-container-low
                                        border border-outline-variant rounded-xl shadow-lg min-w-[180px]">
                          {myAdminGroups.map(g => (
                            <button
                              key={g.id}
                              onClick={() => handleInviteToGroup(g.id)}
                              disabled={!!g.members[uid]}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant
                                         hover:bg-surface-container rounded-xl transition-colors
                                         disabled:opacity-40 disabled:cursor-not-allowed first:rounded-t-xl last:rounded-b-xl"
                            >
                              {g.name}
                              {g.members[uid] && (
                                <span className="ml-auto text-[10px] text-on-surface-variant">Already member</span>
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
                                 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                 : 'bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-error'
                               }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">shield</span>
                    {isBlockedByMe ? 'Unblock' : 'Block'}
                  </button>

                  {/* Report */}
                  <button
                    onClick={handleReport}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium
                               bg-surface-container text-on-surface-variant
                               hover:bg-orange-50 hover:text-orange-600
                               transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
                  >
                    <span className="material-symbols-outlined text-[16px]">flag</span>
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

      <ConfirmDialog
        open={blockConfirmOpen}
        title="Block User"
        message={`Block ${targetProfile?.displayName ?? uid}? They will no longer appear in your community.`}
        confirmLabel="Block"
        variant="danger"
        onConfirm={confirmBlock}
        onCancel={() => setBlockConfirmOpen(false)}
      />
    </div>
  );
}
