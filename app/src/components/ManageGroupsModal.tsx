import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Star, LogOut, BellRing } from 'lucide-react';
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="manage-groups-modal-title"
                    className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 w-full max-w-2xl z-10 flex flex-col max-h-[80vh]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                                <Settings2 className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                            </div>
                            <div>
                                <h2 id="manage-groups-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Your Groups</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{userGroups.length} community group{userGroups.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 space-y-4">
                        {userGroups.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-neutral-500 dark:text-neutral-400">You haven't joined any groups yet.</p>
                                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">Discover groups from the Community Hub.</p>
                            </div>
                        ) : (
                            userGroups.map(group => {
                                const isFavorite = userPreferences[group.id]?.isFavorite;
                                const isOwner = user && group.members[user.uid]?.role === 'Owner';

                                const hasNew = group.posts.length > 0 && group.posts[0].createdAt > (userPreferences[group.id]?.lastVisitedAt || 0);

                                return (
                                    <div key={group.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/50">
                                        <div className="flex items-center gap-4">
                                            <img src={group.image} alt={group.name} className="w-12 h-12 rounded-lg object-cover bg-neutral-200" referrerPolicy="no-referrer" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{group.name}</h3>
                                                    {hasNew && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center"><BellRing className="w-3 h-3 mr-1" /> New</span>}
                                                </div>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{Object.keys(group.members).length} members {isOwner && '• Owner'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleFavorite(group.id)}
                                                className={`p-2 rounded-lg border transition-colors ${isFavorite
                                                    ? 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-900/20 dark:border-amber-800'
                                                    : 'bg-white border-neutral-200 text-neutral-400 hover:text-amber-500 dark:bg-neutral-800 dark:border-neutral-600'
                                                    }`}
                                                title="Favorite"
                                            >
                                                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
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
                                                className="p-2 rounded-lg border bg-white border-neutral-200 text-neutral-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 dark:bg-neutral-800 dark:border-neutral-600 dark:hover:bg-rose-900/20 dark:hover:border-rose-800 transition-colors"
                                                title="Leave Group"
                                            >
                                                <LogOut className="w-4 h-4" />
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
