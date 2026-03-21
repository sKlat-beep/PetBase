import { createContext, useContext, useState } from 'react';

interface UIContextType {
  openSettingsModal: (section?: string) => void;
  settingsOpen: boolean;
  settingsSection: string | undefined;
  closeSettingsModal: () => void;
}

const UIContext = createContext<UIContextType>({
  openSettingsModal: () => {},
  settingsOpen: false,
  settingsSection: undefined,
  closeSettingsModal: () => {},
});

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | undefined>(undefined);

  const openSettingsModal = (section?: string) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const closeSettingsModal = () => {
    setSettingsOpen(false);
    setSettingsSection(undefined);
  };

  return (
    <UIContext.Provider value={{ openSettingsModal, settingsOpen, settingsSection, closeSettingsModal }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  return useContext(UIContext);
}
