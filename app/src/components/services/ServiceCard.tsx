import { Star, MapPin, ShieldCheck, AlertTriangle, Heart, MessageSquare } from 'lucide-react';
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
      className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-md transition-shadow flex flex-col cursor-pointer"
    >
      <div className="h-48 relative">
        <img src={result.image} alt={result.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          {result.isPetBaseVerified && (
            <div className="bg-emerald-600/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-white shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </div>
          )}
          {result.petVerified ? (
            <div className="bg-emerald-600/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-white shadow-sm" title="This provider explicitly supports your pet's type and breed">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified for your pet
            </div>
          ) : activePetTypes.length > 0 ? (
            <div className="bg-amber-100/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-amber-800 shadow-sm border border-amber-200/50" title={`Call to confirm they can accommodate: ${activePetTypes.join(', ')}`}>
              <AlertTriangle className="w-3.5 h-3.5" /> Call to verify
            </div>
          ) : result.isVerified && (
            <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-xs font-bold text-emerald-700 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSave(); }}
          className={`absolute top-3 left-3 p-1.5 rounded-full backdrop-blur-sm transition-colors ${isSaved ? 'bg-rose-500/90 text-white' : 'bg-white/70 text-neutral-500 hover:bg-rose-50 hover:text-rose-500'}`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-neutral-900 dark:text-neutral-100 leading-tight">{result.name}</h3>
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md text-sm font-bold shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            {result.rating}
          </div>
        </div>

        <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">
          {result.reviews} reviews{result.distance ? ` · ${result.distance}` : ''}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          <MapPin className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" />
          <span className="truncate">{result.address}</span>
        </div>

        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-neutral-100 dark:border-neutral-700">
            {result.tags.map((tag) => (
              <span key={tag} className="bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2.5 py-1 rounded-md text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Community Tips */}
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Community Tips</span>
          </div>

          {allTips.length > 0 && (
            <div className="space-y-2 mb-3">
              {allTips.map((tip, idx) => (
                <div key={idx} className="bg-neutral-50 dark:bg-neutral-700/30 rounded-lg p-3">
                  {tip.rating && tip.rating > 0 && (
                    <div className="flex gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-xs ${s <= tip.rating! ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">&ldquo;{tip.text}&rdquo;</p>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">&mdash; {tip.author}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpvoteTip(idx); }}
                        disabled={(tip.upvoters ?? []).includes(uid ?? '')}
                        className="flex items-center gap-0.5 text-[10px] text-neutral-400 hover:text-emerald-600 disabled:opacity-40 disabled:cursor-default transition-colors"
                        aria-label="Upvote tip"
                      >
                        ▲ {tip.upvotes ?? 0}
                      </button>
                      <span className="text-[10px] text-neutral-400">{new Date(tip.date).toLocaleDateString()}</span>
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
                  className={`text-sm ${s <= tipRating ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'} hover:text-amber-400 transition-colors`}
                >
                  ★
                </button>
              ))}
              <span className="text-[10px] text-neutral-400 ml-1">
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
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!tipInput.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
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
