import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';
import { useSocial } from '../contexts/SocialContext';
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
                <h2 className="text-2xl font-bold text-on-surface">Group not found</h2>
                <Link to="/community" className="text-primary hover:underline mt-4 inline-block">Return to Community</Link>
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
            <header className="flex items-center gap-4 glass-card rounded-2xl p-4">
                <button onClick={() => navigate('/community')} aria-label="Back to Community" className="p-2 bg-surface-container-low rounded-xl border border-outline-variant hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant">arrow_back</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-on-surface text-glow tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
                        {group.name}
                    </h1>
                    <p className="text-on-surface-variant mt-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">group</span> {Object.keys(group.members).length} members
                        {userRole && <span className="ml-2 px-2 py-0.5 bg-primary-container text-on-primary-container rounded-md text-xs font-semibold">{userRole}</span>}
                    </p>
                </div>
                {userRole === 'Owner' && (
                    <button
                        onClick={() => setShowRetentionModal(true)}
                        aria-label="Group settings"
                        className="p-2 bg-surface-container-low rounded-xl border border-outline-variant hover:bg-surface-container transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">tune</span>
                    </button>
                )}
            </header>

            <GroupAboutSection group={group} userRole={userRole} userId={user?.uid} groupId={groupId!} />

            {/* Tab Bar -- Moderation tab only visible to Owner/Moderator */}
            {(userRole === 'Owner' || userRole === 'Moderator') && (
                <div className="flex gap-1 glass-card rounded-xl p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('feed')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${activeTab === 'feed' ? 'bg-surface-container-low text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        Feed
                    </button>
                    <button
                        onClick={() => setActiveTab('moderation')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${activeTab === 'moderation' ? 'bg-surface-container-low text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">shield</span>
                        Moderation
                    </button>
                </div>
            )}

            {/* Moderation Panel */}
            {activeTab === 'moderation' && (userRole === 'Owner' || userRole === 'Moderator') && (
                <Suspense fallback={
                    <div className="flex items-center justify-center py-16 text-on-surface-variant text-sm">
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
