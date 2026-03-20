import { useState } from 'react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { GroupMember, CommunityRole } from '../../contexts/CommunityContext';
import type { PublicProfile } from '../../contexts/SocialContext';

interface GroupMembersPanelProps {
  group: {
    id: string;
    members: Record<string, GroupMember>;
  };
  userRole: string | null;
  directory: PublicProfile[];
  onUpdateRole: (groupId: string, userId: string, role: CommunityRole) => void;
  onLeaveGroup: (groupId: string) => Promise<void>;
  navigate: (path: string, options?: { state?: Record<string, unknown> }) => void;
}

export function GroupMembersPanel({ group, userRole, directory, onUpdateRole, onLeaveGroup, navigate }: GroupMembersPanelProps) {
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
    confirmLabel?: string;
  } | null>(null);

  const ownersAndMods = (Object.values(group.members) as GroupMember[]).filter(
    m => m.role === 'Owner' || m.role === 'Moderator'
  );

  return (
    <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm border border-outline-variant">
      <div className="p-5">
        <h4 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">tune</span> Leadership Team
        </h4>
        <div className="space-y-3">
          {ownersAndMods.map(m => {
            const dirEntry = directory.find(p => p.uid === m.userId);
            const displayName = dirEntry?.displayName ?? m.role;
            const avatarUrl = dirEntry?.avatarUrl;
            const initial = displayName.charAt(0).toUpperCase();
            return (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant">
                      {initial}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-on-surface-variant font-medium text-xs">{displayName}</span>
                    <span className="text-xs text-on-surface-variant">{m.role}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/messages', { state: { recipientId: m.userId } })}
                  className="text-primary hover:text-primary/80 transition-colors p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  aria-label={`Message ${displayName}`}
                  title={`Message ${displayName}`}
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                </button>
              </div>
            );
          })}
        </div>

        {userRole === 'Owner' && (
          <div className="mt-6 pt-6 border-t border-outline-variant">
            <h4 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">group</span> Assign Roles
            </h4>
            <div className="relative mb-3">
              <span className="material-symbols-outlined text-[16px] absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                type="text"
                placeholder="Search members..."
                value={roleSearchQuery}
                onChange={(e) => setRoleSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-surface-container border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary transition-shadow outline-none min-h-[44px]"
              />
            </div>
            {roleSearchQuery.length > 0 && (
              <div className="space-y-2">
                {(Object.values(group.members) as GroupMember[])
                  .filter(m => {
                    const entry = directory.find(p => p.uid === m.userId);
                    const name = entry?.displayName ?? '';
                    return name.toLowerCase().includes(roleSearchQuery.toLowerCase());
                  })
                  .map(m => {
                    const entry = directory.find(p => p.uid === m.userId);
                    const displayName = entry?.displayName ?? 'Member';
                    const avatarUrl = entry?.avatarUrl;
                    return (
                      <div key={m.userId} className="flex items-center justify-between text-sm py-2 px-3 bg-surface-container rounded-lg">
                        <div className="flex items-center gap-2">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-xs font-bold text-on-surface-variant">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-on-surface-variant truncate w-24">
                            {displayName}
                          </span>
                        </div>
                        <select
                          value={m.role}
                          onChange={(e) => {
                            const newRole = e.target.value as CommunityRole;
                            const currentRole = m.role;
                            setConfirmDialog({
                              title: 'Change Role',
                              message: `Change ${displayName} from ${currentRole} to ${newRole}?`,
                              onConfirm: () => {
                                onUpdateRole(group.id, m.userId, newRole);
                                setConfirmDialog(null);
                              },
                            });
                            // Reset select visually until confirmed
                            e.target.value = currentRole;
                          }}
                          className="py-1 px-2 border border-outline-variant rounded-lg bg-surface-container-low text-xs font-semibold focus:ring-primary cursor-pointer text-on-surface-variant"
                        >
                          <option value="User">User</option>
                          <option value="Event Coordinator">Coordinator</option>
                          <option value="Moderator">Moderator</option>
                          <option value="Owner">Owner</option>
                        </select>
                      </div>
                    );
                  })}
                {(Object.values(group.members) as GroupMember[])
                  .filter(m => {
                    const entry = directory.find(p => p.uid === m.userId);
                    const name = entry?.displayName ?? '';
                    return name.toLowerCase().includes(roleSearchQuery.toLowerCase());
                  }).length === 0 && (
                  <p className="text-xs text-on-surface-variant text-center py-2">No matching group members found.</p>
                )}
              </div>
            )}
          </div>
        )}

        {userRole && (
          <div className="mt-6 pt-6 border-t border-outline-variant">
            <button
              onClick={() => {
                setConfirmDialog({
                  title: 'Leave Group',
                  message: 'Are you sure you want to leave this group?',
                  variant: 'danger',
                  confirmLabel: 'Leave',
                  onConfirm: async () => {
                    setConfirmDialog(null);
                    try {
                      await onLeaveGroup(group.id);
                      navigate('/community');
                    } catch (err: any) {
                      if (err?.message === 'LAST_OWNER') {
                        const memberCount = Object.keys(group.members).length;
                        if (memberCount > 1) {
                          setConfirmDialog({
                            title: 'Cannot Leave',
                            message: 'You are the last owner. Promote another member to Owner using the "Assign Roles" panel before leaving.',
                            confirmLabel: 'OK',
                            onConfirm: () => setConfirmDialog(null),
                          });
                        } else {
                          setConfirmDialog({
                            title: 'Disband Group',
                            message: 'You are the only member. Permanently disband and delete this group?',
                            variant: 'danger',
                            confirmLabel: 'Disband',
                            onConfirm: async () => {
                              setConfirmDialog(null);
                              await onLeaveGroup(group.id).catch(() => {});
                              navigate('/community');
                            },
                          });
                        }
                      }
                    }
                  },
                });
              }}
              className="w-full py-2 text-error hover:bg-error-container rounded-lg text-sm font-medium transition-colors border border-error/30"
            >
              Leave Group
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDialog !== null}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
