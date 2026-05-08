import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MessagesThreadLayoutContextValue = {
  /** Mobil: bir DM/sohbet açıkken alt tab tamamen gizlenir */
  mobileMessagesThreadOpen: boolean;
  setMobileMessagesThreadOpen: (open: boolean) => void;
};

const MessagesThreadLayoutContext = createContext<MessagesThreadLayoutContextValue | null>(null);

export function MessagesThreadLayoutProvider({ children }: { children: React.ReactNode }) {
  const [mobileMessagesThreadOpen, setState] = useState(false);
  const setMobileMessagesThreadOpen = useCallback((open: boolean) => {
    setState(open);
  }, []);

  const value = useMemo(
    () => ({ mobileMessagesThreadOpen, setMobileMessagesThreadOpen }),
    [mobileMessagesThreadOpen, setMobileMessagesThreadOpen]
  );

  return (
    <MessagesThreadLayoutContext.Provider value={value}>{children}</MessagesThreadLayoutContext.Provider>
  );
}

export function useMessagesThreadLayout(): MessagesThreadLayoutContextValue {
  const ctx = useContext(MessagesThreadLayoutContext);
  if (!ctx) {
    return {
      mobileMessagesThreadOpen: false,
      setMobileMessagesThreadOpen: () => {},
    };
  }
  return ctx;
}
