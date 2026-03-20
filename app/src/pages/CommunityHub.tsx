import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, Reorder } from 'motion/react';
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
import { useCommunity } from '../contexts/CommunityContext';
import { useAuth } from '../contexts/AuthContext';

const MODULE_IDS = ['groups', 'events', 'feed', 'people', 'discover', 'buddies', 'adoptions'] as const;
type ModuleId = typeof MODULE_IDS[number];

const MODULE_META: Record<ModuleId, { label: string; icon: string; anchor: string }> = {
  groups:   { label: 'Groups',   icon: 'groups',         anchor: 'groups' },
  events:   { label: 'Events',   icon: 'calendar_month', anchor: 'events' },
  feed:     { label: 'Feed',     icon: 'chat',           anchor: 'feed' },
  people:   { label: 'Friends',  icon: 'pets',           anchor: 'people' },
  discover: { label: 'Discover', icon: 'explore',        anchor: 'discover' },
  buddies:   { label: 'Buddies',   icon: 'favorite',       anchor: 'buddies' },
  adoptions: { label: 'Adoptions', icon: 'favorite',       anchor: 'adoptions' },
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
  const { groups } = useCommunity();
  const { user } = useAuth();
  const joinedGroupCount = useMemo(() => {
    if (!user) return 0;
    return groups.filter(g => !!g.members[user.uid]).length;
  }, [groups, user]);

  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(loadOrder);
  const [isReordering, setIsReordering] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { setContent } = useRightPanel();

  // 2A: For new users with 0 groups, show Discover first
  const effectiveOrder = useMemo(() => {
    if (joinedGroupCount === 0 && !isReordering) {
      const reordered = moduleOrder.filter(id => id !== 'discover');
      return ['discover' as ModuleId, ...reordered];
    }
    return moduleOrder;
  }, [moduleOrder, joinedGroupCount, isReordering]);

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
      <div className="relative overflow-hidden rounded-2xl mb-6 glass-card bg-gradient-to-br from-primary-container to-emerald-50 border border-primary/20 p-6">
        {/* Paw-pattern background */}
        <div
          className="absolute inset-0 opacity-5"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23059669'%3E%3Cellipse cx='18' cy='12' rx='5' ry='7'/%3E%3Cellipse cx='42' cy='12' rx='5' ry='7'/%3E%3Cellipse cx='10' cy='28' rx='4' ry='6'/%3E%3Cellipse cx='50' cy='28' rx='4' ry='6'/%3E%3Cellipse cx='30' cy='40' rx='12' ry='14'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface text-glow flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
              <span className="material-symbols-outlined text-[24px] text-primary" aria-hidden="true">groups</span>
              Community Hub
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Your groups, friends, and community — all in one place
            </p>
          </div>
          <button
            onClick={() => setIsReordering(r => !r)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px] ${
              isReordering
                ? 'bg-primary text-on-primary border-primary hover:bg-primary/90'
                : 'bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container'
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
          <span className="inline-flex items-center gap-1.5 text-xs text-on-primary-container bg-primary-container border border-primary/20 px-3 py-1 rounded-full">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">drag_indicator</span>
            Drag sections up or down to reorder
          </span>
        </motion.div>
      )}

      {/* Section Jump Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1" role="navigation" aria-label="Jump to section">
          {effectiveOrder.map(id => {
            const meta = MODULE_META[id];
            return (
              <button
                key={id}
                onClick={() => scrollToSection(meta.anchor)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-card border border-outline-variant text-xs font-medium text-on-surface-variant hover:bg-primary-container hover:border-primary/20 hover:text-on-primary-container transition-all motion-safe:active:scale-[0.97] whitespace-nowrap flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 min-h-[36px]"
              >
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
        {/* Group search input */}
        <div className={`relative flex items-center transition-all duration-200 flex-shrink-0 ${searchFocused ? 'w-48' : 'w-40'}`}>
          <span className="material-symbols-outlined text-[14px] absolute left-2.5 text-on-surface-variant pointer-events-none" aria-hidden="true">search</span>
          <input
            type="search"
            value={groupSearch}
            onChange={e => setGroupSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search groups…"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            aria-label="Search groups"
          />
        </div>
      </div>

      {/* Modules */}
      <Reorder.Group
        axis="y"
        values={effectiveOrder}
        onReorder={handleReorder}
        className="space-y-6"
      >
        {effectiveOrder.map(id => (
          <Reorder.Item
            key={id}
            value={id}
            drag={isReordering ? 'y' : false}
            className={isReordering
              ? 'cursor-grab active:cursor-grabbing ring-2 ring-primary/30 rounded-2xl relative'
              : ''}
          >
            {isReordering && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none" aria-hidden="true">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">drag_indicator</span>
              </div>
            )}
            <div id={`community-section-${MODULE_META[id].anchor}`}>
              {id === 'groups'   && <GroupsSection groupSearch={groupSearch} />}
              {id === 'events'   && <EventsSection />}
              {id === 'feed'     && <FeedSection />}
              {id === 'people'   && <PeopleSection />}
              {id === 'discover' && <DiscoverSection externalSearch={groupSearch} />}
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
