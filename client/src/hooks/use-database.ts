import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// Global flag to track if the page is visible
let isPageVisible = !document.hidden;

// Handle visibility changes to prevent unnecessary refetches
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    isPageVisible = !document.hidden;
  });
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  isJoined?: boolean;
  //memberCount?: number;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  file_url: string | null;
  reply_to: string | null;
  edited: boolean;
  edited_at: string | null;
  created_at: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean;
  };
}

interface MessagePayload {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  file_url: string | null;
  reply_to: string | null;
  edited: boolean;
  edited_at: string | null;
  created_at: string;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    let hasInitialized = false;
    let isMounted = true;

    const fetchChannels = async () => {
      // Skip fetch if component is unmounted or not initialized and page not visible
      if (!isMounted || (!hasInitialized && !isPageVisible)) return;

      // Only show loading on initial fetch, not on tab visibility changes
      if (!hasInitialized) {
        setLoading(true);
      }

      try {
        setError(null);

        const { data: publicChannels, error: publicError } = await supabase
          .from("channels")
          .select("*")
          .eq("is_private", false)
          .order("created_at", { ascending: true });

        if (publicError) {
          console.error("Error fetching public channels:", publicError);
          throw publicError;
        }

        if (!user) {
          setChannels([]);
          setAvailableChannels(
            (publicChannels || []).map((ch) => ({ ...ch, isJoined: false }))
          );
          if (!hasInitialized) {
            setLoading(false);
          }
          return;
        }

        let memberChannels: { channel: Channel }[] = [];
        try {
          const { data, error: memberError } = await supabase
            .from("channel_members")
            .select(
              `
              channel:channels (
                id,
                name,
                description,
                is_private,
                created_by,
                created_at,
                updated_at
              )
            `
            )
            .eq("user_id", user.id);

          if (memberError) {
            console.error("Error fetching member channels:", memberError);
            // Don't fail completely, just use public channels
          } else {
            memberChannels = (data as unknown as { channel: Channel }[]) || [];
          }
        } catch (memberFetchError) {
          console.error("Failed to fetch member channels:", memberFetchError);
          // Continue with just public channels
        }

        // Extract joined channel IDs
        const joinedChannelIds = new Set(
          memberChannels.map((mc: { channel: Channel }) => mc.channel.id)
        );

        const allPublicChannels = (publicChannels || []).map((channel) => ({
          ...channel,
          isJoined: joinedChannelIds.has(channel.id),
        }));

        // Show all public channels in the main list instead of just joined ones
        setChannels(allPublicChannels);
        setAvailableChannels([]); // Empty since we're showing all in main list

        // If user has no joined channels and there are public channels, try to auto-join them to the general channel
        if (
          joinedChannelIds.size === 0 &&
          publicChannels &&
          publicChannels.length > 0
        ) {
          const generalChannel = publicChannels.find(
            (ch) => ch.name === "general"
          );
          if (generalChannel) {
            try {
              await supabase.from("channel_members").insert({
                channel_id: generalChannel.id,
                user_id: user.id,
                role: "member",
              });

              // Update the channels list to mark general as joined
              setChannels((prev) =>
                prev.map((ch) =>
                  ch.id === generalChannel.id ? { ...ch, isJoined: true } : ch
                )
              );
            } catch (joinError) {
              console.error("Failed to auto-join general channel:", joinError);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching channels:", error);
        setError(
          `Failed to fetch channels: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        // Set empty array on error so UI doesn't break
        setChannels([]);
        setAvailableChannels([]);
      } finally {
        if (!hasInitialized) {
          setLoading(false);
          hasInitialized = true;
        }
      }
    };

    // Only fetch on initial mount or when user changes
    fetchChannels();

    // Create subscriptions with persistence across tab switches
    const channelSubscription = supabase
      .channel("channels-realtime", {
        config: {
          presence: { key: "user_id" },
          broadcast: { self: true, ack: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channels",
        },
        (payload) => {
          const newChannel = payload.new as Channel;

          // Only add public channels or channels we're members of
          if (!newChannel.is_private) {
            const channelWithJoinStatus = {
              ...newChannel,
              isJoined: false, // Will be updated if user joins
            };
            setChannels((prev) => [...prev, channelWithJoinStatus]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "channels",
        },
        (payload) => {
          const updatedChannel = payload.new as Channel;
          setChannels((prev) =>
            prev.map((ch) =>
              ch.id === updatedChannel.id ? { ...ch, ...updatedChannel } : ch
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "channels",
        },
        (payload) => {
          const deletedChannel = payload.old as Channel;
          setChannels((prev) =>
            prev.filter((ch) => ch.id !== deletedChannel.id)
          );
        }
      )
      .subscribe();

    // Subscribe to channel membership changes with persistence
    let membershipSubscription: any = null;
    if (user?.id) {
      membershipSubscription = supabase
        .channel("channel-memberships-realtime", {
          config: {
            presence: { key: "user_id" },
            broadcast: { self: true, ack: false },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "channel_members",
            filter: `user_id=eq.${user.id}`, // Always has a valid filter now
          },
          (payload) => {
            const membership = payload.new as {
              channel_id: string;
              user_id: string;
              role: string;
            };

            if (membership.user_id === user.id) {
              setChannels((prev) =>
                prev.map((ch) =>
                  ch.id === membership.channel_id
                    ? { ...ch, isJoined: true }
                    : ch
                )
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "channel_members",
            filter: `user_id=eq.${user.id}`, // Always has a valid filter now
          },
          (payload) => {
            const membership = payload.old as {
              channel_id: string;
              user_id: string;
            };
            if (membership.user_id === user.id) {
              setChannels((prev) =>
                prev.map((ch) =>
                  ch.id === membership.channel_id
                    ? { ...ch, isJoined: false }
                    : ch
                )
              );
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(channelSubscription);
      if (membershipSubscription) {
        supabase.removeChannel(membershipSubscription);
      }
    };
  }, [user]);

  const createChannel = useCallback(
    async (name: string, description?: string, isPrivate: boolean = false) => {
      // Use the user from the current closure scope, which gets updated by the useCallback dependency
      if (!user) throw new Error("User not authenticated");
      try {
        const { data: channelData, error: channelError } = await supabase
          .from("channels")
          .insert({
            name: name.trim(),
            description: description?.trim() || null,
            is_private: isPrivate,
            created_by: user.id,
          })
          .select()
          .abortSignal(AbortSignal.timeout(10000))
          .single();

        if (channelError) {
          console.error("Channel creation error:", channelError);
          throw new Error(`Failed to create channel: ${channelError.message}`);
        }

        if (!channelData || channelData.length === 0) {
          throw new Error("No data returned from channel creation");
        }

        // Add membership
        const { error: memberError } = await supabase
          .from("channel_members")
          .insert({
            channel_id: channelData.id,
            user_id: user.id,
            role: "owner",
          });

        if (memberError) {
          console.error("Membership creation failed:", memberError);
          await supabase.from("channels").delete().eq("id", channelData.id);
          throw new Error(
            `Failed to create membership: ${memberError.message}`
          );
        }

        const newChannel = { ...channelData, isJoined: true };
        setChannels((prev) => [...prev, newChannel]);
        return newChannel;
      } catch (error) {
        console.error("Channel creation failed:", error);
        throw error;
      }
    },
    [user]
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("channel_members").insert({
        channel_id: channelId,
        user_id: user.id,
        role: "member",
      });

      // Handle duplicate key error (user already a member)
      if (error) {
        if (error.code === "23505") {
          // Update the local state to reflect that user is already joined
          setChannels((prev) =>
            prev.map((channel) =>
              channel.id === channelId
                ? { ...channel, isJoined: true }
                : channel
            )
          );
          return; // Don't throw error for duplicate membership
        }
        throw error;
      }

      // Update the channel's isJoined status in the channels array
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, isJoined: true } : channel
        )
      );
    },
    [user]
  );

  const leaveChannel = useCallback(
    async (channelId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update the channel's isJoined status to false
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, isJoined: false } : channel
        )
      );
    },
    [user]
  );

  const updateChannel = useCallback(
    async (
      channelId: string,
      updates: { name?: string; description?: string; is_private?: boolean }
    ) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("channels")
        .update(updates)
        .eq("id", channelId)
        .eq("created_by", user.id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      // Update the channel in state
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, ...data } : channel
        )
      );

      setAvailableChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, ...data } : channel
        )
      );

      return data;
    },
    [user]
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user) throw new Error("User not authenticated");

      try {
        // First check if the user owns this channel
        const { data: channelCheck, error: checkError } = await supabase
          .from("channels")
          .select("id, created_by, name")
          .eq("id", channelId)
          .eq("created_by", user.id)
          .single();

        if (checkError) {
          console.error("Error checking channel ownership:", checkError);
          throw new Error(
            `Cannot verify channel ownership: ${checkError.message}`
          );
        }

        if (!channelCheck) {
          throw new Error(
            "Channel not found or you don't have permission to delete it"
          );
        }

        // Now delete the channel - cascading will handle members and messages
        const { data, error } = await supabase
          .from("channels")
          .delete()
          .eq("id", channelId)
          .eq("created_by", user.id)
          .select();

        if (error) {
          console.error("Supabase delete error:", error);
          throw new Error(`Failed to delete channel: ${error.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error(
            "No rows were deleted. You may not be the owner of this channel."
          );
        }

        // Remove the channel from state
        setChannels((prev) =>
          prev.filter((channel) => channel.id !== channelId)
        );
        setAvailableChannels((prev) =>
          prev.filter((channel) => channel.id !== channelId)
        );

        return data[0];
      } catch (deleteError) {
        console.error("❌ Error during delete operation:", deleteError);
        throw deleteError;
      }
    },
    [user]
  );

  return {
    channels,
    availableChannels,
    loading,
    error,
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
    // Debug helper function
    debugAuthHeaders: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      return { session, testQuery: { data, error } };
    },
  };
}

// Hook for managing messages in a channel
export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!channelId) return;

