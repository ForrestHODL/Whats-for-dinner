import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useAppStore } from "./store";

type Store = ReturnType<typeof useAppStore>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const store = useAppStore(user?.id ?? null);
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
