import { useState } from 'react';
import type { ServiceResult } from '../../utils/serviceApi';

type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };

interface ServiceCardProps {
  result: ServiceResult;
  isSaved: boolean;
  activePetTypes: string[];
  uid?: string;
  displayName?: string;
  localTips: Tip[];
  onSelect: () => void;
  onSave: () => void;
  onAddTip: (text: string, rating: number) => void;
  onUpvoteTip: (tipIdx: number) => void;
}

export function ServiceCard({
  result, isSaved, activePetTypes, uid, displayName,
  localTips, onSelect, onSave, onAddTip, onUpvoteTip,
}: ServiceCardProps) {
  const [tipInput, setTipInput] = useState('');
  const [tipRating, setTipRating] = useState(0);

  const allTips = [...localTips, ...(result.communityTips || [])];

  return (
    <div
      onClick={onSelect}
      className="bg-surface-container-low rounded-2xl overflow-hidden shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col cursor-pointer"
    >
      <div className="h-48 relative">
        <img src={result.image} alt={result.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {result.isPetBaseVerified && (
            <div className="bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Verified
            </div>
          )}
          {result.petVerified ? (
            <div className="bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-on-primary shadow-sm" title="This provider explicitly supports your pet's type and breed">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Verified for your pet
            </div>
          ) : activePetTypes.length > 0 ? (
            <div className="bg-amber-100/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-amber-800 shadow-sm border border-amber-200/50" title={`Call to confirm they can accommodate: ${activePetTypes.join(', ')}`}>
              <span className="material-symbols-outlined text-[14px]">warning</span> Call to verify
            </div>
          ) : result.isVerified && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-primary shadow-sm">
              <span className="material-symbols-outlined text-[14px]">verified_user</span> Verified
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-sm transition-colors ${isSaved ? 'bg-error/90 text-on-error' : 'bg-white/70 text-on-surface-variant hover:bg-error-container hover:text-error'}`}
        >
          <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'fill-1' : ''}`}>favorite</span>
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-on-surface leading-tight">{result.name}</h3>
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-md text-sm font-bold shrink-0">
            <span className="material-symbols-outlined text-[14px] fill-1 text-amber-500">star</span>
            {result.rating}
          </div>
        </div>

        <div className="text-sm text-on-surface-variant mb-3">
          {result.reviews} reviews{result.distance ? ` · ${result.distance}` : ''}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant mb-4">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">location_on</span>
          <span className="truncate">{result.address}</span>
        </div>

        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-outline-variant">
            {result.tags.map((tag) => (
              <span key={tag} className="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-md text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Community Tips */}
        <div className="mt-4 pt-4 border-t border-outline-variant" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
            <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Community Tips</span>
          </div>

          {allTips.length > 0 && (
            <div className="space-y-2 mb-3">
              {allTips.map((tip, idx) => (
                <div key={idx} className="bg-surface-container rounded-lg p-3">
                  {tip.rating && tip.rating > 0 && (
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-xs ${s <= tip.rating! ? 'text-amber-400' : 'text-neutral-300'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-on-surface-variant italic">&ldquo;{tip.text}&rdquo;</p>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs font-medium text-on-surface-variant">&mdash; {tip.author}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpvoteTip(idx); }}
                        disabled={(tip.upvoters ?? []).includes(uid ?? '')}
                        className="flex items-center gap-0.5 text-[10px] text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-default transition-colors"
                        aria-label="Upvote tip"
                      >
                        ▲ {tip.upvotes ?? 0}
                      </button>
                      <span className="text-[10px] text-on-surface-variant">{new Date(tip.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip form — Row 1: stars, Row 2: input + button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const t = tipInput.trim();
              if (t) {
                onAddTip(t, tipRating);
                setTipInput('');
                setTipRating(0);
              }
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setTipRating(prev => prev === s ? 0 : s); }}
                  className={`text-sm ${s <= tipRating ? 'text-amber-400' : 'text-neutral-300'} hover:text-amber-400 transition-colors`}
                >
                  ★
                </button>
              ))}
              <span className="text-[10px] text-on-surface-variant ml-1">
                {tipRating ? `${tipRating}/5` : 'Rate (optional)'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={200}
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                placeholder="Share a review or tip..."
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!tipInput.trim()}
                className="px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-on-primary text-sm font-medium rounded-lg transition-colors"
              >
                Post
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
