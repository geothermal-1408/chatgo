import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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

// Hook for managing channels
export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchChannels = async () => {
      try {
        // Get channels where user is a member
        const { data: memberChannels, error: memberError } = await supabase
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

        if (memberError) throw memberError;

        // Get public channels
        const { data: publicChannels, error: publicError } = await supabase
          .from("channels")
          .select("*")
          .eq("is_private", false);

        if (publicError) throw publicError;

        // Combine and deduplicate channels
        const allChannels = [
          ...(memberChannels?.map((mc) => mc.channel).filter(Boolean) || []),
          ...(publicChannels || []),
        ];

        const uniqueChannels = allChannels.filter(
          (channel, index, self) =>
            index === self.findIndex((c) => c.id === channel.id)
        ) as Channel[];

        setChannels(uniqueChannels);
      } catch (error) {
        console.error("Error fetching channels:", error);
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

    const { data, error } = await supabase
      .from("channels")
      .insert({
        name,
        description,
        is_private: isPrivate,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as channel owner
    await supabase.from("channel_members").insert({
      channel_id: data.id,
      user_id: user.id,
      role: "owner",
    });

    setChannels((prev) => [...prev, data]);
    return data;
  };

  const joinChannel = async (channelId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase.from("channel_members").insert({
      channel_id: channelId,
      user_id: user.id,
      role: "member",
    });

    if (error) throw error;
  };

  const leaveChannel = async (channelId: string) => {
    if (!user) throw new Error("User not authenticated");

    const { error } = await supabase
      .from("channel_members")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", user.id);

    if (error) throw error;

    setChannels((prev) => prev.filter((c) => c.id !== channelId));
  };

  return {
    channels,
    loading,
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
        async (payload) => {
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
            .eq("id", payload.new.id)
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
        async (payload) => {
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
            .eq("id", payload.new.id)
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
        (payload) => {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== payload.old.id)
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

    const { error } = await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: user.id,
      content,
      reply_to: replyTo || null,
    });

    if (error) throw error;
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
