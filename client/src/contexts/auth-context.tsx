import { createContext, useEffect, useState, useRef } from "react";
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
  updateUserStatus: (
    status: "online" | "away" | "busy" | "invisible"
  ) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
  deleteAvatar: (avatarUrl: string) => Promise<void>;
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
  const lastSessionIdRef = useRef<string | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  const userCacheRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const session = await authService.getSession();
        setSession(session);

        if (session?.user) {
          const user = await authService.getCurrentUser();
          setUser(user);
          // Cache the initial user data
          userCacheRef.current = user;
          lastSessionIdRef.current = session.user.id;
          lastFetchTimeRef.current = Date.now();
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
    } = authService.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session?.user?.id);

      // Only process meaningful auth events - skip token refreshes and other noise
      const meaningfulEvents = [
        "SIGNED_IN",
        "SIGNED_OUT",
        "USER_UPDATED",
        "PASSWORD_RECOVERY",
      ];
      if (!meaningfulEvents.includes(event)) {
        console.log("Skipping non-meaningful auth event:", event);
        return;
      }

      setSession(session);

      if (session?.user) {
        // Check if we already have cached user data for this session
        const isSameUser = session.user.id === lastSessionIdRef.current;
        const hasCachedData =
          userCacheRef.current && userCacheRef.current.id === session.user.id;

        if (isSameUser && hasCachedData) {
          // Use cached data - no need to fetch
          setUser(userCacheRef.current);
          setLoading(false);
          return;
        }

        // Only fetch user profile if:
        // 1. User ID actually changed, OR
        // 2. We don't have cached data for this user, OR
        // 3. It's been more than 5 minutes since last fetch (for legitimate refreshes)
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTimeRef.current;
        const shouldFetch =
          session.user.id !== lastSessionIdRef.current ||
          !hasCachedData ||
          timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes

        if (shouldFetch) {
          lastSessionIdRef.current = session.user.id;
          lastFetchTimeRef.current = now;
          authService
            .getCurrentUser()
            .then((fetchedUser) => {
              setUser(fetchedUser);
              // Cache the fetched user data
              userCacheRef.current = fetchedUser;
            })
            .catch((error) => {
              console.error("Error fetching user profile:", error);
              setUser(null);
              userCacheRef.current = null;
            });
        }
      } else {
        setUser(null);
        lastSessionIdRef.current = null;
        lastFetchTimeRef.current = 0;
        userCacheRef.current = null;
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []); // Remove user dependency to prevent infinite re-renders

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
      // Clear the cache as well
      userCacheRef.current = null;
      lastSessionIdRef.current = null;
      lastFetchTimeRef.current = 0;
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
    if (!user) throw new Error("No authenticated user");
    const updatedProfile = await authService.updateProfile(updates, user.id);
    if (updatedProfile) {
      const updatedUser = {
        ...user,
        username: updatedProfile.username,
        display_name: updatedProfile.display_name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url,
      };
      setUser(updatedUser);
      // Update the cache with the new profile data
      userCacheRef.current = updatedUser;
      // Update the fetch time since we just got fresh data
      lastFetchTimeRef.current = Date.now();
    }
  };

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  const updateUserStatus = async (
    status: "online" | "away" | "busy" | "invisible"
  ) => {
    if (!user) throw new Error("No authenticated user");
    await authService.updateUserStatus(status, user.id);
    // Note: User status is not part of the current AuthUser interface
    // You may want to add it to the interface if needed
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error("No authenticated user");

    try {
      // Upload to Supabase storage and get the remote URL
      const avatarUrl = await authService.uploadAvatar(file, user.id);

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: avatarUrl });

      return avatarUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  };

  const deleteAvatar = async (avatarUrl: string) => {
    if (!user) throw new Error("No authenticated user");

    try {
      // Delete from Supabase storage
      await authService.deleteAvatar(avatarUrl);

      // Update profile to remove avatar URL
      await updateProfile({ avatar_url: undefined });
    } catch (error) {
      console.error("Error deleting avatar:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    updateUserStatus,
    uploadAvatar,
    deleteAvatar,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext, type AuthContextType };
