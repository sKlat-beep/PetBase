import { useState, useCallback, useEffect } from 'react';
import { motion, Reorder } from 'motion/react';
import { UsersRound, Calendar, MessageSquare, PawPrint, Compass, GripVertical, Search, Heart } from 'lucide-react';
import CommunityFAB from '../components/community/CommunityFAB';
import GroupsSection from '../components/community/GroupsSection';
import PeopleSection from '../components/community/PeopleSection';
import EventsSection from '../components/community/EventsSection';
import FeedSection from '../components/community/FeedSection';
import DiscoverSection from '../components/community/DiscoverSection';
import BuddyMatchSection from '../components/community/BuddyMatchSection';
import AdoptionSection from '../components/community/AdoptionSection';
import { useRightPanel } from '../contexts/RightPanelContext';
import { CommunityHubPanel } from '../components/community/CommunityHubPanel';

const MODULE_IDS = ['groups', 'events', 'feed', 'people', 'discover', 'buddies', 'adoptions'] as const;
type ModuleId = typeof MODULE_IDS[number];

const MODULE_META: Record<ModuleId, { label: string; icon: React.ElementType; anchor: string }> = {
  groups:   { label: 'Groups',   icon: UsersRound,    anchor: 'groups' },
  events:   { label: 'Events',   icon: Calendar,      anchor: 'events' },
  feed:     { label: 'Feed',     icon: MessageSquare, anchor: 'feed' },
  people:   { label: 'Friends',  icon: PawPrint,      anchor: 'people' },
  discover: { label: 'Discover', icon: Compass,       anchor: 'discover' },
  buddies:   { label: 'Buddies',   icon: Heart,         anchor: 'buddies' },
  adoptions: { label: 'Adoptions', icon: Heart,         anchor: 'adoptions' },
};

const STORAGE_KEY = 'petbase-community-module-order';

function loadOrder(): ModuleId[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const isValid =
        parsed.length === MODULE_IDS.length &&
        new Set(parsed).size === MODULE_IDS.length &&
        parsed.every(id => (MODULE_IDS as readonly string[]).includes(id));
      if (isValid) return parsed as ModuleId[];
    }
  } catch {}
  return [...MODULE_IDS];
}

export default function CommunityHub() {
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(loadOrder);
  const [isReordering, setIsReordering] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { setContent } = useRightPanel();

  useEffect(() => {
    setContent(<CommunityHubPanel />);
    return () => setContent(null);
  }, [setContent]);

  const handleReorder = useCallback((newOrder: ModuleId[]) => {
    setModuleOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
  }, []);

  const scrollToSection = (anchor: string) => {
    document.getElementById(`community-section-${anchor}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      className="w-full px-4 pb-24 md:pb-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-100 dark:border-emerald-900 p-6">
        {/* Paw-pattern background */}
        <div
          className="absolute inset-0 opacity-5 dark:opacity-[0.07]"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23059669'%3E%3Cellipse cx='18' cy='12' rx='5' ry='7'/%3E%3Cellipse cx='42' cy='12' rx='5' ry='7'/%3E%3Cellipse cx='10' cy='28' rx='4' ry='6'/%3E%3Cellipse cx='50' cy='28' rx='4' ry='6'/%3E%3Cellipse cx='30' cy='40' rx='12' ry='14'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <UsersRound className="w-6 h-6 text-emerald-600" aria-hidden="true" />
              Community Hub
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Your groups, friends, and community — all in one place
            </p>
          </div>
          <button
            onClick={() => setIsReordering(r => !r)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px] ${
              isReordering
                ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                : 'bg-white/80 dark:bg-stone-800/80 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800'
            }`}
            aria-pressed={isReordering}
          >
            {isReordering ? 'Done' : 'Organize'}
          </button>
        </div>
      </div>

      {/* Reorder instruction banner */}
      {isReordering && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center justify-center mb-3 -mt-2"
        >
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
            <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
            Drag sections up or down to reorder
          </span>
        </motion.div>
      )}

      {/* Section Jump Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1" role="navigation" aria-label="Jump to section">
          {moduleOrder.map(id => {
            const meta = MODULE_META[id];
            const Icon = meta.icon;
            return (
              <button
                key={id}
                onClick={() => scrollToSection(meta.anchor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all whitespace-nowrap flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
              >
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                {meta.label}
              </button>
            );
          })}
        </div>
        {/* Group search input */}
        <div className={`relative flex items-center transition-all duration-200 flex-shrink-0 ${searchFocused ? 'w-48' : 'w-32'}`}>
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search groups…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            aria-label="Search groups"
          />
        </div>
      </div>

      {/* Modules */}
      <Reorder.Group
        axis="y"
        values={moduleOrder}
        onReorder={handleReorder}
        className="space-y-6"
      >
        {moduleOrder.map(id => (
          <Reorder.Item
            key={id}
            value={id}
            drag={isReordering ? 'y' : false}
            className={isReordering
              ? 'cursor-grab active:cursor-grabbing ring-2 ring-emerald-300 dark:ring-emerald-700 rounded-2xl relative'
              : ''}
          >
            {isReordering && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none" aria-hidden="true">
                <GripVertical className="w-5 h-5 text-stone-400 dark:text-stone-500" />
              </div>
            )}
            <div id={`community-section-${MODULE_META[id].anchor}`}>
              {id === 'groups'   && <GroupsSection groupSearch={groupSearch} />}
              {id === 'events'   && <EventsSection />}
              {id === 'feed'     && <FeedSection />}
              {id === 'people'   && <PeopleSection />}
              {id === 'discover' && <DiscoverSection />}
              {id === 'buddies'   && <BuddyMatchSection />}
              {id === 'adoptions' && <AdoptionSection />}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <CommunityFAB />
    </motion.div>
  );
}
