interface SearchErrorBannerProps {
  error: { code: string; message: string } | null;
  remainingSearches?: number;
}

export function SearchErrorBanner({ error, remainingSearches }: SearchErrorBannerProps) {
  return (
    <>
      {remainingSearches != null && remainingSearches <= 3 && !error && (
        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2">
          {remainingSearches === 0
            ? "You've used all searches for today."
            : `${remainingSearches} search${remainingSearches === 1 ? '' : 'es'} remaining today.`}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            error.code === 'rate-limited'
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
          }`}
        >
          {error.message}
        </div>
      )}
    </>
  );
}
