import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean;
  status: "online" | "away" | "busy" | "invisible";
  last_seen: string | null;
  created_at: string;
}

export interface UserRelationship {
  id: string;
  user_id: string;
  target_user_id: string;
  relationship_type:
    | "friend"
    | "blocked"
    | "friend_request_sent"
    | "friend_request_received";
  created_at: string;
  target_user: UserProfile;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "auto";
  notifications_enabled: boolean;
  sound_enabled: boolean;
  show_online_status: boolean;
  allow_friend_requests: boolean;
  created_at: string;
  updated_at: string;
}

// Hook for managing user relationships (friends, blocked users)
export function useUserRelationships() {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<UserRelationship[]>([]);
  const [sentRequests, setSentRequests] = useState<UserRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRelationships = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase.rpc(
        "get_user_friends",
        { user_uuid: user.id }
      );

      if (friendsError) throw friendsError;
      setFriends(friendsData || []);

      // Fetch all relationships
      const { data: relationshipsData, error: relationshipsError } =
        await supabase
          .from("user_relationships")
          .select(
            `
          id,
          user_id,
          target_user_id,
          relationship_type,
          created_at,
          profiles!target_user_id(
            id,
            username,
            display_name,
            avatar_url,
            bio,
            is_online,
            status,
            last_seen,
            created_at
          )
        `
          )
          .eq("user_id", user.id);

      if (relationshipsError) throw relationshipsError;

      // Filter by relationship type and ensure proper typing
      const blocked =
        relationshipsData?.filter((r) => r.relationship_type === "blocked") ||
        [];
      const received =
        relationshipsData?.filter(
          (r) => r.relationship_type === "friend_request_received"
        ) || [];
      const sent =
        relationshipsData?.filter(
          (r) => r.relationship_type === "friend_request_sent"
        ) || [];

      setBlockedUsers(blocked.map((r) => r.profiles as unknown as UserProfile));
      setFriendRequests(
        received.map((r) => ({
          ...r,
          target_user: r.profiles as unknown as UserProfile,
        })) as UserRelationship[]
      );
      setSentRequests(
        sent.map((r) => ({
          ...r,
          target_user: r.profiles as unknown as UserProfile,
        })) as UserRelationship[]
      );
    } catch (err) {
      console.error("Error fetching relationships:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationships();
  }, [user]);

  const sendFriendRequest = async (username: string) => {
    try {
      const { error } = await supabase.rpc("send_friend_request", {
        target_username: username,
      });

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error sending friend request:", err);
      throw err;
    }
  };

  const acceptFriendRequest = async (username: string) => {
    try {
      const { error } = await supabase.rpc("accept_friend_request", {
        sender_username: username,
      });

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error accepting friend request:", err);
      throw err;
    }
  };

  const removeFriend = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_relationships")
        .delete()
        .or(
          `and(user_id.eq.${user?.id},target_user_id.eq.${userId}),and(user_id.eq.${userId},target_user_id.eq.${user?.id})`
        )
        .eq("relationship_type", "friend");

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error removing friend:", err);
      throw err;
    }
  };

  const blockUser = async (username: string) => {
    try {
      const { error } = await supabase.rpc("block_user", {
        target_username: username,
      });

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error blocking user:", err);
      throw err;
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_relationships")
        .delete()
        .eq("user_id", user?.id)
        .eq("target_user_id", userId)
        .eq("relationship_type", "blocked");

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error unblocking user:", err);
      throw err;
    }
  };

  const declineFriendRequest = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_relationships")
        .delete()
        .or(
          `and(user_id.eq.${user?.id},target_user_id.eq.${userId}),and(user_id.eq.${userId},target_user_id.eq.${user?.id})`
        )
        .in("relationship_type", [
          "friend_request_sent",
          "friend_request_received",
        ]);

      if (error) throw error;
      await fetchRelationships(); // Refresh data
    } catch (err) {
      console.error("Error declining friend request:", err);
      throw err;
    }
  };

  return {
    friends,
    blockedUsers,
    friendRequests,
    sentRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    declineFriendRequest,
    refetch: fetchRelationships,
  };
}

// Hook for managing user preferences
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;
      setPreferences(data);
    } catch (err) {
      console.error("Error fetching preferences:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const updatePreferences = async (
    updates: Partial<
      Omit<UserPreferences, "id" | "user_id" | "created_at" | "updated_at">
    >
  ) => {
    if (!user) throw new Error("No authenticated user");

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
      return data;
    } catch (err) {
      console.error("Error updating preferences:", err);
      throw err;
    }
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  };
}

// Hook for searching users
export function useUserSearch() {
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: searchError } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, avatar_url, bio, is_online, status, last_seen, created_at"
        )
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      if (searchError) throw searchError;
      setSearchResults(data || []);
    } catch (err) {
      console.error("Error searching users:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return {
    searchResults,
    loading,
    error,
    searchUsers,
    clearResults: () => setSearchResults([]),
  };
}
