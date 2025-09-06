import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./use-auth";
import { useDMWebSocket } from "./use-dm-websocket";

export interface DMConversation {
  dm_id: string;
  other_user_id: string;
  other_user_username: string;
  other_user_display_name: string | null;
  other_user_avatar_url: string | null;
  other_user_is_online: boolean;
  other_user_status: string;
  last_message_content: string | null;
  last_message_sender_id: string | null;
  last_message_read_by_recipient: boolean | null;
  last_message_at: string;
  unread_count: number;
}

export interface DMMessage {
  id: string;
  dm_id: string;
  sender_id: string;
  content: string;
  message_type: "text" | "image" | "file" | "system";
  file_url: string | null;
  reply_to: string | null;
  edited: boolean;
  edited_at: string | null;
  read_by_recipient: boolean;
  read_at: string | null;
  created_at: string;
  sender: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useDirectMessages() {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Only set loading to true if we don't have conversations already (to prevent flashing)
      if (conversations.length === 0) {
        setLoading(true);
      }

      const { data, error: fetchError } = await supabase.rpc(
        "get_user_dm_conversations",
        { user_uuid: user.id }
      );

      if (fetchError) throw fetchError;
      setConversations(data || []);
    } catch (err) {
      console.error("Error fetching DM conversations:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user, conversations.length]);

  useEffect(() => {
    if (!user) return;

    fetchConversations();
  }, [fetchConversations, user]);

  const createOrGetConversation = async (
    targetUserId: string
  ): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc("get_or_create_dm", {
        target_user_id: targetUserId,
      });

      if (error) throw error;

      // Refresh conversations to include the new one
      await fetchConversations();

      return data;
    } catch (err) {
      console.error("Error creating/getting DM conversation:", err);
      throw err;
    }
  };

