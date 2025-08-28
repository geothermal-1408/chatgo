import { supabase } from "./supabase";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  display_name?: string;
  bio?: string;
  is_online?: boolean;
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
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
        .select(
          "id, email, username, avatar_url, display_name, bio, is_online, last_seen, created_at, updated_at"
        )
        .eq("id", user.id)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
        bio: profile.bio,
        is_online: profile.is_online,
        last_seen: profile.last_seen,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
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
  async updateProfile(
    updates: {
      username?: string;
      display_name?: string;
      bio?: string;
      avatar_url?: string;
    },
    userId?: string
  ) {
    try {
      let authenticatedUserId = userId;

      if (!authenticatedUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");
        authenticatedUserId = user.id;
      }

      // If username is being updated, check availability
      if (updates.username) {
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", updates.username)
          .neq("id", authenticatedUserId)
          .single();

        if (existingUser) {
          throw new Error("Username is already taken");
        }
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", authenticatedUserId)
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
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: isOnline ? null : new Date().toISOString(),
        })
        .eq("id", session.user.id);

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

  // Get user profile by username
  async getUserProfile(username: string): Promise<AuthUser | null> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "id, email, username, avatar_url, display_name, bio, is_online, last_seen, created_at, updated_at"
        )
        .eq("username", username)
        .single();

      if (!profile) return null;

      return {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
        bio: profile.bio,
        is_online: profile.is_online,
        last_seen: profile.last_seen,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      };
    } catch (error) {
      console.error("Get user profile error:", error);
      return null;
    }
  }

  // Upload avatar
  /*****
   * use direct call instead of rpc
   ****/
  async uploadAvatar(file: File, userId?: string): Promise<string> {
    try {
      console.log("Step 1: Checking for authenticated user...");
      let authenticatedUserId = userId;

      if (!authenticatedUserId) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("No authenticated user");
        authenticatedUserId = session.user.id;
      }

      console.log("✅ User authenticated:", authenticatedUserId);

      // Additional file validation
      console.log("Step 2: Validating file...");
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          "Invalid file type. Please use JPEG, PNG, GIF, or WebP images."
        );
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(
          "File size too large. Please use an image smaller than 5MB."
        );
      }
      console.log(
        "✅ File validation passed:",
        file.name,
        file.type,
        (file.size / 1024 / 1024).toFixed(2) + "MB"
      );

      const fileExt = file.name.split(".").pop();
      const fileName = `${authenticatedUserId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log("Step 3: Prepared upload path:", filePath);

      // Check if avatars bucket exists
      console.log("Step 4: Checking if avatars bucket exists...");
      try {
        const { data: buckets, error: bucketsError } =
          await supabase.storage.listBuckets();
        if (bucketsError) {
          console.error("❌ Bucket list error:", bucketsError);
          throw bucketsError;
        }

        console.log("Available buckets:", buckets?.map((b) => b.name) || []);
        const avatarsBucket = buckets?.find((b) => b.name === "avatars");
        if (!avatarsBucket) {
          console.error("❌ Avatars bucket not found!");
          throw new Error(
            "Avatar storage bucket not found. Please create an 'avatars' bucket in Supabase Storage."
          );
        }
        console.log("✅ Avatars bucket found");
      } catch (bucketError) {
        console.error("❌ Bucket check error:", bucketError);
        throw new Error(
          "Unable to access avatar storage: " +
            (bucketError instanceof Error
              ? bucketError.message
              : "Unknown error")
        );
      }

      console.log("Step 5: Starting file upload...");
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      console.log("Step 6: Upload completed, checking for errors...");

      if (uploadError) {
        console.error("Storage upload error:", uploadError);

        if (uploadError.message.includes("duplicate")) {
          // Retry with a different filename
          const retryFileName = `${authenticatedUserId}-${Date.now()}-${Math.random()}.${fileExt}`;
          const retryFilePath = `avatars/${retryFileName}`;

          const { error: retryError } = await supabase.storage
            .from("avatars")
            .upload(retryFilePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (retryError) throw retryError;

          const { data: retryData } = supabase.storage
            .from("avatars")
            .getPublicUrl(retryFilePath);
          return retryData.publicUrl;
        }

        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      console.log("Avatar uploaded successfully:", data.publicUrl);

      return data.publicUrl;
    } catch (error) {
      console.error("Upload avatar error:", error);
      throw error;
    }
  }

  // Delete avatar
  async deleteAvatar(avatarUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const urlParts = avatarUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      const { error } = await supabase.storage
        .from("avatars")
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error("Delete avatar error:", error);
      throw error;
    }
  }

  // Update user status (online, away, busy, invisible)
  async updateUserStatus(
    status: "online" | "away" | "busy" | "invisible",
    userId?: string
  ): Promise<void> {
    try {
      let authenticatedUserId = userId;

      if (!authenticatedUserId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");
        authenticatedUserId = user.id;
      }

      const isOnline = status === "online";

      const { error } = await supabase
        .from("profiles")
        .update({
          is_online: isOnline,
          last_seen: isOnline ? null : new Date().toISOString(),
        })
        .eq("id", authenticatedUserId);

      if (error) throw error;
    } catch (error) {
      console.error("Update user status error:", error);
      throw error;
    }
  }
}

export const authService = new AuthService();
