import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RightPanelContextValue {
  content: ReactNode | null;
  setContent: (node: ReactNode | null) => void;
}

const RightPanelContext = createContext<RightPanelContextValue>({
  content: null,
  setContent: () => {},
});

export function RightPanelProvider({ children }: { children: ReactNode }) {
  const [content, setContentState] = useState<ReactNode | null>(null);
  const setContent = useCallback((node: ReactNode | null) => setContentState(node), []);
  return (
    <RightPanelContext.Provider value={{ content, setContent }}>
      {children}
    </RightPanelContext.Provider>
  );
}

export function useRightPanel() {
  return useContext(RightPanelContext);
}
