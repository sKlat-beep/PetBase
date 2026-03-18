import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSearchParams, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Trash2, CheckCheck, ArrowLeft, ShieldOff, SquareCheck, Square, MoreHorizontal, Smile, Image, Search, ChevronDown, Mail, Pin, Mic, Reply, X, Pencil } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';
import { useSocial } from '../contexts/SocialContext';
import { useMessaging, type Conversation } from '../contexts/MessagingContext';
import { useRightPanel } from '../contexts/RightPanelContext';
import type { DmMessage } from '../lib/firestoreService';
import { searchPublicProfiles, reactToDm, deleteConversation, fetchPublicProfileById, updateLastActive } from '../lib/firestoreService';
import { formatLastActive } from '../utils/presence';
import { useAvatarUrl } from '../lib/useAvatarUrl';
import { Tooltip } from '../components/ui/Tooltip';
import { UserProfileModal } from '../components/social/UserProfileModal';
import ReportModal from '../components/community/ReportModal';
import { EmojiPicker } from '../components/messaging/EmojiPicker';
import { GifPicker } from '../components/messaging/GifPicker';
import { PhotoPicker } from '../components/messaging/PhotoPicker';
import { VoiceMemo } from '../components/messaging/VoiceMemo';
import { MessagesRightPanel } from '../components/messaging/MessagesRightPanel';

