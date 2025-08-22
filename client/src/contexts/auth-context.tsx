import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { authService, type AuthUser } from "@/lib/auth";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (data: {
    email: string;
    password: string;
    username: string;
    display_name?: string;
  }) => Promise<{ user: User | null; session: Session | null }>;
  signIn: (data: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const session = await authService.getSession();
        setSession(session);

        if (session?.user) {
          const user = await authService.getCurrentUser();
          setUser(user);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_, session) => {
      setSession(session);

      if (session?.user) {
        const user = await authService.getCurrentUser();
        setUser(user);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: {
    email: string;
    password: string;
    username: string;
    display_name?: string;
  }) => {
    setLoading(true);
    try {
      const result = await authService.signUp(data);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (data: { email: string; password: string }) => {
    setLoading(true);
    try {
      await authService.signIn(data);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      console.log("Auth context: sign out successful");
      // Manually clear the user and session state
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error("Auth context sign out error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }) => {
    const updatedProfile = await authService.updateProfile(updates);
    if (updatedProfile && user) {
      setUser({
        ...user,
        username: updatedProfile.username,
        display_name: updatedProfile.display_name,
        avatar_url: updatedProfile.avatar_url,
      });
    }
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext, type AuthContextType };
