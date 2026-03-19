interface TooltipProps {
  content: string;
  children: React.ReactNode;
  /** When true, forces the tooltip visible (e.g. after a long-press on mobile). */
  forceShow?: boolean;
}

export function Tooltip({ content, children, forceShow }: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <div className="relative group">
      {children}
      <div
        role="tooltip"
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs text-inverse-on-surface bg-inverse-surface rounded-md whitespace-nowrap pointer-events-none transition-opacity duration-150 z-50 max-w-[200px] text-center ${forceShow ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-inverse-surface" />
      </div>
    </div>
  );
}
