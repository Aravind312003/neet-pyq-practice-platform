import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (name: string, email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attempt to load credentials from local storage or refresh token from API on mount
  useEffect(() => {
    const initAuth = async () => {
      // First, try to fetch the current user details if we have a saved token
      const storedToken = localStorage.getItem('neet_access_token');
      const storedUser = localStorage.getItem('neet_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
        
        // Quietly verify token on backend or refresh it
        try {
          const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            localStorage.setItem('neet_user', JSON.stringify(data.user));
          } else {
            // Token might be expired, try refreshing
            await handleRefresh();
          }
        } catch (err) {
          console.warn('Initial token validation failed:', err);
        }
      } else {
        // No local token, try refreshing using the HttpOnly cookie
        await handleRefresh();
      }
    };

    initAuth();
  }, []);

  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setToken(data.accessToken);
        
        // Fetch user info
        const meRes = await fetch('/api/me', {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData.user);
          localStorage.setItem('neet_access_token', data.accessToken);
          localStorage.setItem('neet_user', JSON.stringify(meData.user));
        }
      } else {
        // Clear stale local info
        localStorage.removeItem('neet_access_token');
        localStorage.removeItem('neet_user');
      }
    } catch (err) {
      console.warn('Refresh token attempt failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign in.');
    }

    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('neet_access_token', data.accessToken);
    localStorage.setItem('neet_user', JSON.stringify(data.user));
    return data;
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to sign up.');
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('neet_access_token');
      localStorage.removeItem('neet_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
