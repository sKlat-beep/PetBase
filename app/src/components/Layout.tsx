import { Outlet, NavLink, Link, useNavigate } from 'react-router';
import { Home, PawPrint, UsersRound, Search as SearchIcon, IdCard, Menu, LogOut, MessageSquare, HelpCircle, X, Sun, Moon } from 'lucide-react'; // X added for search clear button
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocial, type PublicProfile } from '../contexts/SocialContext';
import { useMessaging } from '../contexts/MessagingContext';
import { HelpModal } from './HelpModal';
import { FeedbackModal } from './FeedbackModal';
import { AnimatePresence } from 'motion/react';
import { NotificationBell } from './notifications/NotificationBell';
import { RightPanel } from './layout/RightPanel';
import { OfflineBanner } from './ui/OfflineBanner';
import { KeyboardShortcutsProvider } from './ui/KeyboardShortcuts';

export function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { searchUsers } = useSocial();
  const { totalUnread: totalUnreadMessages } = useMessaging();
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
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/pets', icon: PawPrint, label: 'My Pets' },
    { to: '/community', icon: UsersRound, label: 'Community Hub' },
    { to: '/messages', icon: MessageSquare, label: 'Messages', badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined },
    { to: '/search', icon: SearchIcon, label: 'Find Services' },
    { to: '/cards', icon: IdCard, label: 'Pet Cards' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex flex-col md:flex-row font-sans">
      <OfflineBanner />
      <KeyboardShortcutsProvider />
      {/* Skip navigation — visually hidden, shown on keyboard focus for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-emerald-600 focus:text-white focus:rounded-lg focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 p-4 flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-emerald-600 font-bold text-xl hover:opacity-80 transition-opacity">
          <PawPrint className="w-6 h-6" />
          <span>PetBase</span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSearchOpen(o => !o)}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            aria-label="Search users"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
          <NotificationBell side="right" />
          <button
            aria-label="Open menu"
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Search Panel */}
      {mobileSearchOpen && (
        <div className="md:hidden sticky top-[65px] z-40 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              {searchResults.slice(0, 5).map(u => (
                <button
                  key={u.uid}
                  onClick={() => { handleSearchSelect(u.uid); setMobileSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors text-left"
                >
                  <img src={u.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-neutral-400 truncate">@{u.username}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {searchResults.length === 0 && searchQuery.trim() && (
            <p className="mt-2 text-center text-xs text-neutral-400 py-2">No users found</p>
          )}
        </div>
      )}

      {/* Sidebar (Desktop) & Mobile Menu */}
      <aside
        className={`
          ${isMobileMenuOpen ? 'block' : 'hidden'}
          md:block fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-neutral-900
          border-r border-neutral-200 dark:border-neutral-700 z-40
          motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out flex flex-col
          pb-16 md:pb-0
        `}
      >
        <div className="p-6 hidden md:flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 text-emerald-600 font-bold text-2xl hover:opacity-80 transition-opacity">
            <PawPrint className="w-8 h-8" />
            <span>PetBase</span>
          </Link>
          <NotificationBell side="left" />
        </div>

        {/* Global Search — desktop sidebar */}
        <div ref={searchRef} className="px-4 mb-2 hidden md:block relative">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-[calc(100%+4px)] bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
              {searchResults.slice(0, 6).map(u => (
                <button
                  key={u.uid}
                  onClick={() => handleSearchSelect(u.uid)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors text-left"
                >
                  <img src={u.avatarUrl || ''} alt="" className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{u.displayName}</p>
                    {u.username && <p className="text-xs text-neutral-400 truncate">@{u.username}</p>}
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="text-xs text-neutral-400 text-center py-3">No users found</p>
              )}
            </div>
          )}
          {searchOpen && searchResults.length === 0 && searchQuery.trim() && (
            <div className="absolute left-4 right-4 top-[calc(100%+4px)] bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 p-3 text-center text-xs text-neutral-400">
              No users found
            </div>
          )}
        </div>

        <nav className="px-4 space-y-2 mt-4 md:mt-0 flex-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium
                ${isActive
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                }
              `}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {'badge' in item && item.badge != null && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between px-2 py-2">
            <Link
              to="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden shrink-0">
                {profile?.avatarUrl || user?.photoURL ? (
                  <img
                    src={profile?.avatarUrl || user?.photoURL || ''}
                    alt="User profile"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {user?.displayName || 'Pet Parent'}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {user?.email}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                {theme === 'dark'
                  ? <Moon className="w-4 h-4" aria-hidden="true" />
                  : <Sun className="w-4 h-4" aria-hidden="true" />
                }
              </button>
              <button
                onClick={signOut}
                className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-2 shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Need Help? */}
          <button
            onClick={() => setHelpOpen(true)}
            className="flex items-center gap-2 text-xs text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors px-1 py-1 mt-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Need Help?
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onFeedback={() => setFeedbackOpen(true)} />}
        {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} userEmail={user?.email ?? undefined} />}
      </AnimatePresence>

      {/* Mobile Bottom Nav Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex items-stretch h-16 safe-area-inset-bottom"
      >
        {[
          { to: '/', icon: Home, label: 'Dashboard' },
          { to: '/pets', icon: PawPrint, label: 'Pets' },
          { to: '/community', icon: UsersRound, label: 'Community' },
          { to: '/messages', icon: MessageSquare, label: 'Messages', badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined },
          { to: '/cards', icon: IdCard, label: 'Cards' },
        ].map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge != null && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Content area: main + optional right panel */}
      <div className="flex flex-1 min-w-0">
        <main id="main-content" className="flex-1 min-w-0 p-4 pb-20 md:pb-8 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
