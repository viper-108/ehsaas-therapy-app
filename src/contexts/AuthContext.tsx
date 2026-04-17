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

  useEffect(() => {
    const savedToken = localStorage.getItem('ehsaas_token');
    const savedRole = localStorage.getItem('ehsaas_role') as 'therapist' | 'client' | 'admin' | null;

    if (savedToken && savedRole) {
      setToken(savedToken);
      setRole(savedRole);
      // Verify token and get user data
      api.getMe()
        .then(data => {
          setUser(data.user);
          setRole(data.role);
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('ehsaas_token');
          localStorage.removeItem('ehsaas_role');
          setToken(null);
          setRole(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
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
