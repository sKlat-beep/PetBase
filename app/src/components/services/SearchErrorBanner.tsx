interface SearchErrorBannerProps {
  error: { code: string; message: string } | null;
}

export function SearchErrorBanner({ error }: SearchErrorBannerProps) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl px-4 py-3 text-sm font-medium border ${
        error.code === 'rate-limited'
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-error-container border-error text-on-error-container'
      }`}
    >
      {error.message}
    </div>
  );
}