    let hasInitialized = false;
    let isMounted = true;

    const fetchMessages = async () => {
      // Skip fetch if component is unmounted or not initialized and page not visible
      if (!isMounted || (!hasInitialized && !isPageVisible)) return;

      // Only show loading on initial fetch
      if (!hasInitialized) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            `
            *,
            user:profiles (
              username,
              display_name,
              avatar_url
            )
          `
          )
          .eq("channel_id", channelId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        if (!hasInitialized) {
          setLoading(false);
          hasInitialized = true;
        }
      }
    };

    fetchMessages();

    // Subscribe to new messages with persistence
    const subscription = supabase
      .channel(`messages-${channelId}`, {
        config: {
          presence: { key: "user_id" },
          broadcast: { self: true, ack: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
          // Dispatch the Supabase query outside the callback to avoid deadlock
          queueMicrotask(async () => {
            try {
              const { data } = await supabase
                .from("messages")
                .select(
                  `
                *,
                user:profiles (
                  username,
                  display_name,
                  avatar_url
                )
              `
                )
                .eq("id", (payload.new as MessagePayload).id)
                .single();

              if (data) {
                setMessages((prev) => [...prev, data]);
              }
            } catch (error) {
              console.error("Error fetching new message:", error);
            }
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
          // Dispatch the Supabase query outside the callback to avoid deadlock
          queueMicrotask(async () => {
            try {
              const { data } = await supabase
                .from("messages")
                .select(
                  `
                *,
                user:profiles (
                  username,
                  display_name,
                  avatar_url
                )
              `
                )
                .eq("id", (payload.new as MessagePayload).id)
                .single();

              if (data) {
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === data.id ? data : msg))
                );
              }
            } catch (error) {
              console.error("Error fetching updated message:", error);
            }
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== (payload.old as MessagePayload).id)
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      if (!user || !channelId)
        throw new Error("User not authenticated or no channel selected");

      // Basic send (no idempotent token column). Optional: optimistic append.
      const optimisticId = `tmp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          channel_id: channelId,
          user_id: user.id,
          content,
          message_type: "text",
          file_url: null,
          reply_to: replyTo || null,
          edited: false,
          edited_at: null,
          created_at: new Date().toISOString(),
          user: {
            username: user.username,
            display_name: user.display_name || null,
            avatar_url: user.avatar_url || null,
          },
        },
      ]);
      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        user_id: user.id,
        content,
        reply_to: replyTo || null,
      });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        throw error;
      }
    },
    [user, channelId]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("messages")
        .update({
          content,
          edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("user_id", user.id); // Only allow editing own messages

      if (error) throw error;
    },
    [user]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", user.id); // Only allow deleting own messages

      if (error) throw error;
    },
    [user]
  );

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}

// Hook for managing channel members
export function useChannelMembers(channelId: string | null) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    let hasInitialized = false;
    let isMounted = true;

    const fetchMembers = async () => {
      // Skip fetch if component is unmounted or not initialized and page not visible
      if (!isMounted || (!hasInitialized && !isPageVisible)) return;

      // Only show loading on initial fetch
      if (!hasInitialized) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("channel_members")
          .select(
            `
            *,
            user:profiles (
              username,
              display_name,
              avatar_url,
              is_online
            )
          `
          )
          .eq("channel_id", channelId);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error("Error fetching channel members:", error);
      } finally {
        if (!hasInitialized) {
          setLoading(false);
          hasInitialized = true;
        }
      }
    };

    fetchMembers();

    // Subscribe to member changes with persistence
    const subscription = supabase
      .channel(`channel-members-${channelId}`, {
        config: {
          presence: { key: "user_id" },
          broadcast: { self: true, ack: false },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_members",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          // Dispatch the Supabase query outside the callback to avoid deadlock
          queueMicrotask(async () => {
            try {
              await fetchMembers(); // Refresh members on any change
            } catch (error) {
              console.error("Error refreshing channel members:", error);
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  return {
    members,
    loading,
  };
}
