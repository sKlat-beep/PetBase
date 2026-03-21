import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrchestrator } from '../hooks/useOrchestrator';
import { OrchestratorPanel } from '../components/search/OrchestratorPanel';
import { VerificationModal } from '../components/search/VerificationModal';
import { SearchRightPanel } from '../components/search/SearchRightPanel';
import { useRightPanel } from '../contexts/RightPanelContext';

export function Search() {
  const { profile, updateProfile } = useAuth();
  const { setContent } = useRightPanel();
  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('tab');

  // ZIP location — synced from profile
  const [location, setLocation] = useState('');
  useEffect(() => {
    if (profile?.zipCode && !location) setLocation(profile.zipCode);
  }, [profile?.zipCode, location]);

  const orchestrator = useOrchestrator(location);

  // Route URL tab param directly to service type
  useEffect(() => {
    if (initTab) {
      orchestrator.setServiceType(initTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTab]);

  // Wire right context panel — Favorites + Recent Searches
  useEffect(() => {
    setContent(
      <SearchRightPanel
        history={orchestrator.history}
        onSelect={entry => window.open(entry.url, '_blank', 'noopener,noreferrer')}
      />
    );
    return () => setContent(null);
  }, [setContent, orchestrator.history]);

  const showMakePermanent = !!(location && profile && location !== profile.zipCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-6 max-w-screen-2xl mx-auto"
    >
      {/* Header — Title + ZIP input */}
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
            Find Services
          </h1>
          <p className="text-on-surface-variant mt-1">Pet-aware search powered by your pet profiles</p>
        </div>

        {/* ZIP input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">location_on</span>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="ZIP code"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border-0 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container transition-all"
            />
          </div>
          {showMakePermanent && (
            <button
              onClick={() => updateProfile({ zipCode: location })}
              className="text-xs text-primary-container hover:underline transition-colors whitespace-nowrap"
            >
              Save as default
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-8">
        <div>
          <OrchestratorPanel
            pets={orchestrator.pets}
            selectedPets={orchestrator.selectedPets}
            selectedPetIds={orchestrator.selectedPetIds}
            onTogglePet={orchestrator.togglePetSelection}
            serviceType={orchestrator.serviceType}
            onSelectService={orchestrator.setServiceType}
            previewTags={orchestrator.previewTags}
            currentUrl={orchestrator.currentUrl}
            optionalTags={orchestrator.optionalTags}
            activeOptionalTags={orchestrator.activeOptionalTags}
            disabledDefaultTags={orchestrator.disabledDefaultTags}
            onToggleDefaultTag={orchestrator.toggleDefaultTag}
            onRemoveTag={orchestrator.removeOptionalTag}
            onAddTag={orchestrator.addOptionalTag}
            customTags={orchestrator.customTags}
            onPinCustomTag={orchestrator.pinCustomTag}
            onRemoveCustomTag={orchestrator.removeCustomTag}
            manualQuery={orchestrator.manualQuery}
            onManualQueryChange={orchestrator.setManualQuery}
            onSearch={orchestrator.executeSearch}
            history={orchestrator.history}
          />
        </div>
      </div>

      {/* Verification modal */}
      <AnimatePresence>
        {orchestrator.showVerification && orchestrator.lastSearchEntry && (
          <VerificationModal
            petName={orchestrator.lastSearchEntry.petNames.join(', ')}
            serviceType={orchestrator.lastSearchEntry.serviceType}
            onClose={() => orchestrator.setShowVerification(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
