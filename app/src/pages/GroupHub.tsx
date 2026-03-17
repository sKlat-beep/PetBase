import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity, type GroupPost, type GroupMember, type GroupEvent } from '../contexts/CommunityContext';
import { useSocial } from '../contexts/SocialContext';
import type { CommunityRole } from '../contexts/CommunityContext';
import { MessageSquare, Users, Calendar, MapPin, Settings2, Trash2, Pin, ArrowLeft, Mail, Search, ChevronDown, ChevronUp, Plus, CalendarDays, UserCheck, Repeat2, ShieldAlert, Camera, Image as ImageIcon, X, LogIn } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import EventDiscussion from '../components/community/EventDiscussion';
import { useRightPanel } from '../contexts/RightPanelContext';
import { GroupHubPanel } from '../components/community/GroupHubPanel';
import MentionInput, { renderMentions, extractMentionUids } from '../components/community/MentionInput';
import { createNotification, updateGroupBannerUrl } from '../lib/firestoreService';
import { uploadGroupBanner } from '../lib/storageService';
import { UserProfileModal } from '../components/social/UserProfileModal';
import PostComments from '../components/community/PostComments';
import { SkeletonPost } from '../components/ui/Skeleton';
import { ImageLightbox } from '../components/ui/ImageLightbox';

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

    const [newPostContent, setNewPostContent] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [roleSearchQuery, setRoleSearchQuery] = useState('');
    // roleSearchQuery used for local member filtering in Assign Roles panel
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [eventForm, setEventForm] = useState({ title: '', date: '', location: '', description: '', recurring: false });
    const [eventSubmitting, setEventSubmitting] = useState(false);
    const [isAboutExpanded, setIsAboutExpanded] = useState(() => {
        return localStorage.getItem(`petbase_group_about_${groupId}`) !== 'false';
    });
    const [showRetentionModal, setShowRetentionModal] = useState(false);
    const [expandedDiscussionId, setExpandedDiscussionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'feed' | 'moderation'>('feed');
    const [profileUid, setProfileUid] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);

    // Post image attachment state
    const [postImageFile, setPostImageFile] = useState<File | null>(null);
    const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
    const postImageInputRef = useRef<HTMLInputElement>(null);

    // Clean up object URL on unmount or when preview changes
    useEffect(() => {
        return () => {
            if (postImagePreview) URL.revokeObjectURL(postImagePreview);
        };
    }, [postImagePreview]);

    const handlePostImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Revoke any existing object URL before creating a new one
        if (postImagePreview) URL.revokeObjectURL(postImagePreview);
        setPostImageFile(file);
        setPostImagePreview(URL.createObjectURL(file));
        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

    const clearPostImage = () => {
        if (postImagePreview) URL.revokeObjectURL(postImagePreview);
        setPostImageFile(null);
        setPostImagePreview(null);
    };

    // State for post image lightbox
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    // Join banner state for non-members
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    // Role search now filters locally from group.members via directory

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

    const canPin = userRole === 'Owner' || userRole === 'Moderator';
    const canDeletePost = userRole === 'Owner' || userRole === 'Moderator';
    const canManageEvents = userRole === 'Owner' || userRole === 'Moderator' || userRole === 'Event Coordinator';

    // Filter posts older than the group's configured retention period
    const recentPosts = useMemo(() => {
        if (!group) return [];
        const retentionMs = (group.retentionDays ?? 365) * 24 * 60 * 60 * 1000;
        return group.posts.filter(p => Date.now() - p.createdAt < retentionMs);
    }, [group]);

    const pinnedPosts = useMemo(() => recentPosts.filter(p => p.isPinned), [recentPosts]);
    const regularPosts = useMemo(() => recentPosts.filter(p => !p.isPinned), [recentPosts]);

    const [feedTab, setFeedTab] = useState<'recent' | 'trending'>('recent');
    const displayPosts = useMemo(() =>
        feedTab === 'trending'
            ? [...regularPosts].sort((a, b) =>
                ((b.reactions?.paw?.length ?? 0) + (b.reactions?.bone?.length ?? 0) + (b.reactions?.heart?.length ?? 0)) -
                ((a.reactions?.paw?.length ?? 0) + (a.reactions?.bone?.length ?? 0) + (a.reactions?.heart?.length ?? 0))
              )
            : regularPosts,
    [feedTab, regularPosts]);

    const upcomingEvents = useMemo(() => {
        if (!group) return [];
        const now = Date.now();
        return [...group.events]
            .filter(e => new Date(e.date).getTime() >= now - 86400000) // within past 24h or future
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

    const submitPost = async () => {
        if (isPosting) return;
        if (!newPostContent.trim() || !user) return;
        setIsPosting(true);
        const content = newPostContent.trim();
        const imageFile = postImageFile ?? undefined;
        setNewPostContent('');
        clearPostImage();
        try {
            await createPost(group.id, content, imageFile);
            const mentionedUids = extractMentionUids(content);
            for (const uid of mentionedUids) {
                if (uid !== user.uid) {
                    createNotification(uid, {
                        type: 'mention',
                        fromUid: user.uid,
                        targetType: 'post',
                        message: `${profile?.displayName ?? 'Someone'} mentioned you in ${group.name}`,
                        read: false,
                        createdAt: Date.now(),
                    }).catch(() => {});
                }
            }
        } finally {
            setIsPosting(false);
        }
    };

    const handlePost = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitPost();
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventForm.title.trim() || !eventForm.date || eventSubmitting) return;
        setEventSubmitting(true);
        await createEvent(group.id, {
            title: eventForm.title.trim(),
            date: new Date(eventForm.date).toISOString(),
            location: eventForm.location.trim(),
            description: eventForm.description.trim(),
        });
        setEventSubmitting(false);
        setEventForm({ title: '', date: '', location: '', description: '', recurring: false });
        setShowCreateEvent(false);
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.uid) return;
        setUploadProgress(0);
        try {
            const url = await uploadGroupBanner(group.id, user.uid, file, setUploadProgress);
            await updateGroupBannerUrl(group.id, url);
        } finally {
            setUploadProgress(null);
            // Reset input so the same file can be re-selected if needed
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        }
    };

    const ownersAndMods = (Object.values(group.members) as GroupMember[]).filter(m => m.role === 'Owner' || m.role === 'Moderator');

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

            {/* Minimizable About Section */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
                {/* Banner image area */}
                <div className="relative h-32 w-full group/banner">
                    {group.image ? (
                        <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600" />
                    )}
                    {userRole === 'Owner' && (
                        <>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => bannerInputRef.current?.click()}
                                    className="bg-white/90 text-neutral-700 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white transition-colors"
                                >
                                    <Camera className="w-3.5 h-3.5" /> Change Banner
                                </button>
                            </div>
                            {uploadProgress !== null && (
                                <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1">
                                    <div className="h-1 bg-emerald-400 rounded" style={{ width: `${uploadProgress}%` }} />
                                </div>
                            )}
                        </>
                    )}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                <button
                    onClick={() => {
                        const next = !isAboutExpanded;
                        setIsAboutExpanded(next);
                        localStorage.setItem(`petbase_group_about_${groupId}`, String(next));
                    }}
                    className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <img src={group.image} alt={group.name} className="w-10 h-10 rounded-xl object-cover" />
                        <h3 className="font-bold text-neutral-900 dark:text-neutral-100">About Group</h3>
                    </div>
                    {isAboutExpanded ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                </button>
                <AnimatePresence>
                    {isAboutExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-5 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                                <p className="text-sm text-neutral-600 dark:text-neutral-400">{group.description}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Tab Bar — Moderation tab only visible to Owner/Moderator */}
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
                        Loading moderation panel…
                    </div>
                }>
                    <ModerationPanel groupId={group.id} />
                </Suspense>
            )}

            {activeTab === 'feed' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Feed Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Join banner for non-members */}
                    {!userRole && (
                        <div className="relative bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
                            <div className="h-24 w-full">
                                {group.image ? (
                                    <img src={group.image} alt="" className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-600 opacity-60" />
                                )}
                            </div>
                            <div className="p-5 -mt-6 relative">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{group.name}</h3>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{group.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="text-xs text-neutral-400 dark:text-neutral-500">{Object.keys(group.members).length} members</span>
                                    {group.tags.length > 0 && (
                                        <div className="flex gap-1 flex-wrap">
                                            {group.tags.slice(0, 4).map(tag => (
                                                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsJoining(true);
                                        setJoinError(null);
                                        try {
                                            await joinGroup(group.id);
                                        } catch (err: any) {
                                            if (err?.message === 'BANNED') {
                                                setJoinError('You cannot join this group');
                                            } else {
                                                setJoinError('Could not join — please try again');
                                            }
                                        } finally {
                                            setIsJoining(false);
                                        }
                                    }}
                                    disabled={isJoining}
                                    className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    {isJoining ? 'Joining…' : 'Join Group'}
                                </button>
                                {joinError && <p className="text-xs text-rose-500 mt-2 text-center">{joinError}</p>}
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 text-center">You can browse posts below</p>
                            </div>
                        </div>
                    )}

                    {userRole && (
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700">
                            <form onSubmit={handlePost} className="flex gap-3">
                                <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`} alt="You" className="w-10 h-10 rounded-full bg-neutral-100" />
                                <div className="flex-1">
                                    <MentionInput
                                        value={newPostContent}
                                        onChange={setNewPostContent}
                                        onSubmit={submitPost}
                                        placeholder="Share something with the group..."
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
                                        groupId={group.id}
                                        disabled={isPosting}
                                    />

                                    {/* Image preview thumbnail */}
                                    {postImagePreview && (
                                        <div className="relative mt-2 inline-block">
                                            <img
                                                src={postImagePreview}
                                                alt="Attachment preview"
                                                className="rounded-xl max-h-40 max-w-full object-cover border border-neutral-200 dark:border-neutral-700"
                                            />
                                            <button
                                                type="button"
                                                onClick={clearPostImage}
                                                className="absolute top-1 right-1 bg-neutral-900/60 hover:bg-neutral-900/80 text-white rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                                aria-label="Remove image attachment"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2">
                                        {/* Image attach button */}
                                        <button
                                            type="button"
                                            onClick={() => postImageInputRef.current?.click()}
                                            disabled={isPosting}
                                            className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded px-1 py-1 min-h-[36px]"
                                            aria-label="Attach image"
                                        >
                                            <ImageIcon className="w-4 h-4" aria-hidden="true" />
                                            <span>Photo</span>
                                        </button>
                                        <input
                                            ref={postImageInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePostImageSelect}
                                        />

                                        <button
                                            type="submit"
                                            disabled={isPosting || !newPostContent.trim()}
                                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors min-h-[44px]"
                                        >
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Feed Tab Selector */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={() => setFeedTab('recent')}
                            className={`px-3 py-1 rounded-full text-sm ${feedTab === 'recent' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                        >Recent</button>
                        <button
                            onClick={() => setFeedTab('trending')}
                            className={`px-3 py-1 rounded-full text-sm ${feedTab === 'trending' ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}
                        >Trending</button>
                    </div>

                    {/* Pinned Posts */}
                    {pinnedPosts.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                <Pin className="w-4 h-4" /> Pinned
                            </h3>
                            {pinnedPosts.map(post => (
                                <PostCard key={post.id} post={post} groupId={group.id} canPin={canPin} canDelete={canDeletePost} pinPost={pinPost} deletePost={deletePost} isAuthor={post.authorId === user?.uid} onProfileClick={setProfileUid} currentUserUid={user?.uid ?? ''} currentUserRole={userRole ?? 'User'} isGroupMember={!!userRole} onImageClick={setLightboxImageUrl} />
                            ))}
                        </div>
                    )}

                    {/* Regular Feed */}
                    <div className="space-y-4">
                        {pinnedPosts.length > 0 && displayPosts.length > 0 && (
                            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mt-8">
                                {feedTab === 'trending' ? 'Trending Discussions' : 'Recent Discussions'}
                            </h3>
                        )}
                        {displayPosts.length === 0 && pinnedPosts.length === 0 ? (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                <EmptyState
                                    icon={<MessageSquare className="w-12 h-12" />}
                                    title="Be the first!"
                                    description="Start a conversation — share something with the group!"
                                />
                            </div>
                        ) : (
                            displayPosts.map(post => (
                                <PostCard key={post.id} post={post} groupId={group.id} canPin={canPin} canDelete={canDeletePost} pinPost={pinPost} deletePost={deletePost} isAuthor={post.authorId === user?.uid} onProfileClick={setProfileUid} currentUserUid={user?.uid ?? ''} currentUserRole={userRole ?? 'User'} isGroupMember={!!userRole} onImageClick={setLightboxImageUrl} />
                            ))
                        )}
                        {hasMorePosts[group.id] && (
                          <button
                            onClick={() => loadMorePosts(group.id)}
                            className="w-full py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-xl transition-colors"
                          >
                            Load more posts
                          </button>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">

                    {/* Events Panel */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                    <CalendarDays className="w-4 h-4 text-neutral-400" /> Events
                                </h4>
                                {canManageEvents && (
                                    <button
                                        onClick={() => setShowCreateEvent(v => !v)}
                                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        {showCreateEvent ? 'Cancel' : 'New Event'}
                                    </button>
                                )}
                            </div>

                            {/* Create Event Form */}
                            <AnimatePresence>
                                {showCreateEvent && (
                                    <motion.form
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                        onSubmit={handleCreateEvent}
                                    >
                                        <div className="space-y-2 pb-4 border-b border-neutral-100 dark:border-neutral-700 mb-4">
                                            <input
                                                type="text"
                                                required
                                                placeholder="Event title*"
                                                value={eventForm.title}
                                                onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <input
                                                type="datetime-local"
                                                required
                                                value={eventForm.date}
                                                onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Location (optional)"
                                                value={eventForm.location}
                                                onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            />
                                            <textarea
                                                placeholder="Description (optional)"
                                                value={eventForm.description}
                                                onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                                                rows={2}
                                                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                            />
                                            <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={eventForm.recurring}
                                                    onChange={e => setEventForm(f => ({ ...f, recurring: e.target.checked }))}
                                                    className="rounded accent-emerald-600"
                                                />
                                                <Repeat2 className="w-3.5 h-3.5" />
                                                Recurring event
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={!eventForm.title.trim() || !eventForm.date || eventSubmitting}
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                                            >
                                                {eventSubmitting ? 'Creating…' : 'Create Event'}
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            {/* Events List */}
                            {upcomingEvents.length === 0 ? (
                                <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-3">No upcoming events yet — check back soon!</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map(event => {
                                        const isAttending = user ? event.attendeeIds.includes(user.uid) : false;
                                        return (
                                            <div key={event.id} className="rounded-xl border border-neutral-100 dark:border-neutral-700 p-3 space-y-1.5">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100 leading-tight">{event.title}</p>
                                                    {canManageEvents && (
                                                        <button
                                                            onClick={() => confirm('Delete this event?') && deleteEvent(group.id, event.id)}
                                                            className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                                            aria-label="Delete event"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                    <Calendar className="w-3 h-3 shrink-0" />
                                                    <span>{new Date(event.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{event.location}</span>
                                                    </div>
                                                )}
                                                {event.description && (
                                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{event.description}</p>
                                                )}
                                                <div className="flex items-center justify-between pt-1">
                                                    {/* Attendee avatar row + count */}
                                                    <div className="flex items-center gap-2">
                                                        {event.attendeeIds.length > 0 ? (
                                                            <>
                                                                <div className="flex -space-x-2" aria-hidden="true">
                                                                    {event.attendeeIds.slice(0, 5).map((uid, i) => (
                                                                        <img
                                                                            key={uid}
                                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`}
                                                                            alt=""
                                                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-700"
                                                                            style={{ zIndex: 5 - i }}
                                                                        />
                                                                    ))}
                                                                    {event.attendeeIds.length > 5 && (
                                                                        <span
                                                                            className="w-6 h-6 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center text-[9px] font-semibold text-neutral-600 dark:text-neutral-300"
                                                                            style={{ zIndex: 0 }}
                                                                        >
                                                                            +{event.attendeeIds.length - 5}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                                                    {user && event.attendeeIds.includes(user.uid)
                                                                        ? event.attendeeIds.length === 1
                                                                            ? 'You\'re going'
                                                                            : `You + ${event.attendeeIds.length - 1} other${event.attendeeIds.length - 1 === 1 ? '' : 's'}`
                                                                        : `${event.attendeeIds.length} going`}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                                                                <UserCheck className="w-3 h-3" /> No RSVPs yet
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {/* Only show Discussion toggle to group members */}
                                                        {userRole && (
                                                        <button
                                                            onClick={() => setExpandedDiscussionId(prev => prev === event.id ? null : event.id)}
                                                            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${expandedDiscussionId === event.id ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                                                            aria-expanded={expandedDiscussionId === event.id}
                                                        >
                                                            <MessageSquare className="w-3 h-3" aria-hidden="true" />
                                                            Discussion
                                                        </button>
                                                        )}
                                                        {userRole && (
                                                            <button
                                                                onClick={() => rsvpEvent(group.id, event.id, !isAttending)}
                                                                className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isAttending ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                                                            >
                                                                {isAttending ? 'Going ✓' : 'RSVP'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {expandedDiscussionId === event.id && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <EventDiscussion
                                                                groupId={group.id}
                                                                eventId={event.id}
                                                                currentUserUid={user?.uid ?? ''}
                                                                attendeeIds={event.attendeeIds}
                                                                currentUserRole={userRole ?? 'User'}
                                                            />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700">
                        <div className="p-5">
                            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                                <Settings2 className="w-4 h-4 text-neutral-400" /> Leadership Team
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
                                                    <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                                        {initial}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span className="text-neutral-700 dark:text-neutral-300 font-medium text-xs">{displayName}</span>
                                                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{m.role}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate('/messages', { state: { recipientId: m.userId } })}
                                                className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                                                title={`Message ${displayName}`}
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {userRole === 'Owner' && (
                                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-neutral-400" /> Assign Roles
                                    </h4>
                                    <div className="relative mb-3">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                        <input
                                            type="text"
                                            placeholder="Search members..."
                                            value={roleSearchQuery}
                                            onChange={(e) => setRoleSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-3 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition-shadow outline-none min-h-[44px]"
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
                                                        <div key={m.userId} className="flex items-center justify-between text-sm py-2 px-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                {avatarUrl ? (
                                                                    <img src={avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                                                                        {displayName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate w-24">
                                                                    {displayName}
                                                                </span>
                                                            </div>
                                                            <select
                                                                value={m.role}
                                                                onChange={(e) => {
                                                                    const newRole = e.target.value as CommunityRole;
                                                                    if (confirm(`Change ${displayName} from ${m.role} to ${newRole}?`)) {
                                                                        updateMemberRole(group.id, m.userId, newRole);
                                                                    } else {
                                                                        // Reset the select to current value
                                                                        e.target.value = m.role;
                                                                    }
                                                                }}
                                                                className="py-1 px-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-xs font-semibold focus:ring-emerald-500 cursor-pointer text-neutral-700 dark:text-neutral-300"
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
                                                <p className="text-xs text-neutral-500 text-center py-2">No matching group members found.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {userRole && (
                                <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-700">
                                    <button
                                        onClick={async () => {
                                            try {
                                                if (!confirm('Are you sure you want to leave this group?')) return;
                                                await leaveGroup(group.id);
                                                navigate('/community');
                                            } catch (err: any) {
                                                if (err?.message === 'LAST_OWNER') {
                                                    const memberCount = Object.keys(group.members).length;
                                                    if (memberCount > 1) {
                                                        alert('You are the last owner. Promote another member to Owner using the "Assign Roles" panel before leaving, or choose "Disband Group" below.');
                                                    } else if (confirm('You are the only member. Permanently disband and delete this group?')) {
                                                        // Single member who is also owner — this path shouldn't normally trigger,
                                                        // but handle gracefully by triggering a second leave which sees isLastMember.
                                                        await leaveGroup(group.id).catch(() => {});
                                                        navigate('/community');
                                                    }
                                                }
                                            }
                                        }}
                                        className="w-full py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-sm font-medium transition-colors border border-rose-200 dark:border-rose-800"
                                    >
                                        Leave Group
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>}

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

function PostCard({ post, groupId, canPin, canDelete, pinPost, deletePost, isAuthor, onProfileClick, currentUserUid, currentUserRole, isGroupMember, onImageClick }: { key?: React.Key, post: GroupPost, groupId: string, canPin: boolean, canDelete: boolean, pinPost: any, deletePost: any, isAuthor: boolean, onProfileClick: (uid: string) => void, currentUserUid: string, currentUserRole: CommunityRole, isGroupMember: boolean, onImageClick?: (url: string) => void }) {
    return (
        <div className={`bg-white dark:bg-neutral-800 rounded-2xl p-5 shadow-sm border ${post.isPinned ? 'border-amber-200 dark:border-amber-900/50 outline outline-2 outline-amber-100 dark:outline-amber-900/30' : 'border-neutral-100 dark:border-neutral-700'}`}>
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-3">
                    <img src={post.authorImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.authorId}`} alt={post.authorName} className="w-10 h-10 rounded-full bg-neutral-100" />
                    <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                            {post.authorName} {isAuthor && <span className="text-[10px] bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-500 font-normal">You</span>}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {canPin && (
                        <button
                            onClick={() => pinPost(groupId, post.id, !post.isPinned)}
                            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${post.isPinned ? 'text-amber-500' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}`}
                            aria-label={post.isPinned ? "Unpin Post" : "Pin Post"}
                            title={post.isPinned ? "Unpin Post" : "Pin Post"}
                        >
                            <Pin className={`w-4 h-4 ${post.isPinned ? 'fill-current' : ''}`} />
                        </button>
                    )}
                    {(canDelete || isAuthor) && (
                        <button
                            onClick={() => {
                                if (confirm('Delete this post?')) deletePost(groupId, post.id);
                            }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            aria-label="Delete Post"
                            title="Delete Post"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">{renderMentions(post.content, onProfileClick)}</p>
            {post.imageUrl && (
                <img
                    src={post.imageUrl}
                    alt="Post attachment"
                    className="rounded-xl mt-3 max-h-80 w-full object-cover cursor-pointer"
                    onClick={() => onImageClick?.(post.imageUrl!)}
                />
            )}
            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-700 pt-3">
                <PostComments
                    groupId={groupId}
                    postId={post.id}
                    isGroupMember={isGroupMember}
                    currentUserUid={currentUserUid}
                    currentUserRole={currentUserRole}
                    onProfileClick={onProfileClick}
                />
            </div>
        </div>
    );
}
