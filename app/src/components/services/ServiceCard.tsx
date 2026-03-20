import type { ServiceResult } from '../../utils/serviceApi';

type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };

interface ServiceCardProps {
  result: ServiceResult;
  isSaved: boolean;
  activePetTypes: string[];
  uid?: string;
  localTips: Tip[];
  onSelect: () => void;
  onSave: () => void;
}

export function ServiceCard({
  result, isSaved, activePetTypes,
  localTips, onSelect, onSave,
}: ServiceCardProps) {
  const allTips = [...localTips, ...(result.communityTips || [])];
  const topTip = allTips[0];
  const matchedTags = result.matchedPetTags ?? [];

  return (
    <div
      onClick={onSelect}
      className="bg-surface-container-low rounded-[1.5rem] overflow-hidden group cursor-pointer flex flex-col"
    >
      {/* Image section */}
      <div className="h-48 relative overflow-hidden">
        <img
          src={result.image}
          alt={result.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        {/* Category badge (top-left) */}
        <div className="absolute top-3 left-3 bg-background/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-on-surface">
          {result.type}
        </div>
        {/* Rating badge (bottom-right) */}
        <div className="absolute bottom-3 right-3 bg-secondary-container px-3 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] fill-1 text-on-secondary-container">star</span>
          <span className="text-sm font-bold text-on-secondary-container">{result.rating}</span>
        </div>
        {/* Save button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-sm transition-colors ${isSaved ? 'bg-error/90 text-on-error' : 'bg-white/70 text-on-surface-variant hover:bg-error-container hover:text-error'}`}
        >
          <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'fill-1' : ''}`}>favorite</span>
        </button>
        {/* Verification badges */}
        {result.isPetBaseVerified && (
          <div className="absolute top-3 left-[4.5rem] bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold text-on-primary">
            <span className="material-symbols-outlined text-[12px]">verified_user</span> Verified
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="p-6 flex flex-col flex-1">
        {/* Title + distance */}
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-headline font-bold text-lg text-on-surface leading-tight">{result.name}</h3>
          {result.distance && (
            <span className="text-xs text-on-surface-variant shrink-0 ml-2">{result.distance}</span>
          )}
        </div>

        <p className="text-sm text-on-surface-variant mb-3">
          {result.reviews} reviews
        </p>

        {/* Matched pet tags */}
        {matchedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {matchedTags.map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-primary-container/15 text-primary text-xs font-medium rounded-full border border-primary-container/25">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Existing service tags */}
        {result.tags.length > 0 && matchedTags.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {result.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Community tip banner */}
        {topTip && (
          <div className={`p-2 rounded-xl mb-3 flex items-start gap-2 ${
            topTip.rating && topTip.rating >= 4
              ? 'bg-secondary-container/10 border border-secondary-container/20'
              : 'bg-primary-container/10 border border-primary-container/20'
          }`}>
            <span className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
              topTip.rating && topTip.rating >= 4 ? 'text-secondary' : 'text-primary'
            }`}>
              {topTip.rating && topTip.rating >= 4 ? 'check_circle' : 'campaign'}
            </span>
            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
              &ldquo;{topTip.text}&rdquo; &mdash; {topTip.author}
            </p>
          </div>
        )}

        {/* Pet verification badge (inline) */}
        {result.petVerified ? (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium mb-3">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            Verified for your pet
          </div>
        ) : activePetTypes.length > 0 && !result.isPetBaseVerified && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mb-3">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Call to verify for {activePetTypes.join(', ')}
          </div>
        )}

        {/* CTA button */}
        <button
          className="w-full py-2 mt-auto bg-surface-container-high rounded-xl text-sm font-bold text-on-surface hover:bg-primary-container hover:text-on-primary-container transition-colors"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          View Details
        </button>
      </div>
    </div>
  );
}
