import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

// Your live backend service URL on Render
const BACKEND_URL = 'https://neet-pyq-practice-platform.onrender.com'; 

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
      const storedToken = localStorage.getItem('neet_access_token');
      const storedUser = localStorage.getItem('neet_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
        
        // Quietly verify token on backend or refresh it
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${storedToken}` }
          });

          const contentType = res.headers.get("content-type");

          // Ensure backend actually returned JSON, not an HTML error/sleeping page!
          if (res.ok && contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setUser(data); // The me endpoint returns user details directly
            localStorage.setItem('neet_user', JSON.stringify(data));
          } else {
            // Token might be expired or server returned bad content, try refreshing
            await handleRefresh();
          }
        } catch (err) {
          console.warn('Initial token validation failed:', err);
          await handleRefresh();
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
      // credentials: 'include' is required to send and receive HttpOnly cookies cross-origin
      const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, { 
        method: 'POST',
        credentials: 'include' 
      });
      const contentType = res.headers.get("content-type");

      if (res.ok && contentType && contentType.includes("application/json")) {
        const data = await res.json();
        setToken(data.accessToken);
        
        // Fetch user info using the new access token
        const meRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${data.accessToken}` }
        });
        const meContentType = meRes.headers.get("content-type");

        if (meRes.ok && meContentType && meContentType.includes("application/json")) {
          const meData = await meRes.json();
          setUser(meData);
          localStorage.setItem('neet_access_token', data.accessToken);
          localStorage.setItem('neet_user', JSON.stringify(meData));
        }
      } else {
        // Clear stale local info if session recovery is not valid
        localStorage.removeItem('neet_access_token');
        localStorage.removeItem('neet_user');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn('Refresh token attempt failed:', err);
      localStorage.removeItem('neet_access_token');
      localStorage.removeItem('neet_user');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // credentials: 'include' allows the backend to set the HTTPOnly cookie in the browser
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error('Server returned an invalid response. Please try again in a moment.');
    }

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
    const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error('Server is currently sleeping. Please wait 30 seconds and try again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to sign up.');
    }
    return data;
  };

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, { 
        method: 'POST',
        credentials: 'include'
      });
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