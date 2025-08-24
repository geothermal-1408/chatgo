import { useEffect, useRef, useState } from "react";

export interface Message {
  id: string;
  type: string;
  username: string;
  content: string;
  channel: string; // ✅ FIX: added channel field
  timestamp: string;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseWebSocketProps {
  username: string;
  channel: string;
  onMessage: (message: Message) => void;
  onUserJoined: (username: string) => void;
  onUserLeft: (username: string) => void;
  onTyping: (username: string) => void;
  onStopTyping: (username: string) => void;
  onUserList?: (users: string[]) => void; // ✅ FIX: Added callback for user list
}

export function useWebSocket({
  username,
  channel,
  onMessage,
  onUserJoined,
  onUserLeft,
  onTyping,
  onStopTyping,
  onUserList,
}: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  // Client-side rate limiting
  const lastMessageTime = useRef<number>(0);
  const messageQueue = useRef<string[]>([]);
  const isProcessingQueue = useRef<boolean>(false);
  const lastTypingTime = useRef<number>(0);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/ws");

    ws.current.onopen = () => {
      setIsConnected(true);
      setConnectionStatus("connected");

      // ✅ FIX: send a proper join message with type "join" instead of regular message
      const joinMessage = {
        type: "join",
        username,
        channel,
        timestamp: new Date().toISOString(),
      };
      ws.current?.send(JSON.stringify(joinMessage));
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      setConnectionStatus("disconnected");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "message":
            onMessage(data);
            break;
          case "user_joined":
            onUserJoined(data.username);
            break;
          case "user_left":
            onUserLeft(data.username);
            break;
          case "typing":
            onTyping(data.username);
            break;
          case "stop_typing":
            onStopTyping(data.username);
            break;
          case "user_list":
            // Handle initial user list when joining a channel
            if (onUserList && data.users) {
              onUserList(data.users);
            }
            break;
          default:
            console.log("Unknown event:", data);
        }
      } catch (err) {
        console.error("Invalid WS message:", event.data);
      }
    };

    return () => {
      ws.current?.close();
    };
  }, [username, channel]);

  // ✅ FIX: sendMessage with client-side rate limiting
  const sendMessage = (content: string) => {
    if (ws.current && isConnected) {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTime.current;

      // Rate limit: max 1 message per 500ms
      if (timeSinceLastMessage < 500) {
        // Queue the message for later
        messageQueue.current.push(content);

        if (!isProcessingQueue.current) {
          isProcessingQueue.current = true;
          const delay = 500 - timeSinceLastMessage;
          setTimeout(() => {
            processMessageQueue();
          }, delay);
        }
        return;
      }

      // Send immediately
      sendMessageNow(content);
    }
  };

  const sendMessageNow = (content: string) => {
    if (ws.current && isConnected) {
      const message = {
        type: "message",
        username,
        content,
        channel,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2, 15), // ✅ FIX: Add ID to outgoing messages
      };
      ws.current.send(JSON.stringify(message));
      lastMessageTime.current = Date.now();
    }
  };

  const processMessageQueue = () => {
    if (messageQueue.current.length === 0) {
      isProcessingQueue.current = false;
      return;
    }

    const nextMessage = messageQueue.current.shift();
    if (nextMessage) {
      sendMessageNow(nextMessage);
    }

    // Continue processing queue
    if (messageQueue.current.length > 0) {
      setTimeout(() => {
        processMessageQueue();
      }, 500);
    } else {
      isProcessingQueue.current = false;
    }
  };

  // ✅ FIX: typing events with rate limiting
  const sendTyping = () => {
    if (ws.current && isConnected) {
      const now = Date.now();
      if (now - lastTypingTime.current > 1000) {
        // Max 1 typing event per second
        ws.current.send(JSON.stringify({ type: "typing", username, channel }));
        lastTypingTime.current = now;
      }
    }
  };

  const sendStopTyping = () => {
    if (ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({ type: "stop_typing", username, channel })
      );
    }
  };

  const switchChannel = (newChannel: string) => {
    if (ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({
          type: "switch_channel",
          username,
          channel: newChannel,
        })
      );
    }
  };

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
    switchChannel,
  };
}
