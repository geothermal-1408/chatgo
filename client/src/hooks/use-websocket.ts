import { useState, useEffect, useCallback, useRef } from "react";

export interface Message {
  id: string;
  type: "message" | "user_joined" | "user_left" | "typing" | "stop_typing";
  username: string;
  content: string;
  channel: string;
  timestamp: string;
}

export interface UseWebSocketProps {
  username: string;
  channel: string;
  onMessage: (message: Message) => void;
  onUserJoined: (username: string) => void;
  onUserLeft: (username: string) => void;
  onTyping: (username: string) => void;
  onStopTyping: (username: string) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  sendMessage: (message: string) => boolean;
  sendTyping: () => void;
  sendStopTyping: () => void;
}

export function useWebSocket({
  username,
  channel,
  onMessage,
  onUserJoined,
  onUserLeft,
}: //onTyping,
//onStopTyping,
UseWebSocketProps): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!username) return;

    try {
      setConnectionStatus("connecting");

      // Connect to the Go WebSocket server
      ws.current = new WebSocket("ws://localhost:8000/ws");

      ws.current.onopen = () => {
        console.log("Connected to WebSocket server");
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectAttempts.current = 0;

        // Notify that user joined
        onUserJoined(username);
      };

      ws.current.onmessage = (event) => {
        try {
          // The Go server sends plain text messages
          // Format: "username: message content"
          const messageText = event.data;

          // Parse the message to extract username and content
          const colonIndex = messageText.indexOf(": ");
          if (colonIndex > 0) {
            const senderUsername = messageText.substring(0, colonIndex);
            const content = messageText.substring(colonIndex + 2);

            const messageData: Message = {
              id: `msg-${Date.now()}-${Math.random()}`,
              type: "message",
              username: senderUsername,
              content: content,
              channel,
              timestamp: new Date().toISOString(),
            };

            onMessage(messageData);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      ws.current.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        setConnectionStatus("disconnected");

        // Notify that user left
        onUserLeft(username);

        // Attempt to reconnect
        scheduleReconnect();
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionStatus("error");
        scheduleReconnect();
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      setConnectionStatus("error");
      scheduleReconnect();
    }
  }, [username, channel, onMessage, onUserJoined, onUserLeft]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    setIsConnected(false);
    setConnectionStatus("disconnected");

    // Notify that user left
    if (username) {
      onUserLeft(username);
    }
  }, [username, onUserLeft]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttempts.current += 1;
        connect();
      }, delay);
    }
  }, [connect]);

  const sendMessage = useCallback(
    (message: string): boolean => {
      if (!isConnected || !username || !message.trim() || !ws.current) {
        return false;
      }

      try {
        // Send message in the format expected by Go server: "username: message"
        const formattedMessage = `${username}: ${message.trim()}`;
        ws.current.send(formattedMessage);
        return true;
      } catch (error) {
        console.error("Error sending message:", error);
        return false;
      }
    },
    [isConnected, username]
  );

  const sendTyping = useCallback(() => {
    // The Go server doesn't support typing indicators yet
    // This is a placeholder for future implementation
  }, []);

  const sendStopTyping = useCallback(() => {
    // The Go server doesn't support typing indicators yet
    // This is a placeholder for future implementation
  }, []);

  // Connect when username changes
  useEffect(() => {
    if (username) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [username, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
  };
}
