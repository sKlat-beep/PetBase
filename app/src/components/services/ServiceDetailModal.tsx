import { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Phone, Star, ExternalLink, Heart, ShieldCheck, Globe, MessageSquare } from 'lucide-react';
import type { ServiceResult } from '../../utils/serviceApi';
import { getPlaceDetails, getPlaceReviews, type PlaceDetails, type PlaceAtmosphere } from '../../utils/serviceApi';
import { useAuth } from '../../contexts/AuthContext';
import { ClaimModal } from './ClaimModal';

interface ServiceDetailModalProps {
  service: ServiceResult;
  onClose: () => void;
  /** Pre-fetched place details from the search page cache, if available. */
  cachedDetails?: PlaceDetails;
}

export function ServiceDetailModal({ service, onClose, cachedDetails }: ServiceDetailModalProps) {
  const { profile, updateProfile } = useAuth();
  const [showClaim, setShowClaim] = useState(false);
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
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700 shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100 truncate">{service.name}</h2>
                {service.isPetBaseVerified && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full shrink-0">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
                {service.isSponsored && (
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full shrink-0">Sponsored</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-stone-500 dark:text-stone-400">{service.type}</span>
                <span className="flex items-center gap-0.5 text-xs text-amber-500">
                  {Array.from({ length: starRating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  <span className="text-stone-500 dark:text-stone-400 ml-1">{service.rating?.toFixed(1)} ({service.reviews})</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button onClick={() => void handleSave()} className={`p-1.5 rounded-lg transition-colors ${isSaved ? 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' : 'text-stone-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'}`}>
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Verified banner */}
            {service.isPetBaseVerified && (service as any).bio && (
              <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">{(service as any).bio}</p>
              </div>
            )}

            {/* Photo loading skeleton */}
            {placeDetailsLoading && photos.length === 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-stone-100 dark:border-stone-700">
                {[1,2,3].map(i => (
                  <div key={i} className="w-24 h-24 rounded-xl bg-stone-100 dark:bg-stone-700 shrink-0 animate-pulse" />
                ))}
              </div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto px-5 py-3 border-b border-stone-100 dark:border-stone-700">
                {photos.slice(0, 5).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" loading="lazy" />
                ))}
              </div>
            )}

            {/* Info */}
            <div className="px-5 py-3 space-y-2 border-b border-stone-100 dark:border-stone-700">
              {service.address && (
                <div className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-300">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
                  <span>{service.address}</span>
                </div>
              )}
              {displayPhone && (
                <a href={`tel:${displayPhone}`} className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                  <Phone className="w-4 h-4" />
                  <span>{displayPhone}</span>
                </a>
              )}
              {placeDetails?.website && (
                <a href={placeDetails.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  <Globe className="w-4 h-4" />
                  <span className="truncate">{new URL(placeDetails.website).hostname}</span>
                </a>
              )}
              {service.distance && (
                <p className="text-xs text-stone-400 dark:text-stone-500">{service.distance} away</p>
              )}
            </div>

            {/* Specialties */}
            {service.specialties && service.specialties.length > 0 && (
              <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-700">
                <div className="flex flex-wrap gap-1.5">
                  {service.specialties.map(s => (
                    <span key={s} className="text-[10px] font-medium px-2 py-1 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Action links */}
            <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-stone-100 dark:border-stone-700">
              {service.yelpUrl && (
                <a href={service.yelpUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> View on Yelp
                </a>
              )}
              {placeDetails?.googleMapsUri ? (
                <a href={placeDetails.googleMapsUri} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Google Maps
                </a>
              ) : (
                <a href={`https://www.google.com/search?q=${encodeURIComponent(service.name + ' ' + service.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Google
                </a>
              )}
            </div>

            {/* Google Reviews — lazy loaded */}
            {!placeDetailsLoading && placeDetails && (
              <div className="px-5 py-3 border-b border-stone-100 dark:border-stone-700">
                {!atmosphere && !atmosphereLoading && (
                  <button
                    onClick={handleLoadReviews}
                    className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    See Google Reviews
                  </button>
                )}
                {atmosphereLoading && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">Loading reviews…</p>
                )}
                {atmosphere && atmosphere.reviews.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Google Reviews</p>
                    {atmosphere.reviews.slice(0, 3).map((review, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">{review.authorName}</span>
                          <span className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: review.rating }).map((_, j) => (
                              <Star key={j} className="w-2.5 h-2.5 fill-current" />
                            ))}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-auto">{review.relativePublishTimeDescription}</span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-3">{review.text}</p>
                      </div>
                    ))}
                  </div>
                )}
                {atmosphere && atmosphere.reviews.length === 0 && (
                  <p className="text-xs text-stone-400 dark:text-stone-500">No reviews available.</p>
                )}
              </div>
            )}

            {/* Social links */}
            {service.socialLinks && Object.keys(service.socialLinks).length > 0 && (
              <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-stone-100 dark:border-stone-700">
                {Object.entries(service.socialLinks).filter(([, v]) => v).map(([platform, url]) => (
                  <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-600 capitalize transition-colors">
                    {platform}
                  </a>
                ))}
              </div>
            )}

            {/* Claim listing */}
            {service.status === 'seeded' && (
              <div className="px-5 py-4 text-center">
                <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">Is this your business?</p>
                <button onClick={() => setShowClaim(true)}
                  className="text-xs font-medium px-4 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
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
