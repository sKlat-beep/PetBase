import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

const RECENTS_KEY = 'petbase-emoji-recents';
const MAX_RECENTS = 16;

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Recents', icon: '🕐', emojis: [] }, // populated dynamically
  { label: 'Smileys', icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫡','🤫','🤔','🫣','🤐','🤨','😐','😑','😶','🫠','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥱','😤','😭','😡'] },
  { label: 'Animals', icon: '🐾', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🐢','🐍','🦎','🐙','🦑','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐾'] },
  { label: 'Food', icon: '🍔', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🦴','🌭','🍔','🍟','🍕','🫘','🍦','🍰','🧁','🍩','🍪','☕'] },
  { label: 'Activities', icon: '⚽', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥍','🏑','🥅','⛳','🪃','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','🤺','⛹️','🏇','🧘','🏄','🏊','🚴','🧗','🏆','🥇','🎮','🎨','🎵','🎬'] },
  { label: 'Nature', icon: '🌿', emojis: ['🌵','🎄','🌲','🌳','🌴','🪵','🌱','🌿','☘️','🍀','🎍','🪴','🎋','🍃','🍂','🍁','🪻','🌺','🌸','🌼','🌻','🌹','🪷','💐','🌾','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','🌈','🌤️','⛅','☁️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🔥','💧','🌊','💨'] },
  { label: 'Objects', icon: '💡', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','💫','✨','⚡','🔥','🎉','🎊','🎁','🎀','🎗️','💡','🔑','🗝️','🔒','📱','💻','🖥️','📷','📸','🔔','📣','💊','🩺','🏠','🚗','✈️','🚀'] },
  { label: 'Symbols', icon: '💯', emojis: ['💯','💢','💬','👁️‍🗨️','💤','💮','♨️','🚫','🔇','📵','❗','❓','‼️','⁉️','💲','♻️','✅','❌','❎','➕','➖','➗','✖️','♾️','💱','🔱','📛','🔰','⭕','✳️','❇️','🔆','🔅','〽️','🔸','🔹','🔶','🔷','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔘','🔲','🔳'] },
  { label: 'Flags', icon: '🏁', emojis: ['🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇩🇪','🇫🇷','🇪🇸','🇮🇹','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇲🇽','🇷🇺','🇿🇦','🇳🇬','🇪🇬','🇰🇪','🇦🇷','🇨🇴','🇵🇪'] },
];

// Simple keyword map for search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '🐶': ['dog','puppy','pet'], '🐱': ['cat','kitten','pet'], '🐾': ['paw','pet','animal'],
  '❤️': ['heart','love'], '😂': ['laugh','funny','lol'], '😍': ['love','heart eyes'],
  '🔥': ['fire','hot','lit'], '👍': ['thumbs up','good','ok'], '🎉': ['party','celebration'],
  '😭': ['cry','sad'], '🐕': ['dog'], '🦮': ['service dog','guide dog'],
  '🐈': ['cat'], '🐇': ['rabbit','bunny'], '🐦': ['bird'],
  '🐟': ['fish'], '🦴': ['bone','dog'], '🍖': ['meat','food'],
  '💊': ['medicine','pill','health'], '🩺': ['doctor','vet','health'],
  '🏠': ['home','house'], '📷': ['camera','photo'],
  '😀': ['smile','happy'], '😃': ['grin','happy'], '😄': ['smile','happy'],
  '🥰': ['love','hearts'], '🤩': ['star','wow','excited'],
  '😘': ['kiss','love'], '😋': ['yum','delicious','food'],
  '🤔': ['think','hmm'], '😴': ['sleep','tired','zzz'],
  '🤮': ['sick','vomit'], '🤒': ['sick','fever'], '🤕': ['hurt','injury'],
  '😡': ['angry','mad'], '😤': ['frustrated','angry'],
  '🐰': ['rabbit','bunny'], '🦊': ['fox'], '🐻': ['bear'],
  '🐼': ['panda','bear'], '🐨': ['koala'], '🦁': ['lion'],
  '🐸': ['frog'], '🐵': ['monkey'], '🐧': ['penguin'],
  '🦋': ['butterfly'], '🐢': ['turtle','tortoise'], '🐍': ['snake'],
  '🐬': ['dolphin'], '🦈': ['shark'], '🐳': ['whale'],
  '🍕': ['pizza'], '🍔': ['burger','hamburger'], '🍟': ['fries'],
  '🍦': ['ice cream'], '🍰': ['cake'], '☕': ['coffee'],
  '⚽': ['soccer','football'], '🏀': ['basketball'], '🎮': ['game','gaming'],
  '🎨': ['art','paint'], '🎵': ['music','song'], '🏆': ['trophy','win'],
  '🌈': ['rainbow'], '🌸': ['flower','cherry blossom'], '🌹': ['rose','flower'],
  '⭐': ['star'], '✨': ['sparkle','magic'], '💫': ['dizzy','star'],
  '🚀': ['rocket','space'], '✈️': ['plane','travel'], '🚗': ['car'],
};

function getRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]').slice(0, MAX_RECENTS);
  } catch { return []; }
}

