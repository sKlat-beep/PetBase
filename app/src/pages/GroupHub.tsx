import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useSocial } from '../contexts/SocialContext';
import { MessageSquare, Users, ArrowLeft, Settings2, ShieldAlert } from 'lucide-react';
import { useRightPanel } from '../contexts/RightPanelContext';
import { GroupHubPanel } from '../components/community/GroupHubPanel';
import { UserProfileModal } from '../components/social/UserProfileModal';
import { SkeletonPost } from '../components/ui/Skeleton';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { GroupAboutSection } from '../components/group/GroupAboutSection';
import { GroupFeedTab } from '../components/group/GroupFeedTab';
import { GroupEventsPanel } from '../components/group/GroupEventsPanel';
import { GroupMembersPanel } from '../components/group/GroupMembersPanel';

const GroupRetentionModal = lazy(() => import('../components/GroupRetentionModal').then(m => ({ default: m.GroupRetentionModal })));
const ModerationPanel = lazy(() => import('../components/community/ModerationPanel'));

export function GroupHub() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const { setContent } = useRightPanel();

    useEffect(() => {
        setContent(<GroupHubPanel />);
        return () => setContent(null);
    }, [setContent]);

    const { groups, loading: communityLoading, createPost, pinPost, deletePost, leaveGroup, joinGroup, updateMemberRole, updateGroupRetention, createEvent, rsvpEvent, deleteEvent, hasMorePosts, loadMorePosts } = useCommunity();
    const { directory } = useSocial();

    const [showRetentionModal, setShowRetentionModal] = useState(false);
    const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'feed' | 'moderation'>('feed');
    const [profileUid, setProfileUid] = useState<string | null>(null);
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    const group = useMemo(() => groups.find(g => g.id === groupId), [groups, groupId]);

    const userRole = useMemo(() => {
        if (!user || !group) return null;
        return group.members[user.uid]?.role || null;
    }, [user, group]);

    useEffect(() => {
        if (activeTab === 'moderation' && userRole !== 'Owner' && userRole !== 'Moderator') {
            setActiveTab('feed');
        }
    }, [userRole, activeTab]);

    const canManageEvents = userRole === 'Owner' || userRole === 'Moderator' || userRole === 'Event Coordinator';

    const upcomingEvents = useMemo(() => {
        if (!group) return [];
        const now = Date.now();
        return [...group.events]
            .filter(e => new Date(e.date).getTime() >= now - 86400000)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [group]);

    if (communityLoading && !group) {
        return (
            <div className="space-y-4 max-w-2xl">
                {[0, 1, 2].map(i => <SkeletonPost key={i} />)}
            </div>
        );
    }

    if (!group) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Group not found</h2>
                <Link to="/community" className="text-emerald-600 hover:underline mt-4 inline-block">Return to Community</Link>
            </div>
        );
    }

    const handleCreateEvent = async (_e: React.FormEvent, form: { title: string; date: string; location: string; description: string }) => {
        await createEvent(group.id, {
            title: form.title.trim(),
            date: new Date(form.date).toISOString(),
            location: form.location.trim(),
            description: form.description.trim(),
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-5xl mx-auto"
        >
            <header className="flex items-center gap-4">
                <button onClick={() => navigate('/community')} aria-label="Back to Community" className="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                    <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                        {group.name}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" /> {Object.keys(group.members).length} members
                        {userRole && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-md text-xs font-semibold">{userRole}</span>}
                    </p>
                </div>
                {userRole === 'Owner' && (
                    <button
                        onClick={() => setShowRetentionModal(true)}
                        aria-label="Group settings"
                        className="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                        <Settings2 className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    </button>
                )}
            </header>

            <GroupAboutSection group={group} userRole={userRole} userId={user?.uid} groupId={groupId!} />

            {/* Tab Bar -- Moderation tab only visible to Owner/Moderator */}
            {(userRole === 'Owner' || userRole === 'Moderator') && (
                <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${activeTab === 'feed' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Feed
                    </button>
                    <button
                        onClick={() => setActiveTab('moderation')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${activeTab === 'moderation' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Moderation
                    </button>
                </div>
            )}

            {/* Moderation Panel */}
            {activeTab === 'moderation' && (userRole === 'Owner' || userRole === 'Moderator') && (
                <Suspense fallback={
                    <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
                        Loading moderation panel...
                    </div>
                }>
                    <ModerationPanel groupId={group.id} />
                </Suspense>
            )}

            {activeTab === 'feed' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <GroupFeedTab
                        group={group}
                        userRole={userRole}
                        user={user}
                        profile={profile}
                        createPost={createPost}
                        pinPost={pinPost}
                        deletePost={deletePost}
                        joinGroup={joinGroup}
                        hasMorePosts={hasMorePosts}
                        loadMorePosts={loadMorePosts}
                        onProfileClick={setProfileUid}
                        onImageClick={setLightboxImageUrl}
                    />

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <GroupEventsPanel
                            group={group}
                            upcomingEvents={upcomingEvents}
                            canManageEvents={canManageEvents}
                            userRole={userRole}
                            currentUserUid={user?.uid ?? ''}
                            onCreateEvent={handleCreateEvent}
                            onRsvpEvent={rsvpEvent}
                            onDeleteEvent={deleteEvent}
                            onExpandDiscussion={setExpandedDiscussionId}
                            expandedDiscussionId={expandedDiscussionId}
                        />

                        <GroupMembersPanel
                            group={group}
                            userRole={userRole}
                            directory={directory}
                            onUpdateRole={updateMemberRole}
                            onLeaveGroup={leaveGroup}
                            navigate={navigate}
                        />
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showRetentionModal && (
                    <Suspense fallback={null}>
                        <GroupRetentionModal
                            currentDays={group.retentionDays ?? 365}
                            onSave={(days) => updateGroupRetention(group.id, days)}
                            onClose={() => setShowRetentionModal(false)}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {profileUid && (
                    <UserProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
                )}
            </AnimatePresence>

            {lightboxImageUrl && (
                <ImageLightbox
                    images={[lightboxImageUrl]}
                    initialIndex={0}
                    onClose={() => setLightboxImageUrl(null)}
                />
            )}
        </motion.div>
    );
}