  const markAsRead = async (dmId: string) => {
    try {
      const { error } = await supabase.rpc("mark_dm_messages_read", {
        dm_conversation_id: dmId,
      });

      if (error) throw error;

      // Update local state to reflect read status
      setConversations((prev) =>
        prev.map((conv) =>
          conv.dm_id === dmId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (err) {
      console.error("Error marking messages as read:", err);
      throw err;
    }
  };

  return {
    conversations,
    loading,
    error,
    createOrGetConversation,
    markAsRead,
    refetch: fetchConversations,
  };
}

// Global state for managing DM messages across multiple hook instances
let globalDMMessages: Record<string, DMMessage[]> = {};
let globalDMSubscribers: Record<
  string,
  Set<(messages: DMMessage[]) => void>
> = {};

export function useDMMessages(dmId: string | null) {
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingIndicator, setTypingIndicator] = useState<{
    isTyping: boolean;
    username: string;
  }>({ isTyping: false, username: "" });
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    if (!dmId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("dm_messages")
        .select(
          `
          id,
          dm_id,
          sender_id,
          content,
          message_type,
          file_url,
          reply_to,
          edited,
          edited_at,
          read_by_recipient,
          read_at,
          created_at,
          sender:profiles!sender_id (
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq("dm_id", dmId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;

      const transformedMessages: DMMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        dm_id: msg.dm_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type,
        file_url: msg.file_url,
        reply_to: msg.reply_to,
        edited: msg.edited,
        edited_at: msg.edited_at,
        read_by_recipient: msg.read_by_recipient,
        read_at: msg.read_at,
        created_at: msg.created_at,
        sender: {
          username: msg.sender.username,
          display_name: msg.sender.display_name,
          avatar_url: msg.sender.avatar_url,
        },
      }));

      // Update global state
      if (dmId) {
        globalDMMessages[dmId] = transformedMessages;
      }
      setMessages(transformedMessages);
    } catch (err) {
      console.error("Error fetching DM messages:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dmId, user]);

  // Initialize WebSocket connection and message handling
  const dmWebSocket = useDMWebSocket({
    onMessageReceived: useCallback((wsMessage: any) => {
      const conversationId = wsMessage.dm_conversation_id;
      if (!conversationId) return;

      // Transform WebSocket message to DMMessage format for our local state
      const newMessage: DMMessage = {
        id: wsMessage.id,
        dm_id: conversationId,
        sender_id: wsMessage.sender_id,
        content: wsMessage.content,
        message_type: "text",
        file_url: null,
        reply_to: wsMessage.reply_to || null,
        edited: false,
        edited_at: null,
        read_by_recipient: false,
        read_at: null,
        created_at: wsMessage.timestamp,
        sender: {
          username: wsMessage.sender_username || "Unknown",
          display_name: null,
          avatar_url: null,
        },
      };

      // Update global messages state
      if (!globalDMMessages[conversationId]) {
        globalDMMessages[conversationId] = [];
      }

      // Prevent duplicates
      if (
        !globalDMMessages[conversationId].some(
          (msg) => msg.id === newMessage.id
        )
      ) {
        globalDMMessages[conversationId] = [
          ...globalDMMessages[conversationId],
          newMessage,
        ];

        // Notify all subscribers for this conversation
        const subscribers = globalDMSubscribers[conversationId];
        if (subscribers) {
          subscribers.forEach((callback) =>
            callback(globalDMMessages[conversationId])
          );
        }
      }
    }, []),
    onTypingReceived: useCallback(
      (senderUsername: string, isTyping: boolean) => {
        // Only show typing if it's not from the current user
        if (senderUsername !== user?.username) {
          const typingData = { isTyping, username: senderUsername };
          setTypingIndicator(typingData);

          // Clear typing indicator after 3 seconds if no stop typing received
          if (isTyping) {
            setTimeout(() => {
              setTypingIndicator((prev) =>
                prev.username === senderUsername
                  ? { isTyping: false, username: "" }
                  : prev
              );
            }, 3000);
          }
        }
      },
      [user?.username]
    ),
  });

  // Subscribe to messages for this conversation
  useEffect(() => {
    if (!dmId) return;

    // Initialize subscribers set if needed
    if (!globalDMSubscribers[dmId]) {
      globalDMSubscribers[dmId] = new Set();
    }

    // Add this component as subscriber
    const updateMessages = (newMessages: DMMessage[]) => {
      setMessages(newMessages);
    };
    globalDMSubscribers[dmId].add(updateMessages);

    // Set initial messages if available, otherwise fetch
    if (globalDMMessages[dmId] && globalDMMessages[dmId].length > 0) {
      setMessages(globalDMMessages[dmId]);
      setLoading(false);
    } else {
      fetchMessages();
    }

    // Cleanup subscription on unmount
    return () => {
      globalDMSubscribers[dmId]?.delete(updateMessages);
      if (globalDMSubscribers[dmId]?.size === 0) {
        delete globalDMSubscribers[dmId];
      }
    };
  }, [dmId, fetchMessages]);

  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      if (!dmId || !user || !content.trim()) return;

      try {
        // Get recipient ID from conversation
        const conversation = await supabase
          .from("direct_messages")
          .select("participant1_id, participant2_id")
          .eq("id", dmId)
          .single();

        if (conversation.error) {
          console.error("Supabase error:", conversation.error);
          throw new Error(
            `Failed to get conversation details: ${conversation.error.message}`
          );
        }

        const recipientId =
          conversation.data.participant1_id === user.id
            ? conversation.data.participant2_id
            : conversation.data.participant1_id;

        // Send via WebSocket
        const success = dmWebSocket.sendDMMessage(
          recipientId,
          content,
          replyTo
        );
        if (!success) {
          throw new Error("Failed to send message via WebSocket");
        }
      } catch (error) {
        console.error("Error in sendMessage:", error);
        throw error;
      }
    },
    [dmId, user, dmWebSocket]
  );

  const sendTypingIndicator = useCallback(
    (recipientId: string, isTyping: boolean) => {
      dmWebSocket.sendTypingIndicator(recipientId, isTyping);
    },
    [dmWebSocket]
  );

  const markMessageAsRead = useCallback(
    (messageId: string, senderId: string) => {
      dmWebSocket.markMessageAsRead(messageId, senderId);
    },
    [dmWebSocket]
  );

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from("dm_messages")
        .update({
          content: newContent,
          edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("sender_id", user?.id);

      if (error) throw error;

      // Update local state
      if (dmId && globalDMMessages[dmId]) {
        globalDMMessages[dmId] = globalDMMessages[dmId].map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                edited: true,
                edited_at: new Date().toISOString(),
              }
            : msg
        );

        // Notify subscribers
        const subscribers = globalDMSubscribers[dmId];
        if (subscribers) {
          subscribers.forEach((callback) => callback(globalDMMessages[dmId]));
        }
      }
    } catch (err) {
      console.error("Error editing message:", err);
      throw err;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("dm_messages")
        .delete()
        .eq("id", messageId)
        .eq("sender_id", user?.id);

      if (error) throw error;

      // Update local state
      if (dmId && globalDMMessages[dmId]) {
        globalDMMessages[dmId] = globalDMMessages[dmId].filter(
          (msg) => msg.id !== messageId
        );

        // Notify subscribers
        const subscribers = globalDMSubscribers[dmId];
        if (subscribers) {
          subscribers.forEach((callback) => callback(globalDMMessages[dmId]));
        }
      }
    } catch (err) {
      console.error("Error deleting message:", err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error,
    typingIndicator,
    sendMessage,
    editMessage,
    deleteMessage,
    markMessageAsRead,
    sendTypingIndicator,
    refetch: fetchMessages,
    isConnected: dmWebSocket.isConnected,
    connectionStatus: dmWebSocket.connectionStatus,
  };
}