function addRecent(emoji: string) {
  const recents = getRecents().filter(e => e !== emoji);
  recents.unshift(emoji);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [recents, setRecents] = useState<string[]>(getRecents);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const cats = [...CATEGORIES];
    cats[0] = { ...cats[0], emojis: recents };
    return cats;
  }, [recents]);

  const handleSelect = useCallback((emoji: string) => {
    addRecent(emoji);
    setRecents(getRecents());
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const handleCategoryClick = useCallback((index: number) => {
    setActiveCategory(index);
    setSearchQuery('');
    const el = sectionRefs.current[index];
    if (el && scrollRef.current) {
      const containerTop = scrollRef.current.getBoundingClientRect().top;
      const sectionTop = el.getBoundingClientRect().top;
      scrollRef.current.scrollTop += sectionTop - containerTop;
    }
  }, []);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const allEmojis = CATEGORIES.slice(1).flatMap(c => c.emojis);
    const unique = [...new Set(allEmojis)];
    return unique.filter(emoji => {
      const keywords = EMOJI_KEYWORDS[emoji];
      if (keywords?.some(kw => kw.includes(q))) return true;
      // Also match emoji itself
      return emoji.includes(q);
    });
  }, [searchQuery]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />

      {/* Picker card */}
      <div className="absolute bottom-full mb-2 left-0 z-30 bg-surface-container border border-outline-variant rounded-2xl shadow-xl w-80 flex flex-col max-h-[360px]">
        {/* Search bar */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[14px]">search</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search emojis..."
              className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus-visible:ring-2 focus-visible:ring-primary outline-none rounded"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex gap-0.5 px-3 pb-1.5 overflow-x-auto shrink-0">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(i)}
                className={`shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none
                  ${activeCategory === i
                    ? 'bg-primary-container'
                    : 'hover:bg-surface-container-highest'}`}
                aria-label={cat.label}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Scrollable emoji body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 pb-3">
          {searchResults !== null ? (
            // Search results
            searchResults.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-6">No emojis found</p>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {searchResults.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleSelect(emoji)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl hover:bg-surface-container-highest rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                    aria-label={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )
          ) : (
            // Category sections
            categories.map((cat, i) => {
              if (i === 0 && cat.emojis.length === 0) return null; // skip empty recents
              return (
                <div
                  key={cat.label}
                  ref={el => { sectionRefs.current[i] = el; }}
                >
                  <p className="sticky top-0 bg-surface-container text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide py-1.5 z-10">
                    {cat.label}
                  </p>
                  <div className="grid grid-cols-7 gap-0.5">
                    {cat.emojis.map((emoji, j) => (
                      <button
                        key={`${emoji}-${j}`}
                        onClick={() => handleSelect(emoji)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xl hover:bg-surface-container-highest rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none"
                        aria-label={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
