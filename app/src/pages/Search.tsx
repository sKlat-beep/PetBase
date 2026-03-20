import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrchestrator } from '../hooks/useOrchestrator';
import { OrchestratorPanel } from '../components/search/OrchestratorPanel';
import { VerificationModal } from '../components/search/VerificationModal';
import { SideRail } from '../components/search/SideRail';
import { useCommunityTips } from '../hooks/useCommunityTips';

const SERVICE_TABS = ['Vets', 'Groomers', 'Sitters', 'Walkers', 'Trainers', 'Stores', 'Boarding', 'Shelters'] as const;

export function Search() {
  const { profile, updateProfile } = useAuth();
  const tips = useCommunityTips();

  const [searchParams] = useSearchParams();
  const initTab = searchParams.get('tab') ?? 'Vets';

  // ZIP location — synced from profile
  const [location, setLocation] = useState('');
  useEffect(() => {
    if (profile?.zipCode && !location) setLocation(profile.zipCode);
  }, [profile?.zipCode, location]);

  const orchestrator = useOrchestrator(location);

  // Sync tab from URL params
  useEffect(() => {
    if (initTab && SERVICE_TABS.includes(initTab as typeof SERVICE_TABS[number])) {
      orchestrator.setServiceType(initTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTab]);

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

        {/* Service tab pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SERVICE_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => orchestrator.setServiceType(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                orchestrator.serviceType === tab
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* Main content: Orchestrator + SideRail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <OrchestratorPanel
            pets={orchestrator.pets}
            selectedPet={orchestrator.selectedPet}
            selectedPetId={orchestrator.selectedPetId}
            onSelectPet={orchestrator.setSelectedPetId}
            serviceType={orchestrator.serviceType}
            onSelectService={orchestrator.setServiceType}
            previewTags={orchestrator.previewTags}
            currentUrl={orchestrator.currentUrl}
            optionalTags={orchestrator.optionalTags}
            activeOptionalTags={orchestrator.activeOptionalTags}
            onRemoveTag={orchestrator.removeOptionalTag}
            onAddTag={orchestrator.addOptionalTag}
            manualQuery={orchestrator.manualQuery}
            onManualQueryChange={orchestrator.setManualQuery}
            onSearch={orchestrator.executeSearch}
            history={orchestrator.history}
          />
        </div>
        <div className="hidden xl:block space-y-10">
          <SideRail
            recentTips={tips.recentTips}
            websiteResults={[]}
          />
        </div>
      </div>

      {/* Verification modal */}
      <AnimatePresence>
        {orchestrator.showVerification && orchestrator.lastSearchEntry && (
          <VerificationModal
            petName={orchestrator.lastSearchEntry.petName}
            serviceType={orchestrator.lastSearchEntry.serviceType}
            onClose={() => orchestrator.setShowVerification(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
