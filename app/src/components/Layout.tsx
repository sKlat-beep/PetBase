import { Outlet, NavLink, Link, useNavigate } from 'react-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocial, type PublicProfile } from '../contexts/SocialContext';
import { useMessaging } from '../contexts/MessagingContext';
import { HelpModal } from './HelpModal';
import { FeedbackModal } from './FeedbackModal';
import { UserSettingsModal } from './UserSettingsModal';
import { useHouseholdPermissions } from '../hooks/useHouseholdPermissions';
import { useHousehold } from '../contexts/HouseholdContext';
import { AnimatePresence } from 'motion/react';
import { NotificationBell } from './notifications/NotificationBell';
import { RightPanel } from './layout/RightPanel';
import { OfflineBanner } from './ui/OfflineBanner';
import { KeyboardShortcutsProvider } from './ui/KeyboardShortcuts';
import PointToast from './gamification/PointToast';
import PointsBadge from './gamification/PointsBadge';
import { useGamification } from '../hooks/useGamification';

/** Material Symbols helper */
function MIcon({ name, className = '' }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, profile } = useAuth();
  const { communityAccessDisabled } = useHouseholdPermissions();
  const { toast: hhToast, clearToast: clearHhToast } = useHousehold();
  // Theme is managed via CSS custom properties (data-theme attribute on <html>)
  const { searchUsers } = useSocial();
  const { totalUnread: totalUnreadMessages } = useMessaging();
  const gamification = useGamification(user?.uid ?? null);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchOpen(false); return; }
    const t = setTimeout(() => {
      searchUsers(searchQuery).then(results => {
        setSearchResults(results.filter(u => u.visibility !== 'Private'));
        setSearchOpen(true);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, searchUsers]);

  // Close search on outside click or Escape
  useEffect(() => {
    if (!searchOpen) return;
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }
    function handleClick(e: MouseEvent) { if (searchRef.current && !searchRef.current.contains(e.target as Node)) { setSearchOpen(false); } }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => { document.removeEventListener('keydown', handleKey); document.removeEventListener('mousedown', handleClick); };
  }, [searchOpen]);

  const handleSearchSelect = useCallback((uid: string) => {
    navigate(`/people?uid=${uid}`);
    setSearchOpen(false);
    setSearchQuery('');
  }, [navigate]);

  const navItems = [
    { to: '/', icon: 'dashboard', label: 'Dashboard' },
    { to: '/pets', icon: 'pets', label: 'My Pets' },
    !communityAccessDisabled && { to: '/community', icon: 'groups', label: 'Community Hub' },
    !communityAccessDisabled && { to: '/messages', icon: 'chat', label: 'Messages', badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined },
    { to: '/search', icon: 'search', label: 'Find Services' },
    { to: '/people', icon: 'people', label: 'People' },
  ].filter(Boolean) as { to: string; icon: string; label: string; badge?: number }[];

  const mobileNavItems = [
    { to: '/', icon: 'home', filledIcon: 'home', label: 'Home' },
    { to: '/pets', icon: 'pets', filledIcon: 'pets', label: 'Pets' },
    { fab: true as const },
    !communityAccessDisabled && { to: '/community', icon: 'groups', filledIcon: 'groups', label: 'Community' },
    { to: '#menu', icon: 'menu', filledIcon: 'menu', label: 'Menu' },
  ].filter(Boolean) as ({ to: string; icon: string; filledIcon: string; label: string } | { fab: true })[];

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col md:flex-row font-sans">
      <OfflineBanner />
      <KeyboardShortcutsProvider />
      <PointToast />

      {/* Household event toast */}
      {hhToast && (
        <div className="fixed top-4 right-4 z-50 bg-tertiary text-on-tertiary px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2" role="alert">
          {hhToast}
          <button onClick={clearHhToast} className="ml-2 text-on-tertiary/70 hover:text-on-tertiary" aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* Skip navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-on-primary focus:rounded-lg focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ═══ Top Nav Bar (fixed h-16, mobile + desktop) ═══ */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 bg-background/80 backdrop-blur-xl border-b border-outline-variant">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 motion-safe:transition-opacity">
          <span className="text-primary-container font-black text-xl" style={{ fontFamily: 'var(--font-headline)' }}>
            <MIcon name="pets" className="text-primary-container text-2xl align-middle mr-1" />
            PetBase
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSearchOpen(o => !o)}
            className="text-on-surface-variant hover:text-on-surface motion-safe:transition-colors"
            aria-label="Search users"
          >
            <MIcon name="search" className="text-xl" />
          </button>
          <NotificationBell side="right" />
          <button
            aria-label="Open menu"
            className="text-on-surface-variant hover:text-on-surface motion-safe:transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <MIcon name="menu" className="text-2xl" />
          </button>
        </div>
      </header>

      {/* Mobile Search Panel */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-b border-outline-variant px-4 py-3">
          <div className="relative">
            <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <MIcon name="close" className="text-base" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-surface-container-high rounded-xl shadow-lg border border-outline-variant overflow-hidden">
              {searchResults.slice(0, 5).map(u => (
                <button
                  key={u.uid}
                  onClick={() => { handleSearchSelect(u.uid); setMobileSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-highest motion-safe:transition-colors text-left"
                >
                  <img src={u.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full bg-surface-container shrink-0 object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-on-surface-variant truncate">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery.trim() && (
            <p className="mt-2 text-center text-xs text-on-surface-variant py-2">No users found</p>
          )}
        </div>
      )}

      {/* ═══ Desktop Sidebar (fixed, w-64) ═══ */}
      <aside
        className={`
          ${isMobileMenuOpen ? 'block' : 'hidden'}
          md:block fixed md:sticky top-0 left-0 h-screen w-64 bg-surface
          border-r border-outline-variant z-40
          motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out flex flex-col
          pb-16 md:pb-0
        `}
      >
        {/* Logo + tagline */}
        <div className="p-6 hidden md:flex flex-col gap-1 mb-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 motion-safe:transition-opacity">
              <span className="text-primary-container font-black text-2xl" style={{ fontFamily: 'var(--font-headline)' }}>
                <MIcon name="pets" className="text-primary-container text-3xl align-middle mr-1.5" />
                PetBase
              </span>
            </Link>
            <NotificationBell side="left" />
          </div>
          <p className="text-xs text-on-surface-variant pl-1 tracking-wide">Care. Connect. Protect.</p>
        </div>

        {/* Global Search -- desktop sidebar */}
        <div ref={searchRef} className="px-4 mb-2 hidden md:block relative">
          <div className="relative">
            <MIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-surface-container border border-outline-variant rounded-xl outline-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <MIcon name="close" className="text-base" />
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-[calc(100%+4px)] bg-surface-container-high rounded-xl shadow-xl border border-outline-variant z-50 overflow-hidden">
              {searchResults.slice(0, 6).map(u => (
                <button
                  key={u.uid}
                  onClick={() => handleSearchSelect(u.uid)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-highest motion-safe:transition-colors text-left"
                >
                  <img src={u.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full bg-surface-container shrink-0 object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-on-surface-variant truncate">@{u.username}</p>}
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="text-xs text-on-surface-variant text-center py-3">No users found</p>
              )}
            </div>
          )}
          {searchOpen && searchResults.length === 0 && searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-[calc(100%+4px)] bg-surface-container-high rounded-xl shadow-xl border border-outline-variant z-50 p-3 text-center text-xs text-on-surface-variant">
              No users found
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="px-3 space-y-1 mt-4 md:mt-0 flex-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl motion-safe:transition-all font-medium text-sm
                ${isActive
                  ? 'bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary text-primary'
                  : 'text-on-surface/60 hover:bg-surface-container-high hover:text-primary opacity-70 hover:opacity-100 border-l-4 border-transparent'
                }
              `}
            >
              <div className="relative">
                <MIcon name={item.icon} className="text-xl" />
                {'badge' in item && item.badge != null && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 bg-error rounded-full text-on-error text-[10px] font-bold flex items-center justify-center px-0.5">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user profile section */}
        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center px-2 py-2">
            <button
              onClick={() => { setSettingsOpen(true); setIsMobileMenuOpen(false); }}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 motion-safe:transition-opacity text-left"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden shrink-0">
                {profile?.avatarUrl || user?.photoURL ? (
                  <img
                    src={profile?.avatarUrl || user?.photoURL || ''}
                    alt="User profile"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-container/20 text-primary font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {user?.displayName || 'Pet Parent'}
                  </p>
                  {gamification.state && (
                    <PointsBadge
                      level={gamification.state.level}
                      totalPoints={gamification.state.totalPoints}
                      levelLabel={gamification.state.levelLabel}
                      compact
                    />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant truncate">
                  {user?.email}
                </p>
              </div>
            </button>
          </div>

          {/* Need Help? */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary motion-safe:transition-colors px-1 py-1 mt-1"
          >
            <MIcon name="help" className="text-base" />
            Need Help?
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onFeedback={() => setFeedbackOpen(true)} />}
        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userEmail={user?.email ?? undefined} />}
      </AnimatePresence>
      <UserSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ═══ Mobile Bottom Nav (fixed, h-20) ═══ */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-2xl border-t border-outline-variant flex items-stretch h-20 safe-area-inset-bottom rounded-t-[1.5rem]"
      >
        {mobileNavItems.map((item, i) => {
          if ('fab' in item) {
            // Center FAB
            return (
              <div key="fab" className="flex-1 flex items-center justify-center">
                <NavLink
                  to="/pets"
                  className="-mt-8 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-tertiary shadow-xl shadow-primary/30 flex items-center justify-center motion-safe:transition-transform hover:scale-105"
                >
                  <MIcon name="add" className="text-on-primary text-2xl" />
                </NavLink>
              </div>
            );
          }

          const isMenuButton = item.to === '#menu';

          if (isMenuButton) {
            return (
              <button
                key="menu"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium motion-safe:transition-colors text-on-surface-variant"
              >
                <MIcon name={isMobileMenuOpen ? 'close' : 'menu'} className="text-xl" />
                Menu
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium motion-safe:transition-colors ${isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MIcon name={item.icon} className={`text-xl ${isActive ? 'font-variation-fill' : ''}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Content area: main + optional right panel */}
      <div className="flex flex-1 min-w-0">
        <main id="main-content" className="flex-1 min-w-0 p-4 pt-20 md:pt-4 pb-24 md:pb-8 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
