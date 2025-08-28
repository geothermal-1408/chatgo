import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket, type Message } from "@/hooks/use-websocket";
import { useChannels } from "@/hooks/use-database";
import { MessageComponent } from "@/components/chat/message";
import { MessageInput } from "@/components/chat/message-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChannelList } from "@/components/chat/channel-list";
import { UserList } from "@/components/chat/user-list";
import { UserControls } from "@/components/chat/user-controls";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { CreateChannelModal } from "@/components/chat/create-channel-modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

interface User {
  id: string;
  username: string;
  status: string;
  role?: string;
  bio?: string;
  display_name?: string;
  avatar_url?: string;
  joinedAt?: string;
}

interface ChatLayoutProps {
  initialUser: {
    username: string;
    status?: string;
    bio?: string;
    display_name?: string;
    avatar_url?: string;
  };
}

export function ChatLayout({ initialUser }: ChatLayoutProps) {
  // Track both the active channel's id and name
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeChannelName, setActiveChannelName] = useState<string>("general");
  const [isMuted, setIsMuted] = useState(false);
  const [user, setUser] = useState(initialUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] =
    useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    username: string;
    content: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut, updateProfile, session } = useAuth();
  const {
    channels,
    createChannel,
    joinChannel,
    loading: channelsLoading,
  } = useChannels();

  const isCurrentUserInList = onlineUsers.some(
    (onlineUser) => onlineUser.username === user.username
  );

  useEffect(() => {
    if (channels.length === 0) return;

    const general = channels.find((ch) => ch.name === "general");
    const current = channels.find((ch) => ch.id === activeChannelId);

    // If we already have a valid current channel, just sync its name
    if (current) {
      if (activeChannelName !== current.name)
        setActiveChannelName(current.name);
      return;
    }

    // Prefer general if available; otherwise fall back to first channel
    if (general) {
      setActiveChannelId(general.id);
      setActiveChannelName(general.name);
    } else {
      setActiveChannelId(channels[0].id);
      setActiveChannelName(channels[0].name);
    }
  }, [channels, activeChannelId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle messages - filter by channel if both message and active channel have valid IDs
  const handleMessage = useCallback(
    (message: Message) => {
      console.log("Received message:", message);
      console.log("Active channel ID:", activeChannelId);

      // If message has a channel and we have an active channel, filter by channel
      // Otherwise, accept all messages (for servers that don't support channels)
      if (message.channel && activeChannelId) {
        if (message.channel === activeChannelId) {
          setMessages((prev) => [...prev, message]);
        } else {
          console.log("Message filtered out - channel mismatch");
        }
      } else {
        // Accept all messages when channel filtering isn't available
        setMessages((prev) => [...prev, message]);
      }
    },
    [activeChannelId]
  );

  const handleUserJoined = useCallback(
    (username: string) => {
      setOnlineUsers((prev) => {
        const userExists = prev.some((user) => user.username === username);
        if (userExists) {
          return prev;
        }
        const newUser: User = {
          id: Math.random().toString(36).substring(2, 15),
          username,
          status: "online",
          joinedAt: new Date().toISOString(),
        };
        return [...prev, newUser];
      });

      // Only show join message for other users, not yourself
      if (username !== user?.username) {
        setMessages((prev) => {
          const recentMessages = prev.slice(-10);
          const hasRecentJoinMessage = recentMessages.some(
            (msg) =>
              msg.type === "user_joined" &&
              msg.content.includes(`${username} joined the channel`)
          );
          if (hasRecentJoinMessage) {
            return prev;
          }
          const systemMessage: Message = {
            id: Math.random().toString(36).substring(2, 15),
            type: "user_joined",
            username: "System",
            content: `${username} joined the channel`,
            channel: activeChannelId || "",
            timestamp: new Date().toISOString(),
          };
          return [...prev, systemMessage];
        });
      }
    },
    [activeChannelId, user?.username]
  );

  const handleUserLeft = useCallback(
    (username: string) => {
      setOnlineUsers((prev) =>
        prev.filter((user) => user.username !== username)
      );
    },
    [activeChannelId]
  );

  const handleUserList = useCallback((usernames: string[]) => {
    // ✅ FIX: Handle initial user list when joining a channel
    const users: User[] = usernames.map((username) => ({
      id: Math.random().toString(36).substring(2, 15),
      username,
      status: "online",
      joinedAt: new Date().toISOString(),
    }));
    setOnlineUsers(users);
  }, []);

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

  // Handle message editing
  const handleMessageEdited = useCallback((editedMessage: Message) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === editedMessage.id ? editedMessage : msg))
    );
  }, []);

  const {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
    switchChannel,
    editMessage,
  } = useWebSocket({
    username: user?.username || "",
    channel: activeChannelId || "",
    accessToken: session?.access_token || "",
    onMessage: handleMessage,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onTyping: handleTyping,
    onStopTyping: handleStopTyping,
    onUserList: handleUserList, // ✅ FIX: Added user list handler
    onMessageEdited: handleMessageEdited, // ✅ NEW: Added message edit handler
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

  const handleReply = (messageId: string, username: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      setReplyToMessage({
        id: messageId,
        username,
        content: message.content,
      });
    }
  };

  const handleEdit = (messageId: string, newContent: string) => {
    if (editMessage) {
      editMessage(messageId, newContent);
    }
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const findMessageById = (messageId: string) => {
    return messages.find((m) => m.id === messageId);
  };

  const handleLogout = async () => {
    try {
      console.log("Logout initiated...");
      setSelectedUser(null); // Close the modal first
      await signOut();
      console.log("Logout successful, navigating to home...");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      // Show user-friendly error message
      alert("Failed to logout. Please try again.");
    }
  };

  const handleSendMessage = (message: string, replyTo?: string) => {
    return sendMessage(message, replyTo);
  };

  const handleChannelChange = async (channelId: string) => {
    const found = channels.find((ch) => ch.id === channelId);

    // If user isn't a member of this channel, join it first
    if (found && !found.isJoined) {
      try {
        await joinChannel(channelId);
        console.log(`Successfully joined channel: ${found.name}`);
      } catch (error) {
        console.error("Failed to join channel:", error);
        // Show user-friendly error message
        alert(`Failed to join channel "${found.name}". Please try again.`);
        return; // Don't switch to the channel if joining failed
      }
    }

    setActiveChannelId(channelId);
    setActiveChannelName(found ? found.name : "");
    setMessages([]);
    setTypingUsers(new Set());
    setOnlineUsers([]); // ✅ FIX: Clear users when switching channels

    switchChannel(channelId);
  };

  const handleCreateChannel = async (
    name: string,
    description?: string,
    isPrivate: boolean = false
  ) => {
    try {
      const newChannel = await createChannel(name, description, isPrivate);
      setActiveChannelId(newChannel.id); // Switch to the newly created channel
      setActiveChannelName(newChannel.name);
    } catch (error) {
      console.error("Error creating channel:", error);
      throw error;
    }
  };

  const handleUserClick = (clickedUser: User) => {
    setSelectedUser(clickedUser);
  };

  const handleSaveProfile = async (profile: {
    bio: string;
    status: string;
    display_name?: string;
    avatar_url?: string;
  }) => {
    try {
      const updateData: any = { bio: profile.bio };

      if (profile.display_name) {
        updateData.display_name = profile.display_name;
      }

      if (profile.avatar_url !== undefined) {
        updateData.avatar_url = profile.avatar_url;
      }

      await updateProfile(updateData);

      setUser((prev) => ({
        ...prev,
        bio: profile.bio,
        status: profile.status,
        display_name: profile.display_name || prev.display_name,
        avatar_url:
          profile.avatar_url !== undefined
            ? profile.avatar_url
            : prev.avatar_url,
      }));

      // Update the user in online users list
      setOnlineUsers((prev) =>
        prev.map((u) =>
          u.username === user?.username
            ? {
                ...u,
                bio: profile.bio,
                status: profile.status,
                display_name: profile.display_name || u.display_name,
                avatar_url:
                  profile.avatar_url !== undefined
                    ? profile.avatar_url
                    : u.avatar_url,
              }
            : u
        )
      );
    } catch (error) {
      console.error("Profile update error:", error);
      // You might want to show an error message to the user here
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
            activeChannel={activeChannelName}
            onChannelChange={handleChannelChange}
            onCreateChannel={() => setIsCreateChannelModalOpen(true)}
            loading={channelsLoading}
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
            activeChannel={activeChannelName}
            connectionStatus={connectionStatus}
            onlineUserCount={onlineUsers.length + (isCurrentUserInList ? 0 : 1)}
            description={
              channels.find((ch) => ch.id === activeChannelId)?.description ||
              undefined
            }
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
                    Welcome to #{activeChannelName}, {user.username}! Start
                    chatting with your team.
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageComponent
                key={Math.random().toString(36).substring(2, 15) + message.id}
                message={message}
                getAvatarColor={getAvatarColor}
                formatTimestamp={formatTimestamp}
                onUserClick={handleUserMention}
                onReply={handleReply}
                onEdit={handleEdit}
                currentUsername={user?.username}
                findMessageById={findMessageById}
              />
            ))}

            <TypingIndicator typingUsers={typingUsers} />

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <MessageInput
            activeChannel={activeChannelName}
            isConnected={isConnected}
            onSendMessage={handleSendMessage}
            onTyping={sendTyping}
            onStopTyping={sendStopTyping}
            replyToMessage={replyToMessage}
            onCancelReply={handleCancelReply}
          />
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
          onLogout={handleLogout}
          getAvatarColor={getAvatarColor}
        />
      )}

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelModalOpen}
        onClose={() => setIsCreateChannelModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />
    </div>
  );
}
