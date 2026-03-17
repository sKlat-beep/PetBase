import { useState, useEffect, useCallback } from 'react';
import {
  collection, doc, query, where, getDocs, getDoc, updateDoc, deleteDoc,
  orderBy, Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { deleteGroupComment, fetchPublicProfileById } from '../../lib/firestoreService';
import { useCommunity } from '../../contexts/CommunityContext';
import { useSocial } from '../../contexts/SocialContext';
import type { Report } from '../../lib/reportService';
import {
  AlertTriangle, Flag, BarChart2, ShieldOff, Loader2,
  CheckCircle, Trash2, XCircle, RefreshCw,
} from 'lucide-react';

interface ModerationPanelProps {
  groupId: string;
}

interface ReportWithName extends Report {
  reporterName: string;
  contentAuthorId?: string; // resolved from target doc when available
}

interface FlaggedPost {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  flagCount: number;
}

interface ReporterActivity {
  uid: string;
  displayName: string;
  count: number;
}

type ActionState = Record<string, 'loading' | 'done' | 'error'>;

export default function ModerationPanel({ groupId }: ModerationPanelProps) {
  const { groups, banMember, unbanMember } = useCommunity();
  const { directory } = useSocial();

  const group = groups.find(g => g.id === groupId);
  const bannedMembers = group?.bannedMembers ?? [];

  const [pendingReports, setPendingReports] = useState<ReportWithName[]>([]);
  const [flaggedPosts, setFlaggedPosts] = useState<FlaggedPost[]>([]);
  const [reporterActivity, setReporterActivity] = useState<ReporterActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>({});
  const [bannedMemberNames, setBannedMemberNames] = useState<Record<string, string>>({});

  const resolveDisplayName = useCallback((uid: string): string => {
    const found = directory.find(p => p.uid === uid);
    return found?.displayName ?? uid.substring(0, 8) + '…';
  }, [directory]);

  // Resolve display names for banned members not already in the social directory
  useEffect(() => {
    const unresolvedUids = bannedMembers.filter(
      uid => !directory.find(p => p.uid === uid) && !(uid in bannedMemberNames),
    );
    if (unresolvedUids.length === 0) return;

    let cancelled = false;
    Promise.all(
      unresolvedUids.map(uid =>
        fetchPublicProfileById(uid)
          .then(profile => ({ uid, name: profile?.displayName ?? null }))
          .catch(() => ({ uid, name: null })),
      ),
    ).then(results => {
      if (cancelled) return;
      const updates: Record<string, string> = {};
      results.forEach(({ uid, name }) => {
        updates[uid] = name ?? uid.substring(0, 8) + '…';
      });
      setBannedMemberNames(prev => ({ ...prev, ...updates }));
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannedMembers, directory]);

  const resolveBannedName = (uid: string): string => {
    const found = directory.find(p => p.uid === uid);
    if (found) return found.displayName;
    return bannedMemberNames[uid] ?? uid.substring(0, 8) + '…';
  };

  const setAction = (key: string, state: 'loading' | 'done' | 'error') => {
    setActionState(prev => ({ ...prev, [key]: state }));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ninetyDaysAgo = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const [reportsSnap, flaggedSnap, activitySnap] = await Promise.all([
        // Pending reports for this group
        getDocs(
          query(
            collection(db, 'reports'),
            where('groupId', '==', groupId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc'),
          ),
        ),
        // Flagged posts in this group
        getDocs(
          query(
            collection(db, 'groups', groupId, 'posts'),
            where('isFlagged', '==', true),
          ),
        ),
        // Reports in last 90 days for reporter activity
        getDocs(
          query(
            collection(db, 'reports'),
            where('groupId', '==', groupId),
            where('createdAt', '>=', ninetyDaysAgo.toMillis()),
            orderBy('createdAt', 'desc'),
          ),
        ),
      ]);

      // Pending reports with resolved reporter names
      const reports: ReportWithName[] = reportsSnap.docs.map(d => {
        const data = d.data() as Omit<Report, 'id'>;
        return {
          ...data,
          id: d.id,
          reporterName: resolveDisplayName(data.reporterUid),
        };
      });
      setPendingReports(reports);

      // Flagged posts
      const posts: FlaggedPost[] = flaggedSnap.docs.map(d => {
        const data = d.data() as {
          content: string;
          authorId: string;
          authorName: string;
          flagCount?: number;
        };
        return {
          id: d.id,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          flagCount: data.flagCount ?? 1,
        };
      });
      setFlaggedPosts(posts);

      // Reporter activity — aggregate client-side
      const counts: Record<string, number> = {};
      activitySnap.docs.forEach(d => {
        const uid = (d.data() as Omit<Report, 'id'>).reporterUid;
        counts[uid] = (counts[uid] ?? 0) + 1;
      });
      const activity: ReporterActivity[] = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([uid, count]) => ({
          uid,
          displayName: resolveDisplayName(uid),
          count,
        }));
      setReporterActivity(activity);
    } catch (err) {
      console.error('[ModerationPanel] loadData error', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, resolveDisplayName]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Report actions ---

  const handleDismissReport = async (reportId: string) => {
    setAction(reportId, 'loading');
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'dismissed' });
      setPendingReports(prev => prev.filter(r => r.id !== reportId));
      setAction(reportId, 'done');
    } catch {
      setAction(reportId, 'error');
    }
  };

  const handleDeleteContent = async (report: ReportWithName) => {
    if (!confirm('Delete this content? This cannot be undone.')) return;
    const key = `del-${report.id}`;
    setAction(key, 'loading');
    try {
      if (report.targetType === 'post') {
        await deleteDoc(doc(db, 'groups', groupId, 'posts', report.targetId));
        setFlaggedPosts(prev => prev.filter(p => p.id !== report.targetId));
      } else if (report.targetType === 'comment' && report.parentPostId) {
        await deleteGroupComment(groupId, report.parentPostId, report.targetId);
      }
      await updateDoc(doc(db, 'reports', report.id), { status: 'reviewed' });
      setPendingReports(prev => prev.filter(r => r.id !== report.id));
      setAction(key, 'done');
    } catch {
      setAction(key, 'error');
    }
  };

  const handleBanFromReport = async (report: ReportWithName) => {
    // We need the author of the reported content. For posts it's in the post doc.
    // For simplicity, look it up from flaggedPosts cache first, then fetch if needed.
    if (!confirm('Ban the author of this content? They will be removed from the group.')) return;
    const key = `ban-${report.id}`;
    setAction(key, 'loading');
    try {
      let authorId: string | undefined;
      if (report.targetType === 'post') {
        const cached = flaggedPosts.find(p => p.id === report.targetId);
        if (cached) {
          authorId = cached.authorId;
        } else {
          const snap = await getDocs(
            query(
              collection(db, 'groups', groupId, 'posts'),
              where('__name__', '==', report.targetId),
            ),
          );
          if (!snap.empty) authorId = (snap.docs[0].data() as { authorId: string }).authorId;
        }
      } else if (report.targetType === 'comment' && report.parentPostId) {
        const commentDoc = await getDoc(
          doc(db, 'groups', groupId, 'posts', report.parentPostId, 'comments', report.targetId),
        );
        if (commentDoc.exists()) authorId = (commentDoc.data() as { authorId: string }).authorId;
      }
      if (!authorId) {
        setAction(key, 'error');
        return;
      }
      await banMember(groupId, authorId);
      setAction(key, 'done');
    } catch {
      setAction(key, 'error');
    }
  };

  // --- Flagged post actions ---

  const handleClearFlag = async (postId: string) => {
    const key = `flag-${postId}`;
    setAction(key, 'loading');
    try {
      await updateDoc(doc(db, 'groups', groupId, 'posts', postId), {
        isFlagged: false,
        flagCount: 0,
      });
      setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
      setAction(key, 'done');
    } catch {
      setAction(key, 'error');
    }
  };

  const handleDeleteFlaggedPost = async (postId: string) => {
    if (!confirm('Delete this flagged post? This cannot be undone.')) return;
    const key = `delflag-${postId}`;
    setAction(key, 'loading');
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'posts', postId));
      setFlaggedPosts(prev => prev.filter(p => p.id !== postId));
      setAction(key, 'done');
    } catch {
      setAction(key, 'error');
    }
  };

  // --- Ban actions ---

  const handleUnban = async (uid: string) => {
    const key = `unban-${uid}`;
    setAction(key, 'loading');
    try {
      await unbanMember(groupId, uid);
      setAction(key, 'done');
    } catch {
      setAction(key, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        <span className="text-sm">Loading moderation data…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Section 1: Pending Reports ──────────────────────────────── */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Pending Reports
          {pendingReports.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded text-xs font-semibold">
              {pendingReports.length}
            </span>
          )}
        </h3>

        {pendingReports.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending reports.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReports.map(report => (
              <div
                key={report.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-full uppercase tracking-wide">
                        {report.targetType}
                      </span>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {report.reason}
                      </span>
                    </div>
                    {report.detail && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 italic">
                        "{report.detail}"
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                      Reported by <span className="font-medium text-neutral-600 dark:text-neutral-300">{report.reporterName}</span>
                      {' · '}
                      {new Date(report.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    onClick={() => handleDismissReport(report.id)}
                    disabled={actionState[report.id] === 'loading'}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                  >
                    {actionState[report.id] === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    Dismiss
                  </button>

                  {(report.targetType === 'post' || report.targetType === 'comment') && (
                    <button
                      onClick={() => handleDeleteContent(report)}
                      disabled={actionState[`del-${report.id}`] === 'loading'}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                    >
                      {actionState[`del-${report.id}`] === 'loading' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Delete Content
                    </button>
                  )}

                  {(report.targetType === 'post' || report.targetType === 'comment') && (
                    <button
                      onClick={() => handleBanFromReport(report)}
                      disabled={actionState[`ban-${report.id}`] === 'loading'}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                    >
                      {actionState[`ban-${report.id}`] === 'loading' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldOff className="w-3.5 h-3.5" />
                      )}
                      Ban Author
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Flagged Content ──────────────────────────────── */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
          <Flag className="w-4 h-4 text-rose-500" />
          Flagged Content
          {flaggedPosts.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded text-xs font-semibold">
              {flaggedPosts.length}
            </span>
          )}
        </h3>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
          Posts with active flags. Comment flagging review is a future enhancement.
        </p>

        {flaggedPosts.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No flagged posts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flaggedPosts.map(post => (
              <div
                key={post.id}
                className="bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/40 shadow-sm"
              >
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      {post.authorName}
                    </span>
                    <span className="text-xs text-rose-500 dark:text-rose-400 font-semibold">
                      {post.flagCount} flag{post.flagCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
                    {post.content}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleClearFlag(post.id)}
                    disabled={actionState[`flag-${post.id}`] === 'loading'}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                  >
                    {actionState[`flag-${post.id}`] === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Clear Flag
                  </button>

                  <button
                    onClick={() => handleDeleteFlaggedPost(post.id)}
                    disabled={actionState[`delflag-${post.id}`] === 'loading'}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                  >
                    {actionState[`delflag-${post.id}`] === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Reporter Activity ────────────────────────────── */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
          <BarChart2 className="w-4 h-4 text-sky-500" />
          Reporter Activity
          <span className="text-xs font-normal normal-case text-neutral-400">(last 90 days)</span>
        </h3>

        {reporterActivity.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400">
            <p className="text-sm">No report activity in the last 90 days.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {reporterActivity.map((entry, i) => (
                <li key={entry.uid} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-neutral-400 text-right">{i + 1}.</span>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {entry.displayName}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full">
                    {entry.count} report{entry.count !== 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Section 4: Banned Members ───────────────────────────────── */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
          <ShieldOff className="w-4 h-4 text-orange-500" />
          Banned Members
          {bannedMembers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded text-xs font-semibold">
              {bannedMembers.length}
            </span>
          )}
        </h3>

        {bannedMembers.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-neutral-800 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-400">
            <p className="text-sm">No banned members.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 shadow-sm overflow-hidden">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {bannedMembers.map(uid => (
                <li key={uid} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-500 dark:text-neutral-300 shrink-0">
                      {uid.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {resolveBannedName(uid)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnban(uid)}
                    disabled={actionState[`unban-${uid}`] === 'loading'}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
                  >
                    {actionState[`unban-${uid}`] === 'loading' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Unban
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
