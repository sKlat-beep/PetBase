import { motion } from 'motion/react';
import { useServiceSearch } from '../hooks/useServiceSearch';
import { useCommunityTips } from '../hooks/useCommunityTips';
import { useRecentInteractions } from '../hooks/useRecentInteractions';
import { ServiceDetailModal } from '../components/services/ServiceDetailModal';
import { SearchHeader } from '../components/search/SearchHeader';
import { FrequentlyVisited } from '../components/search/FrequentlyVisited';
import { ServiceGrid } from '../components/search/ServiceGrid';
import { SideRail } from '../components/search/SideRail';

export function Search() {
  const search = useServiceSearch();
  const tips = useCommunityTips();
  const interactions = useRecentInteractions();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-6 max-w-screen-2xl mx-auto"
    >
      <SearchHeader
        searchQuery={search.searchQuery}
        onSearchQueryChange={search.setSearchQuery}
        location={search.location}
        onLocationChange={search.setLocation}
        activeTab={search.activeTab}
        onTabChange={search.setActiveTab}
        selectedPetCategories={search.selectedPetCategories}
        onPetCategoriesChange={search.setSelectedPetCategories}
        showFilters={search.showFilters}
        onToggleFilters={() => search.setShowFilters(!search.showFilters)}
        activeFilterCount={search.activeFilterCount}
        tabs={search.tabs}
        onTriggerSearch={search.triggerSearchAction}
        showMakePermanent={!!(search.location && search.profile && search.location !== search.profile.zipCode)}
        onMakePermanent={() => search.updateProfile({ zipCode: search.location })}
        filterProps={{
          availablePetTypes: search.availablePetTypes,
          availableBreeds: search.availableBreeds,
          availableSizes: search.availableSizes,
          activePetTypes: search.activePetTypes,
          activeBreeds: search.activeBreeds,
          activeSizes: search.activeSizes,
          activeServiceFilters: search.activeServiceFilters,
          searchRadius: search.searchRadius,
          onPetTypesChange: search.setActivePetTypes,
          onBreedsChange: search.setActiveBreeds,
          onSizesChange: search.setActiveSizes,
          onServiceFiltersChange: search.setActiveServiceFilters,
          onRadiusChange: search.setSearchRadius,
        }}
      />

      <FrequentlyVisited interactions={interactions.recent} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <ServiceGrid
            results={search.sortedResults}
            storeResults={search.storeResults}
            loading={search.loading}
            error={search.searchError}
            location={search.location}
            activeTab={search.activeTab}
            sortBy={search.sortBy}
            onSortChange={search.setSortBy}
            savedServiceIds={search.savedServiceIds}
            activePetTypes={search.activePetTypes}
            uid={search.user?.uid}
            displayName={search.profile?.displayName}
            localTips={tips.localTips}
            onSelectService={search.setSelectedService}
            onSaveService={(id) => void search.handleSaveService(id)}
            onAddTip={tips.addLocalTip}
            onUpvoteTip={tips.upvoteTip}
            websiteResults={search.websiteResults}
            favoriteWebsites={interactions.favoriteWebsites}
            onToggleFavorite={interactions.toggleFavoriteWebsite}
            onRecordInteraction={interactions.recordInteraction}
          />
        </div>
        <div className="hidden xl:block space-y-10">
          <SideRail
            recentTips={tips.recentTips}
            websiteResults={search.websiteResults}
          />
        </div>
      </div>

      {search.selectedService && (
        <ServiceDetailModal
          service={search.selectedService}
          onClose={() => search.setSelectedService(null)}
          cachedDetails={search.getCachedDetails(search.selectedService.id)}
          localTips={tips.localTips[search.selectedService.id] || []}
          onAddTip={(text, rating) => tips.addLocalTip(search.selectedService!.id, text, rating)}
          onUpvoteTip={(idx) => tips.upvoteTip(search.selectedService!.id, idx)}
        />
      )}
    </motion.div>
  );
}
