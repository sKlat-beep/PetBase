import { useState, useMemo } from 'react';
import { Camera, ThumbsUp, Trophy, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { CommunityGroup } from '../../contexts/CommunityContext';

interface ChallengeEntry {
  id: string;
  petName: string;
  petImage?: string;
  caption: string;
  ownerId: string;
  ownerName: string;
  votes: string[];
  createdAt: number;
}

interface Challenge {
  id: string;
  theme: string;
  weekStart: number;
  entries: ChallengeEntry[];
}

const THEMES = [
  'Best Bed-Stealer',
  'Most Dramatic Vet Face',
  'Cutest Nap Position',
  'Best Trick',
  'Funniest Photo',
  'Most Photogenic',
  'Best Costume',
  'Messiest Eater',
];

const STORAGE_KEY = (groupId: string) => `petbase-challenge-${groupId}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getWeekStart(): number {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function loadChallenge(groupId: string): Challenge | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(groupId));
    if (!raw) return null;
    const c: Challenge = JSON.parse(raw);
    return c.weekStart === getWeekStart() ? c : null;
  } catch { return null; }
}

function saveChallenge(groupId: string, challenge: Challenge) {
  localStorage.setItem(STORAGE_KEY(groupId), JSON.stringify(challenge));
}

interface Props {
  group: CommunityGroup;
}

export function PhotoChallenge({ group }: Props) {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(() => loadChallenge(group.id));
  const [showCreate, setShowCreate] = useState(false);
  const [caption, setCaption] = useState('');
  const [petName, setPetName] = useState('');

  const isOwnerOrMod = user && (
    group.members[user.uid]?.role === 'Owner' ||
    group.members[user.uid]?.role === 'Moderator'
  );

  const startChallenge = (theme: string) => {
    const c: Challenge = {
      id: crypto.randomUUID(),
      theme,
      weekStart: getWeekStart(),
      entries: [],
    };
    setChallenge(c);
    saveChallenge(group.id, c);
  };

  const addEntry = () => {
    if (!user || !challenge || !petName.trim() || !caption.trim()) return;
    const entry: ChallengeEntry = {
      id: crypto.randomUUID(),
      petName: petName.trim(),
      caption: caption.trim(),
      ownerId: user.uid,
      ownerName: user.displayName || 'Anonymous',
      votes: [],
      createdAt: Date.now(),
    };
    const updated = { ...challenge, entries: [...challenge.entries, entry] };
    setChallenge(updated);
    saveChallenge(group.id, updated);
    setCaption('');
    setPetName('');
    setShowCreate(false);
  };

  const vote = (entryId: string) => {
    if (!user || !challenge) return;
    const updated = {
      ...challenge,
      entries: challenge.entries.map(e =>
        e.id === entryId && !e.votes.includes(user.uid)
          ? { ...e, votes: [...e.votes, user.uid] }
          : e
      ),
    };
    setChallenge(updated);
    saveChallenge(group.id, updated);
  };

  const sorted = challenge?.entries.slice().sort((a, b) => b.votes.length - a.votes.length) ?? [];

  return (
    <div className="bg-violet-50/50 dark:bg-violet-950/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-3">
        <Camera className="w-4 h-4 text-violet-500" /> Photo Challenge
      </h3>

      {!challenge ? (
        <div className="text-center py-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">No active challenge this week</p>
          {isOwnerOrMod && (
            <div className="space-y-2">
              <p className="text-[10px] text-stone-400">Pick a theme:</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {THEMES.map(t => (
                  <button key={t} onClick={() => startChallenge(t)}
                    className="px-2.5 py-1 text-[10px] rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50"
                  >{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-3">
            This week: "{challenge.theme}"
          </p>

          {sorted.length > 0 && (
            <div className="space-y-2 mb-3">
              {sorted.map((e, idx) => (
                <div key={e.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/60 dark:bg-stone-800/40">
                  {idx === 0 && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                  {idx > 0 && <span className="w-4 text-center text-xs text-stone-400">{idx + 1}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{e.petName}</p>
                    <p className="text-[10px] text-stone-400 truncate">{e.caption} — {e.ownerName}</p>
                  </div>
                  <button
                    onClick={() => vote(e.id)}
                    disabled={!user || e.votes.includes(user?.uid ?? '')}
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 disabled:opacity-40"
                  >
                    <ThumbsUp className="w-3 h-3" /> {e.votes.length}
                  </button>
                </div>
              ))}
            </div>
          )}

          {showCreate ? (
            <div className="space-y-2 p-3 bg-white/60 dark:bg-stone-800/40 rounded-lg">
              <input type="text" value={petName} onChange={e => setPetName(e.target.value)} placeholder="Pet name" maxLength={50}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption..." maxLength={100}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100" />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-xs text-stone-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700">Cancel</button>
                <button onClick={addEntry} disabled={!petName.trim() || !caption.trim()} className="flex-1 py-1.5 text-xs bg-violet-600 text-white rounded-lg disabled:opacity-40">Submit</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowCreate(true)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-violet-600 dark:text-violet-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> Enter the challenge
            </button>
          )}
        </>
      )}
    </div>
  );
}
