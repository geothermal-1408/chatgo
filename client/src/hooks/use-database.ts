import { useState, useEffect, useCallback, useRef } from "react";
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
  isJoined?: boolean;
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

  // Track the last user ID to prevent unnecessary re-fetches
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only run if the actual user ID string value has changed
    const currentUserId = user?.id || null;
    if (lastUserIdRef.current === currentUserId) {
      return;
    }
    lastUserIdRef.current = currentUserId;

    let isMounted = true;

    const fetchChannels = async () => {
      if (!isMounted) return;

      setLoading(true);

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
          setLoading(false);
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
          } else {
            memberChannels = (data as unknown as { channel: Channel }[]) || [];
          }
        } catch (memberFetchError) {
          console.error("Failed to fetch member channels:", memberFetchError);
        }

        // Extract joined channel IDs
        const joinedChannelIds = new Set(
          memberChannels.map((mc: { channel: Channel }) => mc.channel.id)
        );

        const allPublicChannels = (publicChannels || []).map((channel) => ({
          ...channel,
          isJoined: joinedChannelIds.has(channel.id),
        }));

        setChannels(allPublicChannels);
        setAvailableChannels([]);

        // Auto-join general channel logic
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
        setChannels([]);
        setAvailableChannels([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch once on initial mount
    fetchChannels();

    // Create subscriptions for real-time updates
    const channelSubscription = supabase
      .channel("channels-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channels",
        },
        (payload) => {
          const newChannel = payload.new as Channel;
          if (!newChannel.is_private) {
            const channelWithJoinStatus = {
              ...newChannel,
              isJoined: false,
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

    // Subscribe to channel membership changes
    let membershipSubscription: any = null;
    if (user?.id) {
      membershipSubscription = supabase
        .channel("channel-memberships-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "channel_members",
            filter: `user_id=eq.${user.id}`,
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
            filter: `user_id=eq.${user.id}`,
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
  }, [user?.id]); // Only re-run when user ID changes

  const createChannel = useCallback(
    async (name: string, description?: string, isPrivate: boolean = false) => {
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
    [user?.id]
  );

  const joinChannel = useCallback(
    async (channelId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("channel_members").insert({
        channel_id: channelId,
        user_id: user.id,
        role: "member",
      });

      if (error) {
        if (error.code === "23505") {
          setChannels((prev) =>
            prev.map((channel) =>
              channel.id === channelId
                ? { ...channel, isJoined: true }
                : channel
            )
          );
          return;
        }
        throw error;
      }

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, isJoined: true } : channel
        )
      );
    },
    [user?.id]
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

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === channelId ? { ...channel, isJoined: false } : channel
        )
      );
    },
    [user?.id]
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
    [user?.id]
  );

  const deleteChannel = useCallback(
    async (channelId: string) => {
      if (!user) throw new Error("User not authenticated");

      try {
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
    [user?.id]
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
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMessages = async () => {
      if (!isMounted) return;

      setLoading(true);

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
        if (isMounted) {
          setMessages(data || []);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch once on initial mount or channel change
    fetchMessages();

    // Subscribe to new messages for real-time updates
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
        (payload: RealtimePostgresChangesPayload<MessagePayload>) => {
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

              if (data && isMounted) {
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

              if (data && isMounted) {
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
          if (isMounted) {
            setMessages((prev) =>
              prev.filter(
                (msg) => msg.id !== (payload.old as MessagePayload).id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [channelId]); // Only re-run when channelId changes

  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      if (!user || !channelId)
        throw new Error("User not authenticated or no channel selected");

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
        .eq("user_id", user.id);

      if (error) throw error;
    },
    [user?.id]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    [user?.id]
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
    if (!channelId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMembers = async () => {
      if (!isMounted) return;

      setLoading(true);

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
        if (isMounted) {
          setMembers(data || []);
        }
      } catch (error) {
        console.error("Error fetching channel members:", error);
        if (isMounted) {
          setMembers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Only fetch once on initial mount or channel change
    fetchMembers();

    // Subscribe to member changes for real-time updates
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
          // Re-fetch members when there's any change
          queueMicrotask(async () => {
            if (isMounted) {
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
                if (isMounted) {
                  setMembers(data || []);
                }
              } catch (error) {
                console.error("Error refreshing channel members:", error);
              }
            }
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [channelId]); // Only re-run when channelId changes

  return {
    members,
    loading,
  };
}
