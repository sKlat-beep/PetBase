import { useRightPanel } from '../../contexts/RightPanelContext';

export function RightPanel() {
  const { content } = useRightPanel();
  if (!content) return null;
  return (
    <aside className="hidden xl:flex xl:flex-col w-80 shrink-0 h-screen sticky top-0 overflow-y-auto border-l border-neutral-200 dark:border-neutral-700/60 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm">
      <div className="p-4 flex flex-col gap-4">
        {content}
      </div>
    </aside>
  );
}
