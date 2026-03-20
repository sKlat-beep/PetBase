import { useState, useEffect, useCallback } from 'react';
import type { ServiceResult } from '../../utils/serviceApi';
import { getPlaceDetails, getPlaceReviews, type PlaceDetails, type PlaceAtmosphere } from '../../utils/serviceApi';
import { useAuth } from '../../contexts/AuthContext';
import { ClaimModal } from './ClaimModal';

type Tip = { text: string; author: string; date: string; upvotes?: number; upvoters?: string[]; rating?: number };

interface ServiceDetailModalProps {
  service: ServiceResult;
  onClose: () => void;
  /** Pre-fetched place details from the search page cache, if available. */
  cachedDetails?: PlaceDetails;
  /** Community tips for this service */
  localTips?: Tip[];
  onAddTip?: (text: string, rating: number) => void;
  onUpvoteTip?: (tipIdx: number) => void;
}

export function ServiceDetailModal({ service, onClose, cachedDetails, localTips = [], onAddTip, onUpvoteTip }: ServiceDetailModalProps) {
  const { user, profile, updateProfile } = useAuth();
  const [showClaim, setShowClaim] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [tipRating, setTipRating] = useState(0);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(cachedDetails ?? null);
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState(cachedDetails == null);
  const [atmosphere, setAtmosphere] = useState<PlaceAtmosphere | null>(null);
  const [atmosphereLoading, setAtmosphereLoading] = useState(false);

  useEffect(() => {
    // If the cache already had details for this service, skip the fetch
    if (cachedDetails) return;
    setPlaceDetailsLoading(true);
    getPlaceDetails(service.id, service.name, service.address)
      .then(d => setPlaceDetails(d))
      .finally(() => setPlaceDetailsLoading(false));
  }, [service.id, service.name, service.address, cachedDetails]);

  const handleLoadReviews = useCallback(() => {
    if (!placeDetails?.placeId || atmosphereLoading) return;
    setAtmosphereLoading(true);
    getPlaceReviews(placeDetails.placeId)
      .then(a => setAtmosphere(a))
      .finally(() => setAtmosphereLoading(false));
  }, [placeDetails?.placeId, atmosphereLoading]);

  const isSaved = ((profile?.savedServices ?? []) as string[]).includes(service.id);

  const handleSave = async () => {
    if (!profile) return;
    const saved: string[] = profile.savedServices ?? [];
    const next = isSaved ? saved.filter((s: string) => s !== service.id) : [...saved, service.id];
    await updateProfile({ savedServices: next });
  };

  const googlePhotos = placeDetails?.photos ?? [];
  const yelpPhotos = (service as any).photos as string[] | undefined ?? (service.image ? [service.image] : []);
  const photos = googlePhotos.length > 0 ? googlePhotos : yelpPhotos;
  const displayPhone = placeDetails?.phone ?? (service as any).phone as string | undefined;

  const starRating = Math.round(service.rating);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="service-detail-modal-title" className="bg-surface-container rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="service-detail-modal-title" className="text-base font-semibold text-on-surface truncate">{service.name}</h2>
                {service.isPetBaseVerified && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-on-primary-container bg-primary-container px-1.5 py-0.5 rounded-full shrink-0">
                    <span className="material-symbols-outlined text-[12px]">verified_user</span> Verified
                  </span>
                )}
                {service.isSponsored && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">Sponsored</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-on-surface-variant">{service.type}</span>
                <span className="flex items-center gap-0.5 text-xs text-amber-500">
                  {Array.from({ length: starRating }).map((_, i) => <span key={i} className="material-symbols-outlined text-[12px] fill-1">star</span>)}
                  <span className="text-on-surface-variant ml-1">{service.rating?.toFixed(1)} ({service.reviews})</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button onClick={() => void handleSave()} className={`p-1.5 rounded-lg transition-colors ${isSaved ? 'text-error bg-error-container' : 'text-on-surface-variant hover:text-error hover:bg-error-container'}`}>
                <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'fill-1' : ''}`}>favorite</span>
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Verified banner */}
            {service.isPetBaseVerified && (service as any).bio && (
              <div className="px-5 py-3 bg-primary-container border-b border-primary/20">
                <p className="text-xs text-on-primary-container">{(service as any).bio}</p>
              </div>
            )}

            {/* Photo loading skeleton */}
            {placeDetailsLoading && photos.length === 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-outline-variant">
                {[1,2,3].map(i => (
                  <div key={i} className="w-24 h-24 rounded-xl bg-surface-container shrink-0 animate-pulse" />
                ))}
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-outline-variant">
                {photos.slice(0, 5).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" loading="lazy" />
                ))}
              </div>
            )}

            {/* Info */}
            <div className="px-5 py-3 space-y-2 border-b border-outline-variant">
              {service.address && (
                <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5 text-on-surface-variant">location_on</span>
                  <span>{service.address}</span>
                </div>
              )}
              {displayPhone && (
                <a href={`tel:${displayPhone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <span className="material-symbols-outlined text-[16px]">phone</span>
                  <span>{displayPhone}</span>
                </a>
              )}
              {placeDetails?.website && (
                <a href={placeDetails.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <span className="material-symbols-outlined text-[16px]">language</span>
                  <span className="truncate">{new URL(placeDetails.website).hostname}</span>
                </a>
              )}
              {service.distance && (
                <p className="text-xs text-on-surface-variant">{service.distance} away</p>
              )}
            </div>

            {/* Specialties */}
            {service.specialties && service.specialties.length > 0 && (
              <div className="px-5 py-3 border-b border-outline-variant">
                <div className="flex flex-wrap gap-1.5">
                  {service.specialties.map(s => (
                    <span key={s} className="text-[10px] font-medium px-2 py-1 rounded-full bg-surface-container text-on-surface-variant">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Action links */}
            <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-outline-variant">
              {service.yelpUrl && (
                <a href={service.yelpUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span> View on Yelp
                </a>
              )}
              {placeDetails?.googleMapsUri ? (
                <a href={placeDetails.googleMapsUri} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span> Google Maps
                </a>
              ) : (
                <a href={`https://www.google.com/search?q=${encodeURIComponent(service.name + ' ' + service.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span> Google
                </a>
              )}
            </div>

            {/* Google Reviews — lazy loaded */}
            {!placeDetailsLoading && placeDetails && (
              <div className="px-5 py-3 border-b border-outline-variant">
                {!atmosphere && !atmosphereLoading && (
                  <button
                    onClick={handleLoadReviews}
                    className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">chat</span>
                    See Google Reviews
                  </button>
                )}
                {atmosphereLoading && (
                  <p className="text-xs text-on-surface-variant">Loading reviews…</p>
                )}
                {atmosphere && atmosphere.reviews.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Google Reviews</p>
                    {atmosphere.reviews.slice(0, 3).map((review, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-on-surface-variant">{review.authorName}</span>
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: review.rating }).map((_, j) => (
                              <span key={j} className="material-symbols-outlined text-[10px] fill-1">star</span>
                            ))}
                          </span>
                          <span className="text-[10px] text-on-surface-variant ml-auto">{review.relativePublishTimeDescription}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-3">{review.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {atmosphere && atmosphere.reviews.length === 0 && (
                  <p className="text-xs text-on-surface-variant">No reviews available.</p>
                )}
              </div>
            )}

            {/* Social links */}
            {service.socialLinks && Object.keys(service.socialLinks).length > 0 && (
              <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-outline-variant">
                {Object.entries(service.socialLinks).filter(([, v]) => v).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high capitalize transition-colors">
                    {platform}
                  </a>
                ))}
              </div>
            )}

            {/* Community Tips */}
            {(localTips.length > 0 || onAddTip) && (
              <div className="px-5 py-3 border-b border-outline-variant">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Community Tips</span>
                </div>

                {localTips.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {localTips.map((tip, idx) => (
                      <div key={idx} className="bg-surface-container rounded-lg p-3">
                        {tip.rating && tip.rating > 0 && (
                          <div className="flex gap-0.5 mb-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} className={`text-xs ${s <= tip.rating! ? 'text-secondary' : 'text-outline-variant'}`}>
                                &#9733;
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-on-surface-variant italic">&ldquo;{tip.text}&rdquo;</p>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-xs font-medium text-on-surface-variant">&mdash; {tip.author}</span>
                          <div className="flex items-center gap-2">
                            {onUpvoteTip && (
                              <button
                                onClick={() => onUpvoteTip(idx)}
                                disabled={(tip.upvoters ?? []).includes(user?.uid ?? '')}
                                className="flex items-center gap-0.5 text-[10px] text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-default transition-colors"
                                aria-label="Upvote tip"
                              >
                                &#9650; {tip.upvotes ?? 0}
                              </button>
                            )}
                            <span className="text-[10px] text-on-surface-variant">{new Date(tip.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {onAddTip && (
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
                          onClick={() => setTipRating(prev => prev === s ? 0 : s)}
                          className={`text-sm ${s <= tipRating ? 'text-secondary' : 'text-outline-variant'} hover:text-secondary transition-colors`}
                        >
                          &#9733;
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
                )}
              </div>
            )}

            {/* Claim listing */}
            {service.status === 'seeded' && (
              <div className="px-5 py-4 text-center">
                <p className="text-xs text-on-surface-variant mb-2">Is this your business?</p>
                <button onClick={() => setShowClaim(true)}
                  className="text-xs font-medium px-4 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary-container transition-colors">
                  Claim this listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showClaim && (
        <ClaimModal service={service} onClose={() => setShowClaim(false)} />
      )}
    </>
  );
}