// ─── Conversation row ─────────────────────────────────────────────────────────
function ConversationRow({
  convo,
  displayName,
  rawAvatarUrl,
  isActive,
  currentUid,
  isBlocked,
  isPinned,
  onTogglePin,
  onClick,
}: {
  convo: Conversation;
  displayName: string;
  rawAvatarUrl: string;
  isActive: boolean;
  currentUid: string;
  isBlocked: boolean;
  isPinned: boolean;
  onTogglePin: () => void;
  onClick: () => void;
}) {
  const avatar = useAvatarUrl(convo.otherUid, rawAvatarUrl);
  const isUnread = convo.lastMessage.toUid === currentUid && !convo.lastMessage.read;
  const initials = (displayName || '?').charAt(0).toUpperCase();

  return (
    <div className={`relative group flex items-center transition-colors
      ${isActive
        ? 'bg-emerald-50 dark:bg-emerald-950/30'
        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'}`}
    >
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
      >
        {avatar ? (
          <img src={avatar} alt={displayName} width={40} height={40}
            className="w-10 h-10 rounded-full object-cover shrink-0 bg-neutral-100 dark:bg-neutral-800"
            referrerPolicy="no-referrer" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0 text-sm font-bold text-neutral-600 dark:text-neutral-300">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm truncate ${isUnread ? 'font-bold text-neutral-900 dark:text-neutral-100' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
              {isPinned && <Pin className="w-3 h-3 inline-block mr-1 text-amber-500" />}
              {displayName}
            </p>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Unread message" />
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {isBlocked ? <span className="text-rose-500 dark:text-rose-400">User Blocked</span>
              : convo.lastMessage.mediaType
                ? (convo.lastMessage.mediaType === 'gif' ? '🎞 GIF' : convo.lastMessage.mediaType === 'audio' ? '🎤 Voice' : '📷 Photo')
                : convo.lastMessage.content}
          </p>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400"
        aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
      >
        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-500 fill-amber-500' : ''}`} />
      </button>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
const REACTION_EMOJIS: Record<'paw' | 'bone' | 'heart', string> = { paw: '🐾', bone: '🦴', heart: '❤️' };
type ReactionKey = 'paw' | 'bone' | 'heart';

/** Format reactor UIDs into a human-readable tooltip string for DMs. */
function formatDmReactors(
  uids: string[],
  currentUid: string,
  otherUid: string,
  otherDisplayName: string,
): string {
  if (uids.length === 0) return '';
  const names = uids.map(uid => {
    if (uid === currentUid) return 'You';
    if (uid === otherUid) return otherDisplayName;
    return 'Someone';
  });
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} other${names.length - 2 > 1 ? 's' : ''}`;
}

function highlightText(text: string, regex: RegExp | null) {
  if (!regex || !text) return <>{text}</>;
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <mark key={i} className="bg-amber-200 dark:bg-amber-700 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

function counterColor(current: number, max: number): string {
  const remaining = max - current;
  if (remaining < 100) return 'text-red-500 dark:text-red-400 font-semibold';
  if (remaining < 400) return 'text-amber-500 dark:text-amber-400';
  return 'text-neutral-400 dark:text-neutral-500';
}

const MAX_DM = 2000;

function EditInline({ initialContent, onSave, onCancel }: { initialContent: string; onSave: (content: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initialContent);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onSave(value.trim());
          if (e.key === 'Escape') onCancel();
        }}
        maxLength={2000}
        className="w-full px-2 py-1 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <div className="flex gap-1 justify-end">
        <button onClick={onCancel} className="text-[10px] px-2 py-0.5 rounded text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700">Cancel</button>
        <button onClick={() => value.trim() && onSave(value.trim())} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600">Save</button>
      </div>
    </div>
  );
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  isMine,
  isBlocked,
  isSelected,
  selectMode,
  onToggleSelect,
  onDelete,
  onReport,
  onReply,
  onEdit,
  onCancelEdit,
  isEditing,
  currentUid,
  otherUid,
  otherDisplayName,
  threadId,
  isLastMine,
  getReactionStatus,
  highlightRegex,
  editMessage,
}: {
  message: DmMessage;
  isMine: boolean;
  isBlocked: boolean;
  isSelected: boolean;
  selectMode: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onReport: () => void;
  onReply?: () => void;
  onEdit?: () => void;
  onCancelEdit?: () => void;
  isEditing?: boolean;
  currentUid: string;
  otherUid: string;
  otherDisplayName: string;
  threadId: string;
  isLastMine: boolean;
  getReactionStatus: (messageId: string, reaction: ReactionKey) => boolean;
  highlightRegex?: RegExp | null;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
}) {
  const ts = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [longPressKey, setLongPressKey] = useState<ReactionKey | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReactionTouchStart = useCallback((k: ReactionKey) => {
    longPressTimerRef.current = setTimeout(() => setLongPressKey(k), 500);
  }, []);

  const handleReactionTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTimeout(() => setLongPressKey(null), 1500);
  }, []);

  useEffect(() => () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }, []);

  const handleReact = useCallback((reaction: ReactionKey) => {
    const alreadyReacted = getReactionStatus(message.id, reaction);
    reactToDm(threadId, message.id, currentUid, reaction, alreadyReacted).catch(() => {});
    setMenuOpen(false);
  }, [getReactionStatus, message.id, currentUid, threadId]);

  const reactionKeys: ReactionKey[] = ['paw', 'bone', 'heart'];
  const hasReactions = reactionKeys.some(k => (message.reactions?.[k]?.length ?? 0) > 0);

  const hasMedia = !!message.mediaUrl && (message.mediaType === 'gif' || message.mediaType === 'image' || message.mediaType === 'audio');
  const hasText = !!message.content && !isBlocked;
  const blockedText = isBlocked && !isMine;

  // Link preview
  const urlMatch = useMemo(() => {
    if (!message.content) return null;
    const match = message.content.match(/https?:\/\/[^\s<]+/);
    return match ? match[0] : null;
  }, [message.content]);

  const [linkPreview, setLinkPreview] = useState<{ title: string; description: string; image: string; siteName: string; url: string } | null>(
    message.linkPreview ?? null
  );

  useEffect(() => {
    if (!urlMatch || linkPreview) return;
    const fetchPreview = httpsCallable(functions, 'fetchLinkPreview');
    fetchPreview({ url: urlMatch }).then((result: any) => {
      if (result.data?.title) setLinkPreview(result.data);
    }).catch(() => {});
  }, [urlMatch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {selectMode && (
        <button
          onClick={onToggleSelect}
          aria-label={isSelected ? 'Deselect message' : 'Select message'}
          className="p-1 text-neutral-400 hover:text-emerald-500 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none shrink-0"
        >
          {isSelected ? <SquareCheck className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
        </button>
      )}
      <div className={`group max-w-[72%] ${isMine ? 'order-last' : ''}`}>
        {/* Reply-to quote */}
        {message.replyToId && (
          <div className="bg-neutral-200/50 dark:bg-neutral-700/50 rounded-lg px-2 py-1 text-xs mb-1 cursor-pointer hover:bg-neutral-200/70 dark:hover:bg-neutral-700/70 transition-colors"
            onClick={() => {
              const el = document.getElementById(`msg-${message.replyToId}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            <span className="font-medium text-neutral-500 dark:text-neutral-400">
              {message.replyToFromUid === currentUid ? 'You' : otherDisplayName}
            </span>
            <p className="text-neutral-600 dark:text-neutral-400 line-clamp-1">{message.replyToContent}</p>
          </div>
        )}

        {/* Text bubble — only if there's text content (or blocked message placeholder) */}
        {(hasText || blockedText) && (
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed
            ${isMine
              ? 'bg-emerald-500 text-white rounded-br-sm'
              : isBlocked
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 italic rounded-bl-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-sm'}`}>
            {isEditing ? (
              <EditInline
                initialContent={message.content}
                onSave={(newContent) => {
                  editMessage(message.id, newContent).catch(() => {});
                  onCancelEdit?.();
                }}
                onCancel={() => onCancelEdit?.()}
              />
            ) : (
              blockedText ? 'Message from blocked user' : (highlightRegex && message.content ? highlightText(message.content, highlightRegex) : message.content)
            )}
          </div>
        )}

        {/* Media */}
        {hasMedia && !isBlocked && message.mediaType === 'audio' ? (
          <audio src={message.mediaUrl} controls className="mt-1 max-w-[220px] h-8" />
        ) : hasMedia && !isBlocked ? (
          <img
            src={message.mediaUrl}
            alt={message.mediaType === 'gif' ? 'GIF' : 'Photo'}
            className="rounded-xl max-w-[200px] max-h-[200px] object-cover mt-1 cursor-pointer"
            loading="lazy"
          />
        ) : null}

        {/* Link preview */}
        {linkPreview && linkPreview.title && (
          <a
            href={urlMatch!}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden mt-1.5 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
          >
            {linkPreview.image && (
              <img src={linkPreview.image} alt="" className="w-full h-[120px] object-cover" loading="lazy" referrerPolicy="no-referrer" />
            )}
            <div className="px-3 py-2">
              {linkPreview.siteName && <p className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{linkPreview.siteName}</p>}
              <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 line-clamp-1">{linkPreview.title}</p>
              {linkPreview.description && <p className="text-[10px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">{linkPreview.description}</p>}
            </div>
          </a>
        )}

        {/* Reaction counts */}
        {hasReactions && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {reactionKeys.map(k => {
              const count = message.reactions?.[k]?.length ?? 0;
              if (count === 0) return null;
              const reacted = message.reactions?.[k]?.includes(currentUid) ?? false;
              const reactorUids = message.reactions?.[k] ?? [];
              const tooltipText = formatDmReactors(reactorUids, currentUid, otherUid, otherDisplayName);
              return (
                <Tooltip key={k} content={tooltipText} forceShow={longPressKey === k}>
                  <button
                    onClick={() => handleReact(k)}
                    onTouchStart={() => handleReactionTouchStart(k)}
                    onTouchEnd={handleReactionTouchEnd}
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors
                      ${reacted
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                        : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
                    aria-label={`React with ${k}`}
                  >
                    {REACTION_EMOJIS[k]} {count}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}

        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{ts}</span>
          {message.editedAt && (
            <span className="text-[10px] text-neutral-400 italic">
              (edited)
            </span>
          )}
          {/* Read receipt: show below last sent message */}
          {isMine && isLastMine && message.read && (
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 flex items-center gap-0.5">
              <CheckCheck className="w-3 h-3" /> Seen
            </span>
          )}
          {!selectMode && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Message options"
                aria-expanded={menuOpen}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-300 hover:text-neutral-500 dark:hover:text-neutral-300 transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <>
                    {/* Backdrop to close menu */}
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.1 }}
                      className={`absolute z-20 bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'}
                        bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700
                        rounded-xl shadow-lg overflow-hidden min-w-[140px]`}
                    >
                      {/* Reaction picker */}
                      <div className="flex gap-1 px-2 py-2 border-b border-neutral-100 dark:border-neutral-700">
                        {reactionKeys.map(k => (
                          <button
                            key={k}
                            onClick={() => handleReact(k)}
                            aria-label={`React with ${k}`}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-base transition-colors"
                          >
                            {REACTION_EMOJIS[k]}
                          </button>
                        ))}
                      </div>
                      {/* Reply */}
                      <button
                        onClick={() => { onReply?.(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" /> Reply
                      </button>
                      {/* Edit — own messages within 15 min */}
                      {isMine && Date.now() - message.createdAt < 15 * 60 * 1000 && (
                        <button
                          onClick={() => { onEdit?.(); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {/* Delete */}
                      <button
                        onClick={() => { onDelete(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                      {/* Report */}
                      {!isMine && (
                        <button
                          onClick={() => { onReport(); setMenuOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <span className="text-orange-500">⚑</span> Report
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Thread pane ──────────────────────────────────────────────────────────────
function ThreadPane({
  otherUid,
  displayName,
  rawAvatarUrl,
  isBlocked,
  onBack,
  onViewProfile,
}: {
  otherUid: string;
  displayName: string;
  rawAvatarUrl: string;
  isBlocked: boolean;
  onBack: () => void;
  onViewProfile: () => void;
}) {
  const { user } = useAuth();
  const { threadMessages, sendMessage, deleteMessage, editMessage, markRead, otherUserTyping, notifyTyping } = useMessaging();
  const [text, setText] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; fromUid: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const getReactionStatus = useCallback((messageId: string, reaction: ReactionKey) => {
    const msg = threadMessages.find(m => m.id === messageId);
    return msg?.reactions?.[reaction]?.includes(user?.uid ?? '') ?? false;
  }, [threadMessages, user?.uid]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const avatar = useAvatarUrl(otherUid, rawAvatarUrl);
  const [otherUserProfile, setOtherUserProfile] = useState<{
    lastSeen?: number;
    lastActive?: number;
    showLastActive?: boolean;
    visibility?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPublicProfileById(otherUid).then(p => {
      if (!cancelled) setOtherUserProfile(p ? {
        lastSeen: p.lastSeen,
        lastActive: p.lastActive,
        showLastActive: p.showLastActive,
        visibility: p.visibility,
      } : null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [otherUid]);

  // Update caller's lastActive on thread open (throttled to 5 min)
  useEffect(() => {
    if (user?.uid) {
      updateLastActive(user.uid).catch(() => {});
    }
  }, [user?.uid, otherUid]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJumpToLatest(distFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showSearch]);

  // Derive threadId and last-mine message id
  const threadId = user ? [user.uid, otherUid].sort().join('_') : '';
  const lastMineId = useMemo(() => {
    for (let i = threadMessages.length - 1; i >= 0; i--) {
      if (threadMessages[i].fromUid === user?.uid) return threadMessages[i].id;
    }
    return null;
  }, [threadMessages, user]);

  // Mark unread messages as read on open
  useEffect(() => {
    if (!user) return;
    threadMessages
      .filter(m => m.toUid === user.uid && !m.read)
      .forEach(m => markRead(m.id).catch(() => {}));
  }, [threadMessages, user, markRead]);

  // Scroll to bottom on new messages only if user is already near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 100) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages.length]);

  // Filtered messages for search
  const q = searchQuery.trim().toLowerCase();
  const highlightRegex = useMemo(() => {
    if (!q) return null;
    return new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  }, [q]);
  const displayMessages = q
    ? threadMessages.filter(m =>
        m.content?.toLowerCase().includes(q) ||
        (m.mediaType && m.mediaType.includes(q))
      )
    : threadMessages;
  const matchCount = q ? displayMessages.length : 0;

  // Virtualizer for the DM message list.
  // Messages are ordered oldest-to-newest (newest at bottom), so we virtualise in natural order.
  // NOTE: auto-scroll-to-bottom via bottomRef and jump-to-latest via scrollRef still function
  // because both operate on the same scrollRef element that the virtualizer uses.
  const messageVirtualizer = useVirtualizer({
    count: displayMessages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    await Promise.all(
      Array.from(selected).map(id => {
        const m = threadMessages.find(m => m.id === id);
        if (!m) return Promise.resolve();
        return deleteMessage(id, m.fromUid);
      })
    );
    setSelected(new Set());
    setSelectMode(false);
  }, [selected, threadMessages, deleteMessage]);

  const handleBulkMarkRead = useCallback(async () => {
    await Promise.all(Array.from(selected).map(id => markRead(id)));
    setSelected(new Set());
    setSelectMode(false);
  }, [selected, markRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isBlocked) return;
    sendMessage(otherUid, text.trim(), undefined, replyingTo ?? undefined).catch(() => {});
    setText('');
    setReplyingTo(null);
  };

  const insertEmoji = useCallback((emoji: string) => {
    const input = inputRef.current;
    if (!input) { setText(prev => prev + emoji); setShowEmoji(false); return; }
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + emoji + text.slice(end);
    setText(newText);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
    setShowEmoji(false);
  }, [text]);

  const initials = (displayName || '?').charAt(0).toUpperCase();

  return (
    <div className="relative flex flex-col h-full">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="md:hidden p-2 -ml-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 focus-visible:ring-2 focus-visible:ring-sky-500 outline-none rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onViewProfile}
          aria-label={`View ${displayName}'s profile`}
          className="shrink-0 focus-visible:ring-2 focus-visible:ring-sky-500 outline-none rounded-full"
        >
          {avatar ? (
            <img src={avatar} alt={displayName} width={36} height={36}
              className="w-9 h-9 rounded-full object-cover bg-neutral-100 hover:ring-2 hover:ring-emerald-400 transition-shadow"
              referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:ring-2 hover:ring-emerald-400 transition-shadow">
              {initials}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={onViewProfile}
            className="font-semibold text-neutral-900 dark:text-neutral-100 truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 rounded block"
          >
            {displayName}
          </button>
          {isBlocked && (
            <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
              <ShieldOff className="w-3 h-3" /> Blocked
            </p>
          )}
          {!isBlocked && otherUserProfile?.showLastActive !== false && otherUserProfile?.lastActive && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {formatLastActive(otherUserProfile.lastActive)}
            </p>
          )}
        </div>
        <button
          onClick={() => { setSelectMode(v => !v); setSelected(new Set()); }}
          aria-label={selectMode ? 'Cancel selection' : 'Select messages'}
          className={`p-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
            ${selectMode
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          <SquareCheck className="w-5 h-5" />
        </button>
        <button
          onClick={() => { setShowSearch(v => !v); setSearchQuery(''); }}
          aria-label={showSearch ? 'Close search' : 'Search messages'}
          className={`p-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
            ${showSearch
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                  placeholder="Search messages…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600
                    bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
                    placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {searchQuery.trim() && (
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  {matchCount} result{matchCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0"
          >
            <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-1">{selected.size} selected</span>
            <button
              onClick={handleBulkMarkRead}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark Read
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-medium hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages — virtualised for performance.
          The scroll container (scrollRef) retains flex-1 + overflow-y-auto so existing
          handleScroll / scrollToBottom / bottomRef logic continues to work.
          Messages display oldest-to-newest (newest at bottom); virtualizer renders in
          the same order, so the UX for normal top-to-bottom reading is unchanged. */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        {threadMessages.length === 0 && (
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="Your inbox is quiet"
            description={`Start a conversation — say hi to ${displayName}!`}
          />
        )}
        {displayMessages.length > 0 && (
          <div style={{ height: messageVirtualizer.getTotalSize(), position: 'relative' }}>
            {messageVirtualizer.getVirtualItems().map(item => {
              const m = displayMessages[item.index];
              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  ref={messageVirtualizer.measureElement}
                  data-index={item.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    transform: `translateY(${item.start}px)`,
                    width: '100%',
                    paddingBottom: '12px',
                  }}
                >
                  <MessageBubble
                    message={m}
                    isMine={m.fromUid === user?.uid}
                    isBlocked={isBlocked && m.fromUid !== user?.uid}
                    isSelected={selected.has(m.id)}
                    selectMode={selectMode}
                    onToggleSelect={() => toggleSelect(m.id)}
                    onDelete={() => deleteMessage(m.id, m.fromUid).catch(() => {})}
                    onReport={() => setReportTarget(m.id)}
                    onReply={() => setReplyingTo({ id: m.id, content: m.content, fromUid: m.fromUid })}
                    onEdit={() => setEditingId(m.id)}
                    onCancelEdit={() => setEditingId(null)}
                    isEditing={editingId === m.id}
                    currentUid={user?.uid ?? ''}
                    otherUid={otherUid}
                    otherDisplayName={displayName}
                    threadId={threadId}
                    isLastMine={m.id === lastMineId}
                    getReactionStatus={getReactionStatus}
                    highlightRegex={highlightRegex}
                    editMessage={editMessage}
                  />
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest pill */}
      <AnimatePresence>
        {showJumpToLatest && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-emerald-700 transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Jump to latest messages"
          >
            <ChevronDown className="w-3.5 h-3.5" /> New messages
          </motion.button>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {otherUserTyping && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-1 overflow-hidden shrink-0"
          >
            <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">
              {displayName} is typing…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 shrink-0">
          <Reply className="w-4 h-4 text-neutral-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Replying to {replyingTo.fromUid === user?.uid ? 'yourself' : displayName}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" aria-label="Cancel reply">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Compose */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-1.5 p-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0"
      >
        {/* Emoji button */}
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={isBlocked}
            onClick={() => { setShowEmoji(v => !v); setShowGif(false); setShowPhoto(false); }}
            aria-label="Emoji picker"
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
              hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
              focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Smile className="w-5 h-5" />
          </button>
          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
          )}
        </div>

        {/* GIF button */}
        <button
          type="button"
          disabled={isBlocked}
          onClick={() => { setShowGif(true); setShowEmoji(false); setShowPhoto(false); }}
          aria-label="GIF picker"
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
            hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
            focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
            disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <span className="text-xs font-bold tracking-wide">GIF</span>
        </button>

        {/* Photo button */}
        <button
          type="button"
          disabled={isBlocked}
          onClick={() => { setShowPhoto(true); setShowEmoji(false); setShowGif(false); setShowVoice(false); }}
          aria-label="Attach photo"
          className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300
            hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors
            focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
            disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Voice memo button */}
        <button
          type="button"
          disabled={isBlocked}
          onClick={() => { setShowVoice(true); setShowEmoji(false); setShowGif(false); setShowPhoto(false); }}
          aria-label="Record voice message"
          className={`p-2 rounded-xl transition-colors
            focus-visible:ring-2 focus-visible:ring-sky-500 outline-none
            disabled:opacity-40 disabled:cursor-not-allowed shrink-0
            ${showVoice ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Text input + counter */}
        <div className="flex-1 min-w-0 flex flex-col">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={e => { setText(e.target.value); notifyTyping(); }}
            placeholder={isBlocked ? 'You have blocked this user' : 'Type a message…'}
            disabled={isBlocked}
            maxLength={MAX_DM}
            aria-label="Message text"
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600
              bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400 text-sm
              focus:outline-none focus:ring-2 focus:ring-emerald-500
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-end mt-1">
            <span className={`text-xs ${counterColor(text.length, MAX_DM)}`}>
              {text.length} / {MAX_DM}
            </span>
          </div>
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!text.trim() || isBlocked}
          aria-label="Send message"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0
            bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40
            text-white rounded-xl transition-colors
            focus-visible:ring-2 focus-visible:ring-sky-500 outline-none"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* GIF Picker modal */}
      {showGif && (
        <GifPicker
          onSelect={(gifUrl) => {
            sendMessage(otherUid, '', { url: gifUrl, type: 'gif' }).catch(() => {});
            setShowGif(false);
          }}
          onClose={() => setShowGif(false)}
        />
      )}

      {/* Photo Picker modal */}
      {showPhoto && (
        <PhotoPicker
          onSelect={(photoUrl) => {
            sendMessage(otherUid, '', { url: photoUrl, type: 'image' }).catch(() => {});
            setShowPhoto(false);
          }}
          onClose={() => setShowPhoto(false)}
        />
      )}

      {/* Voice Memo */}
      {showVoice && user && (
        <VoiceMemo
          senderUid={user.uid}
          recipientUid={otherUid}
          onSend={(audioUrl) => {
            sendMessage(otherUid, '', { url: audioUrl, type: 'audio' }).catch(() => {});
            setShowVoice(false);
          }}
          onClose={() => setShowVoice(false)}
        />
      )}

      {/* Report modal */}
      <ReportModal
        open={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType="dm"
        targetId={reportTarget ?? ''}
      />
    </div>
  );
}

// ─── Profile name/avatar cache (looks up displayName from search) ─────────────
function useProfileCache(uids: string[], refreshKey?: number) {
  const [cache, setCache] = useState<Record<string, { displayName: string; avatarUrl: string }>>({});
  const prevUidsRef = useRef('');

  useEffect(() => {
    if (uids.length === 0) return;
    const key = [...uids].sort().join(',');
    if (key === prevUidsRef.current && !refreshKey) return;
    prevUidsRef.current = key;
    searchPublicProfiles('').then(profiles => {
      const map: Record<string, { displayName: string; avatarUrl: string }> = {};
      profiles.forEach(p => {
        if (uids.includes(p.uid)) {
          map[p.uid] = { displayName: p.displayName, avatarUrl: p.avatarUrl };
        }
      });
      setCache(map);
    }).catch(() => {});
  }, [uids, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return cache;
}

// ─── Main Messages page ───────────────────────────────────────────────────────
export function Messages() {
  const { user, profile } = useAuth();
  const { conversations, setActiveUid, activeUid, threadMessages, pinnedThreadIds, togglePin } = useMessaging();
  const { blockUser, sendFriendRequest } = useSocial();
  const { setContent } = useRightPanel();
  const blockedUsers: string[] = profile?.blockedUsers ?? [];

  // Mobile: show thread vs list
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const [profileModalUid, setProfileModalUid] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [convoRefreshKey, setConvoRefreshKey] = useState(0);
  const convoListRef = useRef<HTMLDivElement>(null);

  const handleConvoRefresh = useCallback(async () => {
    setConvoRefreshKey(k => k + 1);
  }, []);

  usePullToRefresh({ onRefresh: handleConvoRefresh, containerRef: convoListRef });

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const uid = searchParams.get('uid');
    if (uid) {
      setActiveUid(uid);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, setActiveUid]);

  // Handle recipientId from navigation state (e.g. from GroupHub Contact button)
  useEffect(() => {
    const recipientId = (location.state as any)?.recipientId;
    if (recipientId) {
      setActiveUid(recipientId);
      setMobileView('thread');
      // Clear the state so it doesn't re-trigger on re-renders
      window.history.replaceState({}, '');
    }
  }, [location.state, setActiveUid]);

  const otherUids = useMemo(
    () => [...new Set([
      ...conversations.map((c: any) => c.otherUid),
      ...(profile?.friends ?? []).slice(0, 20),
    ])],
    [conversations, profile?.friends],
  );
  const profileCache = useProfileCache(otherUids, convoRefreshKey);

  const handleSelectConvo = useCallback((uid: string) => {
    setActiveUid(uid);
    setMobileView('thread');
  }, [setActiveUid]);

  const handleBack = useCallback(() => {
    setActiveUid(null);
    setMobileView('list');
  }, [setActiveUid]);

  const activeDisplayName = activeUid ? (profileCache[activeUid]?.displayName ?? activeUid) : '';
  const activeRawAvatar = activeUid ? (profileCache[activeUid]?.avatarUrl ?? '') : '';
  const activeIsBlocked = activeUid ? blockedUsers.includes(activeUid) : false;

  // Split conversations into main and message requests
  const [mainConvos, requestConvos] = useMemo(() => {
    const friendSet = new Set(profile?.friends ?? []);
    const main: any[] = [], requests: any[] = [];
    conversations.forEach((c: any) => {
      if (!friendSet.has(c.otherUid)) {
        requests.push(c);
      } else {
        main.push(c);
      }
    });
    return [main, requests];
  }, [conversations, profile?.friends]);

  const activeIsRequest = requestConvos.some((c: any) => c.otherUid === activeUid);

  // Inject right panel content
  useEffect(() => {
    setContent(
      <MessagesRightPanel
        activeUid={activeUid}
        displayName={activeDisplayName}
        rawAvatarUrl={activeRawAvatar}
        threadMessages={threadMessages}
        onViewProfile={() => { if (activeUid) setProfileModalUid(activeUid); }}
        onBlock={() => { if (activeUid) blockUser(activeUid).catch(() => {}); }}
        onReport={() => { if (activeUid) setReportTarget(activeUid); }}
        friendUids={(profile?.friends ?? []).slice(0, 20)}
        conversationUids={conversations.map((c: any) => c.otherUid)}
      />
    );
    return () => setContent(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUid, activeDisplayName, activeRawAvatar, threadMessages, setContent, profile?.friends, conversations]);

  if (!user) return null;

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm"
    >
      {/* ── Conversation list (left pane / full-width on mobile) ── */}
      <div className={`
        flex-col border-r border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900
        w-full md:w-72 md:flex shrink-0
        ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
      `}>
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Messages
          </h1>
        </div>

        <div ref={convoListRef} className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {mainConvos.length === 0 && requestConvos.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
              <EmptyState
                icon={<Mail className="w-12 h-12" />}
                title="Your inbox is quiet"
                description="Start a conversation — your pack misses you!"
              />
              {(profile?.friends ?? []).slice(0, 3).map((uid: string) => {
                const p = profileCache[uid];
                if (!p) return null;
                return (
                  <button key={uid} onClick={() => setActiveUid(uid)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                    {(p as any).avatarUrl ? (
                      <img src={(p as any).avatarUrl} alt={p.displayName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-600 dark:text-emerald-400">{p.displayName?.[0]}</div>
                    )}
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 flex-1 text-left truncate">{p.displayName}</span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Say hi 👋</span>
                  </button>
                );
              })}
            </div>
          )}
          {requestConvos.length > 0 && (
            <>
              <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/40">
                <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Message Requests ({requestConvos.length})
                </p>
              </div>
              {requestConvos.map((convo: any) => {
                const cached = profileCache[convo.otherUid];
                return (
                  <ConversationRow
                    key={convo.threadId}
                    convo={convo}
                    displayName={cached?.displayName ?? convo.otherUid}
                    rawAvatarUrl={cached?.avatarUrl ?? ''}
                    isActive={activeUid === convo.otherUid}
                    currentUid={user.uid}
                    isBlocked={blockedUsers.includes(convo.otherUid)}
                    isPinned={pinnedThreadIds.includes(convo.threadId)}
                    onTogglePin={() => togglePin(convo.threadId)}
                    onClick={() => handleSelectConvo(convo.otherUid)}
                  />
                );
              })}
              {mainConvos.length > 0 && (
                <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/40">
                  <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                    Messages
                  </p>
                </div>
              )}
            </>
          )}
          {mainConvos.map((convo: any) => {
            const cached = profileCache[convo.otherUid];
            return (
              <ConversationRow
                key={convo.threadId}
                convo={convo}
                displayName={cached?.displayName ?? convo.otherUid}
                rawAvatarUrl={cached?.avatarUrl ?? ''}
                isActive={activeUid === convo.otherUid}
                currentUid={user.uid}
                isBlocked={blockedUsers.includes(convo.otherUid)}
                isPinned={pinnedThreadIds.includes(convo.threadId)}
                onTogglePin={() => togglePin(convo.threadId)}
                onClick={() => handleSelectConvo(convo.otherUid)}
              />
            );
          })}
        </div>
      </div>

      {/* ── Thread pane (right pane / full-width on mobile) ── */}
      <div className={`
        flex-1 flex flex-col
        ${mobileView === 'thread' || activeUid ? 'flex' : 'hidden md:flex'}
      `}>
        {activeUid ? (
          <>
            {activeIsRequest && (
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-amber-800 dark:text-amber-300">Not on your friends list — add them?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { if (activeUid) sendFriendRequest(activeUid).catch(() => {}); }}
                    className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                  >Add Friend</button>
                  <button
                    onClick={() => {
                      if (activeUid) deleteConversation(user?.uid ?? '', activeUid, threadMessages).catch(() => {});
                      setActiveUid(null);
                    }}
                    className="text-xs font-medium px-3 py-1 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
                  >Decline</button>
                </div>
              </div>
            )}
            <ThreadPane
              otherUid={activeUid}
              displayName={activeDisplayName}
              rawAvatarUrl={activeRawAvatar}
              isBlocked={activeIsBlocked}
              onBack={handleBack}
              onViewProfile={() => setProfileModalUid(activeUid)}
            />
          </>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
            <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a conversation</p>
          </div>
        )}
      </div>
    </motion.div>

    {/* UserProfileModal */}
    <AnimatePresence>
      {profileModalUid && (
        <UserProfileModal
          uid={profileModalUid}
          onClose={() => setProfileModalUid(null)}
        />
      )}
    </AnimatePresence>

    {/* Conversation-level report modal */}
    <ReportModal
      open={reportTarget !== null}
      onClose={() => setReportTarget(null)}
      targetType="dm"
      targetId={reportTarget ?? ''}
    />
    </>
  );
}
