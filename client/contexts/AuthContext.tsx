import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/api-url";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@auth_user";
const AUTH_TOKEN_KEY = "@auth_token";

let cachedToken: string | null = null;

export async function getStoredAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [stored, token] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
      ]);
      
      if (stored && token) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        cachedToken = token;
      } else if (stored || token) {
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, AUTH_TOKEN_KEY]);
        cachedToken = null;
      }
    } catch (error) {
      console.error("Failed to load auth state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    return getStoredAuthToken();
  };

  const login = async (email: string, password: string, rememberMe: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const apiUrl = getApiUrl();
      const url = new URL("/api/auth/login", apiUrl).toString();
      console.log("[Login] Attempting login to:", url);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
          credentials: "include",
        });
        
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error || "Login failed" };
        }

        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email,
        };

        setUser(authUser);
        cachedToken = data.token;

        if (rememberMe) {
          await AsyncStorage.multiSet([
            [AUTH_STORAGE_KEY, JSON.stringify(authUser)],
            [AUTH_TOKEN_KEY, data.token],
          ]);
        } else {
          cachedToken = data.token;
        }

        return { success: true };
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return { success: false, error: "Connection timed out. Please check your internet connection and try again." };
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: `Unable to connect. Please try again.` };
    }
  };

  const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(new URL("/api/auth/register", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email,
      };

      setUser(authUser);
      cachedToken = data.token;
      
      await AsyncStorage.multiSet([
        [AUTH_STORAGE_KEY, JSON.stringify(authUser)],
        [AUTH_TOKEN_KEY, data.token],
      ]);

      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: "Connection failed. Please try again." };
    }
  };

  const logout = async () => {
    try {
      try {
        await fetch(new URL("/api/auth/logout", getApiUrl()).toString(), {
          method: "POST",
          credentials: "include",
        });
      } catch {
      }
      
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, AUTH_TOKEN_KEY]);
      cachedToken = null;
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        getAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
