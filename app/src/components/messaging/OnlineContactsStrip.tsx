import { useMessaging } from '../../contexts/MessagingContext';
import { isOnline } from '../../utils/presence';

interface ProfileEntry {
  displayName: string;
  avatarUrl?: string;
  lastSeen?: number;
}

interface OnlineContactsStripProps {
  profileCache: Record<string, ProfileEntry>;
}

export function OnlineContactsStrip({ profileCache }: OnlineContactsStripProps) {
  const { conversations, setActiveUid } = useMessaging();

  const recent = [...(conversations ?? [])]
    .sort((a: any, b: any) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0))
    .slice(0, 6)
    .map((c: any) => ({ uid: c.otherUid, ...profileCache[c.otherUid] }))
    .filter(c => c.displayName);

  if (recent.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide mb-1.5">Recent</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recent.map(contact => (
          <button
            key={contact.uid}
            onClick={() => setActiveUid(contact.uid)}
            className="flex flex-col items-center gap-1 shrink-0 group"
          >
            <div className="relative">
              {contact.avatarUrl ? (
                <img src={contact.avatarUrl} alt={contact.displayName} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-emerald-400 transition-all" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:ring-2 group-hover:ring-emerald-400 transition-all">
                  {contact.displayName?.[0]?.toUpperCase()}
                </div>
              )}
              {isOnline(contact.lastSeen) && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-neutral-800" />
              )}
            </div>
            <span className="text-[9px] text-neutral-500 dark:text-neutral-400 w-10 truncate text-center">{contact.displayName?.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
