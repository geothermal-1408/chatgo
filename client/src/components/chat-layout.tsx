import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket, type Message } from "@/hooks/use-websocket";
import { MessageComponent } from "@/components/chat/message";
import { MessageInput } from "@/components/chat/message-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChannelList } from "@/components/chat/channel-list";
import { UserList } from "@/components/chat/user-list";
import { UserControls } from "@/components/chat/user-controls";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

const channels = [
  { id: "general", name: "general", type: "text" },
  { id: "random", name: "random", type: "text" },
  { id: "tech", name: "tech", type: "text" },
];

interface User {
  id: string;
  username: string;
  status: string;
  role?: string;
  bio?: string;
  joinedAt?: string;
}

interface ChatLayoutProps {
  initialUser: {
    username: string;
    status?: string;
    bio?: string;
  };
}

export function ChatLayout({ initialUser }: ChatLayoutProps) {
  const [activeChannel, setActiveChannel] = useState("general");
  const [isMuted, setIsMuted] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMessage = useCallback(
    (message: Message) => {
      if (message.channel === activeChannel) {
        setMessages((prev) => [...prev, message]);
      }
    },
    [activeChannel]
  );

  const handleUserJoined = useCallback(
    (username: string) => {
      const newUser: User = {
        id: Math.random().toString(36).substring(2, 9),
        username,
        status: "online",
        joinedAt: new Date().toISOString(),
      };
      setOnlineUsers((prev) => [...prev, newUser]);

      const systemMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: "user_joined",
        username: "System",
        content: `${username} joined the channel`,
        channel: activeChannel,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    },
    [activeChannel]
  );

  const handleUserLeft = useCallback(
    (username: string) => {
      setOnlineUsers((prev) =>
        prev.filter((user) => user.username !== username)
      );

      const systemMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        type: "user_left",
        username: "System",
        content: `${username} left the channel`,
        channel: activeChannel,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    },
    [activeChannel]
  );

  const handleTyping = useCallback((username: string) => {
    setTypingUsers((prev) => new Set([...prev, username]));

    setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }, 3000);
  }, []);

  const handleStopTyping = useCallback((username: string) => {
    setTypingUsers((prev) => {
      const newSet = new Set(prev);
      newSet.delete(username);
      return newSet;
    });
  }, []);

  const {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
  } = useWebSocket({
    username: user?.username || "",
    channel: activeChannel,
    onMessage: handleMessage,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onTyping: handleTyping,
    onStopTyping: handleStopTyping,
  });

  const getAvatarColor = (username: string) => {
    const colors = [
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-blue-500 to-cyan-500",
      "bg-gradient-to-br from-green-500 to-emerald-500",
      "bg-gradient-to-br from-orange-500 to-red-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleLogout = () => {
    navigate("/");
  };

  const handleSendMessage = (message: string) => {
    return sendMessage(message);
  };

  const handleChannelChange = (channelId: string) => {
    setActiveChannel(channelId);
    setMessages([]);
    setTypingUsers(new Set());
  };

  const handleUserClick = (clickedUser: User) => {
    setSelectedUser(clickedUser);
  };

  const handleSaveProfile = (profile: { bio: string; status: string }) => {
    if (user) {
      setUser({ ...user, ...profile });
    }
  };

  const handleUserMention = (username: string) => {
    console.log("Mention user:", username);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar - Channels */}
        <div className="w-60 bg-gray-900/50 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
          {/* Server Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-lg">
                C
              </div>
              <div>
                <h1 className="font-semibold text-white">ChatGo</h1>
                <p className="text-xs text-gray-400">Modern Chat App</p>
              </div>
            </div>
          </div>

          <ChannelList
            channels={channels}
            activeChannel={activeChannel}
            onChannelChange={handleChannelChange}
          />

          <UserControls
            user={user}
            connectionStatus={connectionStatus}
            isConnected={isConnected}
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
            onLogout={handleLogout}
            getAvatarColor={getAvatarColor}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-800/30 backdrop-blur-sm">
          <ChatHeader
            activeChannel={activeChannel}
            connectionStatus={connectionStatus}
            onlineUserCount={onlineUsers.length + 1}
          />

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-start space-x-3 group">
                <Avatar className="w-10 h-10 mt-1">
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                    S
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-white">System</span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(new Date().toISOString())}
                    </span>
                  </div>
                  <div className="text-gray-300 bg-gray-700/30 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
                    Welcome to #{activeChannel}, {user.username}! Start chatting
                    with your team.
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageComponent
                key={message.id}
                message={message}
                getAvatarColor={getAvatarColor}
                formatTimestamp={formatTimestamp}
                onUserClick={handleUserMention}
              />
            ))}

            <TypingIndicator typingUsers={typingUsers} />

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-700/50">
            <MessageInput
              activeChannel={activeChannel}
              isConnected={isConnected}
              onSendMessage={handleSendMessage}
              onTyping={sendTyping}
              onStopTyping={sendStopTyping}
            />
          </div>
        </div>

        {/* Right Sidebar - User List */}
        <div className="w-60 bg-gray-900/30 backdrop-blur-sm border-l border-gray-700/50">
          <UserList
            currentUser={{ username: user.username }}
            onlineUsers={onlineUsers}
            connectionStatus={connectionStatus}
            isConnected={isConnected}
            onUserClick={handleUserClick}
            getAvatarColor={getAvatarColor}
          />
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          isCurrentUser={selectedUser.username === user.username}
          onClose={() => setSelectedUser(null)}
          onSaveProfile={handleSaveProfile}
          getAvatarColor={getAvatarColor}
        />
      )}
    </div>
  );
}
