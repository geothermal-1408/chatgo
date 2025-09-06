import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface DMWebSocketMessage {
  type: string;
  message_id?: string;
  dm_conversation_id?: string;
  sender_id?: string;
  recipient_id?: string;
  username?: string;
  content?: string;
  timestamp?: string;
  reply_to?: string;
  message_status?: "sent" | "delivered" | "read";
  is_read?: boolean;
  is_delivered?: boolean;
}

interface DMMessage {
  id: string;
  dm_conversation_id: string;
  sender_id: string;
  content: string;
  timestamp: string;
  reply_to?: string;
  status: "sent" | "delivered" | "read";
  sender_username: string;
}

interface UseDMWebSocketOptions {
  onMessageReceived?: (message: DMMessage) => void;
  onTypingReceived?: (senderUsername: string, isTyping: boolean) => void;
  onMessageStatusUpdate?: (
    messageId: string,
    status: "delivered" | "read"
  ) => void;
}

export function useDMWebSocket(options: UseDMWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const { session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    if (!session?.access_token) {
      console.log("No session token available for DM WebSocket");
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close(1000, "Reconnecting");
      wsRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setConnectionStatus("connecting");
      const wsUrl = `ws://localhost:8000/ws?token=${session.access_token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("DM WebSocket connected");
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: DMWebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "dm_message":
              if (message.sender_id !== session.user?.id) {
                // Received a new DM message
                const dmMessage: DMMessage = {
                  id: message.message_id || "",
                  dm_conversation_id: message.dm_conversation_id || "",
                  sender_id: message.sender_id || "",
                  content: message.content || "",
                  timestamp: message.timestamp || new Date().toISOString(),
                  reply_to: message.reply_to,
                  status: message.message_status || "delivered",
                  sender_username: message.username || "",
                };
                optionsRef.current.onMessageReceived?.(dmMessage);
              }
              break;

            case "dm_typing":
              if (message.sender_id !== session.user?.id) {
                optionsRef.current.onTypingReceived?.(
                  message.username || "",
                  true
                );
              }
              break;

            case "dm_stop_typing":
              if (message.sender_id !== session.user?.id) {
                optionsRef.current.onTypingReceived?.(
                  message.username || "",
                  false
                );
              }
              break;

            case "dm_message_read":
              if (message.sender_id === session.user?.id) {
                // Our message was read
                optionsRef.current.onMessageStatusUpdate?.(
                  message.message_id || "",
                  "read"
                );
              }
              break;

            default:
              console.log("Unknown DM WebSocket message type:", message.type);
          }
        } catch (error) {
          console.error("Error parsing DM WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("DM WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus("disconnected");

        // Only set wsRef to null if this is the current connection
        if (wsRef.current === ws) {
          wsRef.current = null;
        }

        // Attempt to reconnect if not a manual close and connection still exists in ref
        if (
          event.code !== 1000 &&
          reconnectAttempts.current < maxReconnectAttempts &&
          wsRef.current === null // Only reconnect if no new connection was created
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            30000
          );
          console.log(
            `Attempting to reconnect DM WebSocket in ${delay}ms (attempt ${
              reconnectAttempts.current + 1
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("DM WebSocket error:", error);
        setConnectionStatus("disconnected");
      };
    } catch (error) {
      console.error("Error creating DM WebSocket connection:", error);
      setConnectionStatus("disconnected");
    }
  }, [session?.access_token, session?.user?.id]);

  useEffect(() => {
    connect();

    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket connection
      if (wsRef.current) {
        // Set to null first to prevent onclose from triggering reconnection
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close(1000, "Component unmounting");
      }

      // Reset state
      setIsConnected(false);
      setConnectionStatus("disconnected");
      reconnectAttempts.current = 0;
    };
  }, [connect]);

  const sendDMMessage = useCallback(
    (recipientId: string, content: string, replyTo?: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error("DM WebSocket not connected");
        return false;
      }

      const message: DMWebSocketMessage = {
        type: "dm_message",
        recipient_id: recipientId,
        content: content.trim(),
        reply_to: replyTo,
      };

      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Error sending DM message:", error);
        return false;
      }
    },
    []
  );

  const sendTypingIndicator = useCallback(
    (recipientId: string, isTyping: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const message: DMWebSocketMessage = {
        type: isTyping ? "dm_typing" : "dm_stop_typing",
        recipient_id: recipientId,
      };

      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error sending typing indicator:", error);
      }
    },
    []
  );

  const markMessageAsRead = useCallback(
    (messageId: string, senderId: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const message: DMWebSocketMessage = {
        type: "dm_message_read",
        message_id: messageId,
        sender_id: senderId,
      };

      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    },
    []
  );

  return {
    isConnected,
    connectionStatus,
    sendDMMessage,
    sendTypingIndicator,
    markMessageAsRead,
  };
}
