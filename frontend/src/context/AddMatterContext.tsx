import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type AddMatterTab = 'OCR' | 'MANUAL';

interface AddMatterContextType {
  isOpen: boolean;
  initialTab: AddMatterTab;
  openAddMatter: (tab?: AddMatterTab) => void;
  closeAddMatter: () => void;
}

const AddMatterContext = createContext<AddMatterContextType | null>(null);

export function AddMatterProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<AddMatterTab>('OCR');

  const openAddMatter = useCallback((tab: AddMatterTab = 'OCR') => {
    setInitialTab(tab);
    setIsOpen(true);
  }, []);

  const closeAddMatter = useCallback(() => setIsOpen(false), []);

  return (
    <AddMatterContext.Provider value={{ isOpen, initialTab, openAddMatter, closeAddMatter }}>
      {children}
    </AddMatterContext.Provider>
  );
}

export function useAddMatter() {
  const ctx = useContext(AddMatterContext);
  if (!ctx) throw new Error('useAddMatter must be used within AddMatterProvider');
  return ctx;
}
