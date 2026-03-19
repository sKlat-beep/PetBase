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
      <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">Recent</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {recent.map(contact => (
          <button
            key={contact.uid}
            onClick={() => setActiveUid(contact.uid)}
            className="flex flex-col items-center gap-1 shrink-0 group"
          >
            <div className="relative">
              {contact.avatarUrl ? (
                <img src={contact.avatarUrl} alt={contact.displayName} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 group-hover:ring-primary transition-all" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-sm font-bold text-on-primary-container group-hover:ring-2 group-hover:ring-primary transition-all">
                  {contact.displayName?.[0]?.toUpperCase()}
                </div>
              )}
              {isOnline(contact.lastSeen) && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-surface" />
              )}
            </div>
            <span className="text-[9px] text-on-surface-variant w-10 truncate text-center">{contact.displayName?.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
