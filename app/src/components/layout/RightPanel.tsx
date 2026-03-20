import { useRightPanel } from '../../contexts/RightPanelContext';

export function RightPanel() {
  const { content } = useRightPanel();
  if (!content) return null;
  return (
    <aside className="hidden xl:flex xl:flex-col w-[380px] shrink-0 min-w-0 h-screen sticky top-0 overflow-y-auto border-l border-outline-variant/30 bg-surface glass-morphism">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface flex items-center gap-2" style={{ fontFamily: 'var(--font-headline)' }}>
          <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">bolt</span>
          Shortcuts
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
        {content}
      </div>

      {/* Footer: System status */}
      <div className="px-5 py-3 border-t border-outline-variant/20 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-xs text-on-surface-variant">System online</span>
      </div>
    </aside>
  );
}
