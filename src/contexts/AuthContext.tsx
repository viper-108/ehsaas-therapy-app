import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  role: 'therapist' | 'client' | 'admin' | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, role: 'therapist' | 'client' | 'admin') => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'therapist' | 'client' | 'admin' | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Re-verify the current session against the server. Used on first mount AND
  // whenever the page is restored from the browser's back-forward cache,
  // because bfcache restores React state without re-running effects — which
  // would otherwise show a previously logged-in user's data after navigating
  // back from PhonePe (or any external redirect).
  const refreshAuth = (currentTokenOverride?: string) => {
    const savedToken = currentTokenOverride ?? localStorage.getItem('ehsaas_token');
    const savedRole = localStorage.getItem('ehsaas_role') as 'therapist' | 'client' | 'admin' | null;

    if (!savedToken || !savedRole) {
      // No session in storage — make sure in-memory state matches.
      setUser(null);
      setRole(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(savedToken);
    setRole(savedRole);
    api.getMe()
      .then(data => {
        setUser(data.user);
        setRole(data.role);
      })
      .catch(() => {
        // Token expired / invalid — clear everything so the UI doesn't keep
        // showing stale data restored from bfcache.
        localStorage.removeItem('ehsaas_token');
        localStorage.removeItem('ehsaas_role');
        setToken(null);
        setUser(null);
        setRole(null);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    refreshAuth();

    // bfcache: when the user hits the browser back button after PhonePe (or
    // anywhere else they were navigated to externally), the page may be
    // restored from the back-forward cache with the previous user's state
    // still in memory. Re-verify against /auth/me so we always show the
    // session that's actually in localStorage.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      const tok = localStorage.getItem('ehsaas_token');
      // If the token in storage no longer matches what's in memory (or was
      // cleared while the page was cached), force a full reload so React
      // state can't bleed across users.
      if (tok !== token) {
        window.location.reload();
        return;
      }
      refreshAuth(tok || undefined);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (newToken: string, newUser: User, newRole: 'therapist' | 'client' | 'admin') => {
    localStorage.setItem('ehsaas_token', newToken);
    localStorage.setItem('ehsaas_role', newRole);
    setToken(newToken);
    setUser(newUser);
    setRole(newRole);
  };

  const logout = () => {
    localStorage.removeItem('ehsaas_token');
    localStorage.removeItem('ehsaas_role');
    setToken(null);
    setUser(null);
    setRole(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
