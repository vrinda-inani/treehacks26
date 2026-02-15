'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface MobileSidebarState {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  closeAll: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarState>({
  leftOpen: false,
  rightOpen: false,
  toggleLeft: () => {},
  toggleRight: () => {},
  closeAll: () => {},
});

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const toggleLeft = useCallback(() => {
    setLeftOpen((prev) => !prev);
    setRightOpen(false);
  }, []);

  const toggleRight = useCallback(() => {
    setRightOpen((prev) => !prev);
    setLeftOpen(false);
  }, []);

  const closeAll = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  return (
    <MobileSidebarContext.Provider value={{ leftOpen, rightOpen, toggleLeft, toggleRight, closeAll }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}
