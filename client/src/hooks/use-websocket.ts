import { useEffect, useRef, useState } from "react";

export interface Message {
  id: string;
  type: string;
  username: string;
  content: string;
  channel: string; // ✅ FIX: added channel field
  timestamp: string;
  reply_to?: string; // ✅ NEW: Added reply_to field
  edited?: boolean; // ✅ NEW: Added edited field
  edited_at?: string; // ✅ NEW: Added edited_at field
  avatar_url?: string; // ✅ NEW: Added avatar_url field
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseWebSocketProps {
  username: string;
  channel: string;
  accessToken: string; // ✅ FIX: Added access token for authentication
  onMessage: (message: Message) => void;
  onUserJoined: (username: string) => void;
  onUserLeft: (username: string) => void;
  onTyping: (username: string) => void;
  onStopTyping: (username: string) => void;
  onUserList?: (users: string[]) => void; // ✅ FIX: Added callback for user list
  onMessageEdited?: (message: Message) => void; // ✅ NEW: Added callback for message edits
  onMessageDeleted?: (messageId: string) => void; // ✅ NEW: Added callback for message deletions
  onFriendRequest?: (senderUsername: string) => void; // ✅ NEW: Added callback for friend requests
  onFriendRequestAccepted?: (accepterUsername: string) => void; // ✅ NEW: Added callback for friend request acceptance
}

export function useWebSocket({
  username,
  channel,
  accessToken,
  onMessage,
  onUserJoined,
  onUserLeft,
  onTyping,
  onStopTyping,
  onUserList,
  onMessageEdited,
  onMessageDeleted,
  onFriendRequest,
  onFriendRequestAccepted,
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
    // Don't connect if we don't have an access token or valid channel
    if (!accessToken || !channel.trim()) {
      setConnectionStatus("disconnected");
      return;
    }

    ws.current = new WebSocket(
      `ws://localhost:8000/ws?token=${encodeURIComponent(accessToken)}`
    );

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
          case "message_edited":
            if (onMessageEdited) {
              onMessageEdited(data);
            }
            break;
          case "message_deleted":
            if (onMessageDeleted) {
              onMessageDeleted(data.id);
            }
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
          case "friend_request":
            // Handle incoming friend request notifications
            if (onFriendRequest && data.sender_username) {
              onFriendRequest(data.sender_username);
            }
            break;
          case "friend_request_accepted":
            // Handle friend request acceptance notifications
            if (onFriendRequestAccepted && data.accepter_username) {
              onFriendRequestAccepted(data.accepter_username);
            }
            break;
          default:
            console.log("Unknown event:", data);
        }
      } catch (_e) {
        console.error("Invalid WS message:", event.data);
      }
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [username, channel, accessToken]);

  // ✅ FIX: sendMessage with client-side rate limiting and optional reply-to
  const sendMessage = (content: string, replyTo?: string) => {
    if (ws.current && isConnected) {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTime.current;

      // Rate limit: max 1 message per 500ms
      if (timeSinceLastMessage < 500) {
        // Queue the message for later
        messageQueue.current.push(
          JSON.stringify({
            type: "message",
            username,
            content,
            channel,
            timestamp: new Date().toISOString(),
            reply_to: replyTo,
            id: Math.random().toString(36).substring(2, 15),
          })
        );

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
      sendMessageNow(content, replyTo);
    }
  };

  const sendMessageNow = (content: string, replyTo?: string) => {
    if (ws.current && isConnected) {
      const message = {
        type: "message",
        username,
        content,
        channel,
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substring(2, 15), // ✅ FIX: Add ID to outgoing messages
        reply_to: replyTo,
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

    const message = messageQueue.current.shift();
    if (message && ws.current && isConnected) {
      ws.current.send(message); // Message is already JSON stringified
      lastMessageTime.current = Date.now();
    }

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

  const editMessage = (messageId: string, newContent: string) => {
    if (ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({
          type: "edit_message",
          id: messageId,
          content: newContent,
          channel,
        })
      );
    }
  };

  const deleteMessage = (messageId: string) => {
    if (ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({
          type: "delete_message",
          id: messageId,
          channel,
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
    editMessage,
    deleteMessage,
  };
}
