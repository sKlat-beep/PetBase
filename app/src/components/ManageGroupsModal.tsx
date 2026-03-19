import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';

interface ManageGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManageGroupsModal({ isOpen, onClose }: ManageGroupsModalProps) {
    const { groups, userPreferences, toggleFavorite, leaveGroup } = useCommunity();
    const { user } = useAuth();

    const userGroups = useMemo(() => {
        if (!user) return [];
        return groups.filter(g => !!g.members[user.uid]);
    }, [groups, user]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="manage-groups-modal-title"
                    className="relative bg-surface-container rounded-2xl shadow-2xl border border-outline-variant w-full max-w-2xl z-10 flex flex-col max-h-[80vh]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">tune</span>
                            </div>
                            <div>
                                <h2 id="manage-groups-modal-title" className="text-xl font-bold text-on-surface">Your Groups</h2>
                                <p className="text-sm text-on-surface-variant">{userGroups.length} community group{userGroups.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-high">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 space-y-4">
                        {userGroups.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-on-surface-variant">You haven't joined any groups yet.</p>
                                <p className="text-sm text-on-surface-variant mt-2">Discover groups from the Community Hub.</p>
                            </div>
                        ) : (
                            userGroups.map(group => {
                                const isFavorite = userPreferences[group.id]?.isFavorite;
                                const isOwner = user && group.members[user.uid]?.role === 'Owner';

                                const hasNew = group.posts.length > 0 && group.posts[0].createdAt > (userPreferences[group.id]?.lastVisitedAt || 0);

                                return (
                                    <div key={group.id} className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container">
                                        <div className="flex items-center gap-4">
                                            <img src={group.image} alt={group.name} className="w-12 h-12 rounded-lg object-cover bg-surface-container-high" referrerPolicy="no-referrer" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-on-surface">{group.name}</h3>
                                                    {hasNew && <span className="bg-primary-container text-on-primary-container text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center"><span className="material-symbols-outlined text-[12px] mr-1">notifications_active</span> New</span>}
                                                </div>
                                                <p className="text-xs text-on-surface-variant mt-1">{Object.keys(group.members).length} members {isOwner && '• Owner'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleFavorite(group.id)}
                                                className={`p-2 rounded-lg border transition-colors ${isFavorite
                                                    ? 'bg-amber-50 border-amber-200 text-amber-500'
                                                    : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-amber-500'
                                                    }`}
                                                title="Favorite"
                                            >
                                                <span className={`material-symbols-outlined text-[16px] ${isFavorite ? 'fill-1' : ''}`}>star</span>
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm(`Are you sure you want to leave ${group.name}?`)) return;
                                                    try {
                                                        await leaveGroup(group.id);
                                                    } catch (err: any) {
                                                        if (err?.message === 'LAST_OWNER') {
                                                            if (confirm(`You are the last owner of "${group.name}". Permanently disband this group? This cannot be undone.`)) {
                                                                alert('To disband the group or transfer ownership, go to the Group Hub and use the owner controls there.');
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="p-2 rounded-lg border bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-error hover:border-error/30 hover:bg-error-container transition-colors"
                                                title="Leave Group"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">logout</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
