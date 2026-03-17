import { useState, useMemo, useCallback } from 'react';
import { Trophy, ThumbsUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';
import { useCommunity, type CommunityGroup } from '../../contexts/CommunityContext';

interface PetNominee {
  petId: string;
  petName: string;
  petImage?: string;
  ownerName: string;
  ownerId: string;
  votes: string[]; // UIDs who voted
}

const STORAGE_KEY = (groupId: string) => `petbase-potw-${groupId}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getCurrentWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

function loadNominees(groupId: string): { weekStart: number; nominees: PetNominee[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(groupId));
    if (raw) {
      const data = JSON.parse(raw);
      if (data.weekStart === getCurrentWeekStart()) return data;
    }
  } catch {}
  return { weekStart: getCurrentWeekStart(), nominees: [] };
}

function saveNominees(groupId: string, nominees: PetNominee[]) {
  localStorage.setItem(STORAGE_KEY(groupId), JSON.stringify({
    weekStart: getCurrentWeekStart(),
    nominees,
  }));
}

interface Props {
  group: CommunityGroup;
}

export function PetOfTheWeek({ group }: Props) {
  const { user } = useAuth();
  const { pets } = usePets();
  const [data, setData] = useState(() => loadNominees(group.id));
  const [nominating, setNominating] = useState(false);

  const hasNominated = useMemo(
    () => user && data.nominees.some(n => n.ownerId === user.uid),
    [data.nominees, user]
  );

  const hasVoted = useCallback(
    (nominee: PetNominee) => user ? nominee.votes.includes(user.uid) : false,
    [user]
  );

  const handleNominate = (petId: string) => {
    if (!user) return;
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;
    const nominee: PetNominee = {
      petId,
      petName: pet.name,
      petImage: pet.image,
      ownerName: user.displayName || 'Anonymous',
      ownerId: user.uid,
      votes: [user.uid],
    };
    const updated = [...data.nominees, nominee];
    setData({ ...data, nominees: updated });
    saveNominees(group.id, updated);
    setNominating(false);
  };

  const handleVote = (petId: string) => {
    if (!user) return;
    const updated = data.nominees.map(n =>
      n.petId === petId && !n.votes.includes(user.uid)
        ? { ...n, votes: [...n.votes, user.uid] }
        : n
    );
    setData({ ...data, nominees: updated });
    saveNominees(group.id, updated);
  };

  const sorted = [...data.nominees].sort((a, b) => b.votes.length - a.votes.length);
  const winner = sorted[0];

  return (
    <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-500" /> Pet of the Week
      </h3>

      {sorted.length === 0 ? (
        <div className="text-center py-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">No nominees this week</p>
          {!hasNominated && pets.length > 0 && (
            <button
              onClick={() => setNominating(true)}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Nominate your pet!
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.slice(0, 5).map((n, idx) => (
            <div key={n.petId} className="flex items-center gap-3">
              {idx === 0 && <span className="text-lg">🏆</span>}
              {idx === 1 && <span className="text-lg">🥈</span>}
              {idx === 2 && <span className="text-lg">🥉</span>}
              {idx > 2 && <span className="w-6 text-center text-xs text-stone-400">{idx + 1}</span>}
              {n.petImage ? (
                <img src={n.petImage} alt={n.petName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-xs font-bold">
                  {n.petName.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">{n.petName}</p>
                <p className="text-[10px] text-stone-400">by {n.ownerName}</p>
              </div>
              <button
                onClick={() => handleVote(n.petId)}
                disabled={hasVoted(n)}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-40 transition-colors"
              >
                <ThumbsUp className="w-3 h-3" /> {n.votes.length}
              </button>
            </div>
          ))}
          {!hasNominated && pets.length > 0 && (
            <button
              onClick={() => setNominating(true)}
              className="w-full text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline pt-1"
            >
              Nominate your pet
            </button>
          )}
        </div>
      )}

      {/* Nomination picker */}
      {nominating && (
        <div className="mt-3 border-t border-amber-200 dark:border-amber-800 pt-3 space-y-1">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Choose a pet to nominate:</p>
          {pets.filter(p => !p.isPrivate).map(pet => (
            <button
              key={pet.id}
              onClick={() => handleNominate(pet.id)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-left text-sm"
            >
              {pet.image ? (
                <img src={pet.image} alt={pet.name} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-600 text-[10px] font-bold flex items-center justify-center">
                  {pet.name.charAt(0)}
                </div>
              )}
              <span className="text-stone-800 dark:text-stone-200">{pet.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
