import { useState, useEffect, useCallback, useRef } from 'react';

export interface Message {
  id: string;
  type: 'message' | 'user_joined' | 'user_left' | 'typing' | 'stop_typing';
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
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
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
  onTyping,
  onStopTyping,
}: UseWebSocketProps): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!username) return;

    try {
      setConnectionStatus('connecting');
      
      // For demo purposes, we'll simulate a WebSocket connection
      // In a real app, you'd connect to an actual WebSocket server
      // ws.current = new WebSocket('ws://localhost:8080');
      
      // Simulate connection success after a short delay
      setTimeout(() => {
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Simulate user joined event
        onUserJoined(username);
        
        // Simulate some initial users
        setTimeout(() => {
          onUserJoined('Alice');
          onUserJoined('Bob');
        }, 500);
      }, 1000);

    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [username, onUserJoined]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    
    // Simulate user left event
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

  const sendMessage = useCallback((message: string): boolean => {
    if (!isConnected || !username || !message.trim()) {
      return false;
    }

    try {
      const messageData: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type: 'message',
        username,
        content: message.trim(),
        channel,
        timestamp: new Date().toISOString(),
      };

      // In a real app, you'd send this via WebSocket
      // ws.current?.send(JSON.stringify(messageData));
      
      // For demo, simulate receiving our own message
      setTimeout(() => {
        onMessage(messageData);
      }, 100);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [isConnected, username, channel, onMessage]);

  const sendTyping = useCallback(() => {
    if (!isConnected || !username) return;

    try {
      // In a real app, you'd send typing indicator via WebSocket
      // ws.current?.send(JSON.stringify({
      //   type: 'typing',
      //   username,
      //   channel,
      // }));
      
      // For demo, we don't simulate typing from ourselves
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [isConnected, username, channel]);

  const sendStopTyping = useCallback(() => {
    if (!isConnected || !username) return;

    try {
      // In a real app, you'd send stop typing indicator via WebSocket
      // ws.current?.send(JSON.stringify({
      //   type: 'stop_typing',
      //   username,
      //   channel,
      // }));
    } catch (error) {
      console.error('Error sending stop typing indicator:', error);
    }
  }, [isConnected, username, channel]);

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

  // Simulate some random activity for demo purposes
  useEffect(() => {
    if (!isConnected) return;

    const simulateActivity = () => {
      const activities = [
        () => {
          // Simulate someone typing
          const users = ['Alice', 'Bob', 'Charlie'];
          const randomUser = users[Math.floor(Math.random() * users.length)];
          if (randomUser !== username) {
            onTyping(randomUser);
            // Stop typing after 2-3 seconds
            setTimeout(() => {
              onStopTyping(randomUser);
            }, 2000 + Math.random() * 1000);
          }
        },
        () => {
          // Simulate a random message
          const users = ['Alice', 'Bob', 'Charlie'];
          const messages = [
            'Hey everyone!',
            'How is everyone doing?',
            'Working on something cool',
            'Just deployed a new feature',
            'Anyone up for lunch?',
            'Great work on the project!',
          ];
          const randomUser = users[Math.floor(Math.random() * users.length)];
          const randomMessage = messages[Math.floor(Math.random() * messages.length)];
          
          if (randomUser !== username) {
            const messageData: Message = {
              id: `demo-${Date.now()}-${Math.random()}`,
              type: 'message',
              username: randomUser,
              content: randomMessage,
              channel,
              timestamp: new Date().toISOString(),
            };
            onMessage(messageData);
          }
        },
      ];

      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      randomActivity();
    };

    // Simulate activity every 10-30 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance of activity
        simulateActivity();
      }
    }, 10000 + Math.random() * 20000);

    return () => clearInterval(interval);
  }, [isConnected, username, channel, onMessage, onTyping]);

  return {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
  };
}
