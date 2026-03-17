import { useRightPanel } from '../../contexts/RightPanelContext';

export function RightPanel() {
  const { content } = useRightPanel();
  if (!content) return null;
  return (
    <aside className="hidden xl:flex xl:flex-col w-80 shrink-0 h-screen sticky top-0 overflow-y-auto border-l border-stone-200 dark:border-zinc-700/60 bg-stone-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
      <div className="p-4 flex flex-col gap-4">
        {content}
      </div>
    </aside>
  );
}
