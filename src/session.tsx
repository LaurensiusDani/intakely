import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { refreshSession, setUnauthorizedHandler } from "./services/ApiService";

export type Session = {
  token: string;
  onboardingComplete: boolean;
  record: { id: string; name?: string; email?: string };
};

const storageKey = "intakely.session";

const SessionContext = createContext<{
  ready: boolean;
  session: Session | null;
  setSession: (session: Session | null) => void;
} | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const current = useRef<Session | null>(null);

  const setSession = useCallback((next: Session | null) => {
    current.current = next;
    setSessionState(next);
    void (next
      ? SecureStore.setItemAsync(storageKey, JSON.stringify(next))
      : SecureStore.deleteItemAsync(storageKey)
    ).catch(() => {});
  }, []);

  // Tokens expire after a few days, and PocketBase then treats requests as a guest, so
  // Diary would load empty. Refresh on launch and on every return to the foreground.
  const refresh = useCallback(async () => {
    const stale = current.current;
    if (!stale) return;
    try {
      const fresh = await refreshSession(stale.token);
      if (current.current?.token === stale.token) setSession(fresh);
    } catch {
      // A 401 already signed out through the unauthorized handler. Otherwise keep the
      // saved session and retry on the next foreground.
    }
  }, [setSession]);

  useEffect(() => {
    setUnauthorizedHandler((token) => {
      if (current.current?.token === token) setSession(null);
    });
    void SecureStore.getItemAsync(storageKey)
      .then(async (saved) => {
        if (!saved) return;
        const restored: Session = JSON.parse(saved);
        current.current = restored;
        setSessionState(restored);
        await refresh();
      })
      .catch(() => setSession(null))
      .finally(() => setReady(true));

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh, setSession]);

  return (
    <SessionContext.Provider value={{ ready, session, setSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionProvider is missing.");
  return context;
}
