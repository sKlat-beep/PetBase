import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings2, Star, LogOut, BellRing, Compass, Plus } from 'lucide-react';
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';
import { usePets } from '../contexts/PetContext';

interface ManageGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ManageGroupsModal({ isOpen, onClose }: ManageGroupsModalProps) {
    const { groups, userPreferences, toggleFavorite, leaveGroup, joinGroup } = useCommunity();
    const { user, profile } = useAuth();
    const { pets } = usePets();
    const [activeTab, setActiveTab] = React.useState<'yours' | 'recommended'>('yours');

    const userGroups = useMemo(() => {
        if (!user) return [];
        return groups.filter(g => !!g.members[user.uid]);
    }, [groups, user]);

    const recommendedGroups = useMemo(() => {
        if (!user || !profile) return [];
        const petTypes = pets.map(p => p.type?.toLowerCase() ?? '');

        return groups.filter(g => {
            if (g.members[user.uid]) return false; // Skip if already joined

            // Simple mock recommendation logic: Check if group description or name matches pet types or zipcode
            const text = (g.name + ' ' + g.description).toLowerCase();
            const matchesPet = petTypes.some(type => text.includes(type));
            const matchesLocation = profile.zipCode && text.includes(profile.zipCode);

            // For prototype demo purposes, if it doesn't match, we still return it if we have no matches 
            // but we boost matches. Since we have mocked 3 global groups, we just return them all and sort.
            return true;
        }).sort((a, b) => {
            const aText = (a.name + ' ' + a.description).toLowerCase();
            const bText = (b.name + ' ' + b.description).toLowerCase();
            const aMatches = petTypes.some(type => aText.includes(type)) ? 1 : 0;
            const bMatches = petTypes.some(type => bText.includes(type)) ? 1 : 0;
            return bMatches - aMatches;
        });
    }, [groups, user, profile, pets]);

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
                                <h2 id="manage-groups-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Manage Groups</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">Organize your {userGroups.length} community groups</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex border-b border-neutral-100 dark:border-neutral-700 shrink-0 px-6 pt-2 gap-6 bg-neutral-50/50 dark:bg-neutral-800/50">
                        <button
                            onClick={() => setActiveTab('yours')}
                            className={`pb-3 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'yours' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                        >
                            Your Groups ({userGroups.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('recommended')}
                            className={`pb-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-1 min-w-max ${activeTab === 'recommended' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                        >
                            <Compass className="w-4 h-4" /> Recommended
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 space-y-4">
                        {activeTab === 'yours' && (
                            userGroups.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-neutral-500 dark:text-neutral-400">You haven't joined any groups yet.</p>
                                    <button onClick={() => setActiveTab('recommended')} className="mt-4 text-emerald-600 hover:underline font-medium">Browse Recommended Groups</button>
                                </div>
                            ) : (
                                userGroups.map(group => {
                                    const isFavorite = userPreferences[group.id]?.isFavorite;
                                    const isOwner = user && group.members[user.uid]?.role === 'Owner';

                                    // Simple mock for "new ping". 
                                    // Would normally compare userPreferences[group.id]?.lastVisitedAt with group.posts[0]?.createdAt
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
                                                                    // Re-trigger as last-member by first removing others isn't feasible here.
                                                                    // Instead, call leaveGroup knowing only the owner is left isn't accurate.
                                                                    // Show guidance to transfer via GroupHub instead.
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
                            )
                        )}

                        {activeTab === 'recommended' && (
                            recommendedGroups.length === 0 ? (
                                <div className="text-center py-10 flex flex-col items-center">
                                    <Compass className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-3" />
                                    <p className="text-neutral-500 dark:text-neutral-400">No new recommended groups found for your area and pets.</p>
                                </div>
                            ) : (
                                recommendedGroups.map(group => (
                                    <div key={group.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 gap-4">
                                        <div className="flex items-center gap-4">
                                            <img src={group.image} alt={group.name} className="w-16 h-16 rounded-xl object-cover bg-neutral-200 shrink-0" referrerPolicy="no-referrer" />
                                            <div>
                                                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{group.name}</h3>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{group.description}</p>
                                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{Object.keys(group.members).length} members</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => joinGroup(group.id)}
                                            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 font-medium text-sm flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                        >
                                            <Plus className="w-4 h-4" /> Join
                                        </button>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
