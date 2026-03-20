import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode, type KeyboardEvent } from 'react';
import { useCommunity } from '../../contexts/CommunityContext';
import { useSocial } from '../../contexts/SocialContext';
import type { CommunityRole } from '../../contexts/CommunityContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  groupId: string;
}

interface MemberSuggestion {
  uid: string;
  displayName: string;
  role: CommunityRole;
}

// ---------------------------------------------------------------------------
// Role colour helpers
// ---------------------------------------------------------------------------

function roleColor(role: CommunityRole): string {
  if (role === 'Owner') return 'bg-primary-container text-on-primary-container';
  if (role === 'Moderator') return 'bg-tertiary-container text-on-tertiary-container';
  return 'bg-surface-container text-on-surface-variant';
}

function avatarColor(role: CommunityRole): string {
  if (role === 'Owner') return 'bg-primary-container text-on-primary-container';
  if (role === 'Moderator') return 'bg-tertiary-container text-on-tertiary-container';
  return 'bg-surface-container text-on-surface-variant';
}

function counterColor(current: number, max: number): string {
  const remaining = max - current;
  if (remaining < 25) return 'text-error font-semibold';
  if (remaining < 100) return 'text-amber-500';
  return 'text-on-surface-variant';
}

const MAX_POST = 500;

// ---------------------------------------------------------------------------
// Helpers — exported for use in GroupHub and PostComments
// ---------------------------------------------------------------------------

const MENTION_TOKEN_SOURCE = String.raw`@\[([^\]]+):([^\]]+)\]`;

/**
 * Renders @[DisplayName:uid] tokens as clickable buttons; plain text as-is.
 */
export function renderMentions(
  content: string,
  onProfileClick: (uid: string) => void,
): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const re = new RegExp(MENTION_TOKEN_SOURCE, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const full = match[0];
    const displayName = match[1];
    const uid = match[2];
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <button
        key={`${uid}-${match.index}`}
        onClick={() => onProfileClick(uid)}
        className="text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
      >
        @{displayName}
      </button>,
    );
    lastIndex = match.index + full.length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
}

/**
 * Extracts all UIDs from @[DisplayName:uid] tokens.
 */
export function extractMentionUids(content: string): string[] {
  const uids: string[] = [];
  const re = new RegExp(MENTION_TOKEN_SOURCE, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    uids.push(match[2]);
  }
  return uids;
}

// ---------------------------------------------------------------------------
// MentionInput component
// ---------------------------------------------------------------------------

export default function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  className,
  rows = 3,
  groupId,
}: MentionInputProps) {
  const { groups } = useCommunity();
  const { directory } = useSocial();

  const [suggestions, setSuggestions] = useState<MemberSuggestion[]>([]);
  const [activeQuery, setActiveQuery] = useState<{ query: string; start: number } | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Build member suggestion list for this group
  const members = useMemo(
    () => groups.find(g => g.id === groupId)?.members ?? {},
    [groups, groupId],
  );

  const getMemberSuggestions = useCallback(
    (query: string): MemberSuggestion[] => {
      const results: MemberSuggestion[] = [];
      for (const [uid, member] of Object.entries(members)) {
        const profile = directory.find(d => d.uid === uid);
        const displayName = profile?.displayName ?? uid;
        if (displayName.toLowerCase().includes(query.toLowerCase())) {
          results.push({ uid, displayName, role: member.role });
        }
        if (results.length >= 5) break;
      }
      return results;
    },
    [members, directory],
  );

  function detectMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
    const before = text.slice(0, cursorPos);
    // Match @ followed by non-space chars (including empty) at end of typed text
    const match = before.match(/@(\S*)$/);
    if (!match) return null;
    const start = before.length - match[0].length;
    return { query: match[1], start };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    const cursor = e.target.selectionStart ?? newValue.length;

    onChange(newValue);

    const detected = detectMentionQuery(newValue, cursor);
    if (detected) {
      setActiveQuery(detected);
      setSuggestions(getMemberSuggestions(detected.query));
      setHighlightIndex(0);
    } else {
      setActiveQuery(null);
      setSuggestions([]);
    }
  }

  function insertMention(member: MemberSuggestion) {
    if (!activeQuery) return;
    const token = `@[${member.displayName}:${member.uid}]`;
    const before = value.slice(0, activeQuery.start);
    // +1 for the '@' character itself
    const after = value.slice(activeQuery.start + activeQuery.query.length + 1);
    const newValue = before + token + ' ' + after;
    onChange(newValue);

    const newCursor = before.length + token.length + 1;
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });

    setActiveQuery(null);
    setSuggestions([]);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (suggestions[highlightIndex]) {
          insertMention(suggestions[highlightIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setActiveQuery(null);
        setSuggestions([]);
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  }

  // Close dropdown when clicking outside the root element
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setActiveQuery(null);
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, []);

  // Compute fixed dropdown position when suggestions appear
  useEffect(() => {
    if (suggestions.length > 0 && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY, left: rect.left });
    } else {
      setDropdownPos(null);
    }
  }, [suggestions.length]);

  const showDropdown = activeQuery !== null;
  const showNoResults = showDropdown && activeQuery.query.length > 0 && suggestions.length === 0;

  return (
    <div ref={rootRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={MAX_POST}
        className={className}
      />
      <div className="flex justify-end mt-1">
        <span className={`text-xs ${counterColor(value.length, MAX_POST)}`}>
          {value.length} / {MAX_POST}
        </span>
      </div>

      {/* Suggestions dropdown — rendered with fixed positioning to escape overflow-hidden ancestors */}
      {showDropdown && suggestions.length > 0 && dropdownPos && (
        <div
          className="z-50 w-64 bg-surface-container border border-outline-variant rounded-xl shadow-lg overflow-hidden"
          style={{ position: 'fixed', top: dropdownPos.top + 4, left: dropdownPos.left }}
        >
          {suggestions.map((member, idx) => (
            <button
              key={member.uid}
              type="button"
              onMouseDown={e => { e.preventDefault(); insertMention(member); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors focus-visible:outline-none
                ${idx === highlightIndex
                  ? 'bg-surface-container-highest'
                  : 'hover:bg-surface-container-high'}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor(member.role)}`}>
                {(member.displayName[0] ?? '?').toUpperCase()}
              </div>
              <span className="flex-1 text-sm text-on-surface truncate">
                {member.displayName}
              </span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${roleColor(member.role)}`}>
                {member.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results state */}
      {showNoResults && dropdownPos && (
        <div
          className="z-50 w-64 bg-surface-container border border-outline-variant rounded-xl shadow-lg overflow-hidden"
          style={{ position: 'fixed', top: dropdownPos.top + 4, left: dropdownPos.left }}
        >
          <p className="text-xs text-on-surface-variant px-3 py-2">No members found</p>
        </div>
      )}
    </div>
  );
}
