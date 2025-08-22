import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  // Sign up new user
  async signUp({ email, password, username, display_name }: SignUpData) {
    try {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single();

      if (existingUser) {
        throw new Error("Username is already taken");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: display_name || username,
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }

  // Sign in user
  async signIn({ email, password }: SignInData) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    }
  }

  // Sign out user
  async signOut() {
    try {
      console.log("Auth service: Starting sign out...");
      // Update online status before signing out
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        console.log("Auth service: Updating online status to false");
        await this.updateOnlineStatus(false);
      }

      console.log("Auth service: Calling supabase.auth.signOut()");
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Auth service: Supabase signOut error:", error);
        throw error;
      }
      console.log("Auth service: Sign out successful");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
      };
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  // Get current session
  async getSession(): Promise<Session | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error("Get session error:", error);
      return null;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await this.updateOnlineStatus(true);
      } else if (event === "SIGNED_OUT") {
        await this.updateOnlineStatus(false);
      }
      callback(event, session);
    });
  }

  // Update user profile
  async updateProfile(updates: {
    username?: string;
    display_name?: string;
    bio?: string;
    avatar_url?: string;
  }) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // If username is being updated, check availability
      if (updates.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", updates.username)
          .neq("id", user.id)
          .single();

        if (existingUser) {
          throw new Error("Username is already taken");
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  }

  // Update online status
  async updateOnlineStatus(isOnline: boolean) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc("update_user_online_status", {
        user_uuid: user.id,
        online_status: isOnline,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Update online status error:", error);
    }
  }

  // Reset password
  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  // Update password
  async updatePassword(password: string) {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  }
}

export const authService = new AuthService();
