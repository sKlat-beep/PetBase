import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, PawPrint, X, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePets } from '../../contexts/PetContext';

export interface PlaydateInvite {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  petIds: string[];
  petNames: string[];
  date: string;
  time: string;
  location: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}

const STORAGE_KEY = (uid: string) => `petbase-playdates-${uid}`;

function loadPlaydates(uid: string): PlaydateInvite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(uid));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePlaydates(uid: string, playdates: PlaydateInvite[]) {
  localStorage.setItem(STORAGE_KEY(uid), JSON.stringify(playdates));
}

interface Props {
  targetUid: string;
  targetName: string;
  onClose: () => void;
  onSent?: () => void;
}

export function PlaydateScheduler({ targetUid, targetName, onClose, onSent }: Props) {
  const { user } = useAuth();
  const { pets } = usePets();
  const [selectedPets, setSelectedPets] = useState<string[]>([]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const togglePet = (petId: string) => {
    setSelectedPets(prev =>
      prev.includes(petId) ? prev.filter(id => id !== petId) : [...prev, petId]
    );
  };

  const handleSend = useCallback(async () => {
    if (!user || !date || selectedPets.length === 0) return;
    setSending(true);

    const invite: PlaydateInvite = {
      id: crypto.randomUUID(),
      fromUid: user.uid,
      fromName: user.displayName || 'Someone',
      toUid: targetUid,
      petIds: selectedPets,
      petNames: selectedPets.map(id => pets.find(p => p.id === id)?.name ?? id),
      date,
      time,
      location: location.trim() || 'TBD',
      message: message.trim() || undefined,
      status: 'pending',
      createdAt: Date.now(),
    };

    // Save locally (both sender and recipient would see in their lists)
    const existing = loadPlaydates(user.uid);
    savePlaydates(user.uid, [invite, ...existing]);

    setSending(false);
    onSent?.();
    onClose();
  }, [user, date, time, location, message, selectedPets, pets, targetUid, onSent, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-700">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-rose-500" />
            Schedule Playdate with {targetName}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Pet selection */}
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">Which pets?</label>
            <div className="flex flex-wrap gap-2">
              {pets.filter(p => !p.isPrivate).map(pet => (
                <button
                  key={pet.id}
                  onClick={() => togglePet(pet.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedPets.includes(pet.id)
                      ? 'bg-rose-500 text-white'
                      : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {pet.name}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Time
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Park, trail, or address..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5 block">Message (optional)</label>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Looking forward to meeting!"
              maxLength={200}
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !date || selectedPets.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" /> Send Invite
          </button>
        </div>
      </motion.div>
    </div>
  );
}
