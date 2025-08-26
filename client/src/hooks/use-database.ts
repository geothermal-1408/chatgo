import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  isJoined?: boolean; // Track if user has joined this channel
  memberCount?: number; // Optional member count for display
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

// Hook for managing channels
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    //console.log("useChannels - user:", user);
    //console.log("useChannels - user type:", typeof user);

    const fetchChannels = async () => {
      try {
        setError(null);
        setLoading(true);

        //console.log("Fetching all channels...");

        // Start with fetching all public channels directly
        const { data: publicChannels, error: publicError } = await supabase
          .from("channels")
          .select("*")
          .eq("is_private", false)
          .order("created_at", { ascending: true });

        if (publicError) {
          console.error("Error fetching public channels:", publicError);
          throw publicError;
        }

        //console.log("Public channels fetched:", publicChannels?.length || 0);

        // If no user is authenticated, just show public channels as available to join
        if (!user) {
          console.log("No authenticated user, showing only public channels");
          setChannels([]);
          setAvailableChannels(
            (publicChannels || []).map((ch) => ({ ...ch, isJoined: false }))
          );
          setLoading(false);
          return;
        }

        // console.log(
        //   "Fetching member channels for authenticated user:",
        //   user.id
        // );

        // Get channels where user is a member (only if user is authenticated)
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

        //console.log("Member channels found:", memberChannels.length);

        // Extract joined channel IDs
        const joinedChannelIds = new Set(
          memberChannels.map((mc: { channel: Channel }) => mc.channel.id)
        );

        // ✅ FIX: Show ALL public channels in the main list, regardless of membership
        // This way users can see and join any public channel
        const allPublicChannels = (publicChannels || []).map((channel) => ({
          ...channel,
          isJoined: joinedChannelIds.has(channel.id),
        }));

        // console.log("All public channels:", allPublicChannels.length);

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
              //console.log("Auto-joined user to general channel");

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
        setLoading(false);
      }
    };

    fetchChannels();
  }, [user]);

  const createChannel = async (
    name: string,
    description?: string,
    isPrivate: boolean = false
  ) => {
    if (!user) throw new Error("User not authenticated");

    // Create channel directly without RPC
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .insert({
        name,
        description: description || null,
        is_private: isPrivate,
        created_by: user.id,
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // Add the creator as a member
    const { error: memberError } = await supabase
      .from("channel_members")
      .insert({
        channel_id: channelData.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Failed to add creator as member:", memberError);
      // Don't fail the channel creation, just log the error
    }

    setChannels((prev) => [...prev, channelData]);
    return channelData;
  };

  const joinChannel = async (channelId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.from("channel_members").insert({
      channel_id: channelId,
      user_id: user.id,
      role: "member",
    });

    // Handle duplicate key error (user already a member)
    if (error) {
      if (error.code === "23505") {
        console.log("User is already a member of this channel");
        // Update the local state to reflect that user is already joined
        setChannels((prev) =>
          prev.map((channel) =>
            channel.id === channelId ? { ...channel, isJoined: true } : channel
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
  };

  const leaveChannel = async (channelId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", user.id);

    if (error) throw error;

    // Move channel from joined to available (if it's public)
    const channelToMove = channels.find((ch) => ch.id === channelId);
    if (channelToMove && !channelToMove.is_private) {
      setAvailableChannels((prev) => [
        ...prev,
        { ...channelToMove, isJoined: false },
      ]);
    }
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  };

  return {
    channels,
    availableChannels,
    loading,
    error,
    createChannel,
    joinChannel,
    leaveChannel,
  };
}

// Hook for managing messages in a channel
export function useMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!channelId) return;

    const fetchMessages = async () => {
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
        setLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
          // Fetch the complete message with user data
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
        async (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
          // Fetch the updated message with user data
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
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  const sendMessage = async (content: string, replyTo?: string) => {
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
  };

  const editMessage = async (messageId: string, content: string) => {
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
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", user.id); // Only allow deleting own messages

    if (error) throw error;
  };

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

    const fetchMembers = async () => {
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
        setLoading(false);
      }
    };

    fetchMembers();

    // Subscribe to member changes
    const subscription = supabase
      .channel(`channel-members-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_members",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          fetchMembers(); // Refresh members on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channelId]);

  return {
    members,
    loading,
  };
}
