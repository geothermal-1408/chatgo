import { useState, useEffect, useRef, useCallback } from "react";
import { useWebSocket, type Message } from "@/hooks/use-websocket";
import { useChannels } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { ToastContainer } from "@/components/ui/toast";
import { MessageComponent } from "@/components/chat/message";
import { MessageInput } from "@/components/chat/message-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChannelList } from "@/components/chat/channel-list";
import { UserList } from "@/components/chat/user-list";
import { UserControls } from "@/components/chat/user-controls";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { UserProfileModal } from "@/components/chat/user-profile-modal";
import { CreateChannelModal } from "@/components/chat/create-channel-modal";
import { ChannelSettingsModal } from "@/components/chat/channel-settings-modal";
import { UserSettingsModal } from "@/components/chat/user-settings-modal";
import { FriendsManager } from "@/components/chat/friends-manager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/lib/auth";

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
  const [isChannelSettingsModalOpen, setIsChannelSettingsModalOpen] =
    useState(false);
  const [isUserSettingsModalOpen, setIsUserSettingsModalOpen] = useState(false);
  const [isFriendsManagerOpen, setIsFriendsManagerOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    username: string;
    content: string;
  } | null>(null);

  //*** Using map as cache system as a patch afterwards we will shift to indexed DB and SWR ***/

  // Add avatar cache to persist avatar URLs across channel switches
  const [avatarCache, setAvatarCache] = useState<Map<string, string>>(
    new Map()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { signOut, updateProfile, session } = useAuth();
  const { toast, toasts, removeToast } = useToast();
  const {
    channels,
    createChannel,
    updateChannel,
    deleteChannel,
    joinChannel,
    leaveChannel,
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
    async (username: string) => {
      setOnlineUsers((prev) => {
        const userExists = prev.some((user) => user.username === username);
        if (userExists) {
          return prev;
        }

        // Create a basic user first, then update with profile data
        const newUser: User = {
          id: Math.random().toString(36).substring(2, 15),
          username,
          status: "online",
          joinedAt: new Date().toISOString(),
        };

        // Fetch profile data asynchronously
        authService
          .getUserProfile(username)
          .then((profile) => {
            if (profile) {
              setOnlineUsers((current) =>
                current.map((u) =>
                  u.username === username
                    ? {
                        ...u,
                        avatar_url: profile.avatar_url,
                        bio: profile.bio,
                        display_name: profile.display_name,
                      }
                    : u
                )
              );
            }
          })
          .catch(console.error);

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

  const handleUserList = useCallback(async (usernames: string[]) => {
    // ✅ FIX: Handle initial user list when joining a channel with avatar URLs
    try {
      const userProfiles = await Promise.all(
        usernames.map(async (username) => {
          const profile = await authService.getUserProfile(username);
          return {
            id: profile?.id || Math.random().toString(36).substring(2, 15),
            username,
            status: "online",
            joinedAt: new Date().toISOString(),
            avatar_url: profile?.avatar_url,
            bio: profile?.bio,
            display_name: profile?.display_name,
          };
        })
      );
      setOnlineUsers(userProfiles);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      // Fallback to basic user objects
      const users: User[] = usernames.map((username) => ({
        id: Math.random().toString(36).substring(2, 15),
        username,
        status: "online",
        joinedAt: new Date().toISOString(),
      }));
      setOnlineUsers(users);
    }
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

  // Handle message deletion
  const handleMessageDeleted = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const {
    isConnected,
    connectionStatus,
    sendMessage,
    sendTyping,
    sendStopTyping,
    switchChannel,
    editMessage,
    deleteMessage,
  } = useWebSocket({
    username: user?.username || "",
    channel: activeChannelId || "", // This should not be empty - let's check if we have a valid channel
    accessToken: session?.access_token || "",
    onMessage: handleMessage,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onTyping: handleTyping,
    onStopTyping: handleStopTyping,
    onUserList: handleUserList,
    onMessageEdited: handleMessageEdited,
    onMessageDeleted: handleMessageDeleted,
    onFriendRequest: (senderUsername: string) => {
      toast.friendRequest(senderUsername, () => {
        setIsFriendsManagerOpen(true);
      });
    },
    onFriendRequestAccepted: (accepterUsername: string) => {
      toast.success(
        "Friend Request Accepted",
        `${accepterUsername} accepted your friend request!`
      );
    },
  });

  const getAvatarColor = (username: string) => {
    const colors = [
      "bg-gradient-to-br from-blue-500 to-cyan-500",
      "bg-gradient-to-br from-blue-500 to-indigo-500",
      "bg-gradient-to-br from-green-500 to-emerald-500",
      "bg-gradient-to-br from-orange-500 to-red-500",
      "bg-gradient-to-br from-indigo-500 to-blue-500",
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

  const handleDelete = (messageId: string) => {
    if (deleteMessage) {
      deleteMessage(messageId);
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

  const handleOpenChannelSettings = () => {
    setIsChannelSettingsModalOpen(true);
  };

  const handleOpenUserSettings = () => {
    setIsUserSettingsModalOpen(true);
  };

  const handleUpdateChannel = async (
    channelId: string,
    updates: { name?: string; description?: string; is_private?: boolean }
  ) => {
    try {
      await updateChannel(channelId, updates);
      // Update the active channel name if it was changed
      if (updates.name && channelId === activeChannelId) {
        setActiveChannelName(updates.name);
      }
    } catch (error) {
      console.error("Error updating channel:", error);
      throw error;
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    console.log("handleDeleteChannel called with channelId:", channelId);
    try {
      console.log("Calling deleteChannel function...");
      await deleteChannel(channelId);
      console.log("deleteChannel completed successfully");

      // If the deleted channel was the active one, switch to general or first available channel
      if (channelId === activeChannelId) {
        const remainingChannels = channels.filter((ch) => ch.id !== channelId);
        if (remainingChannels.length > 0) {
          setActiveChannelId(remainingChannels[0].id);
          setActiveChannelName(remainingChannels[0].name);
        } else {
          setActiveChannelId(null);
          setActiveChannelName("general");
        }
      }
    } catch (error) {
      console.error("Error deleting channel:", error);
      throw error;
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      await leaveChannel(channelId);

      // If the user left the active channel, switch to another joined channel
      if (channelId === activeChannelId) {
        const joinedChannels = channels.filter(
          (ch) => ch.id !== channelId && ch.isJoined
        );
        if (joinedChannels.length > 0) {
          setActiveChannelId(joinedChannels[0].id);
          setActiveChannelName(joinedChannels[0].name);
        } else {
          // Find the first available public channel to auto-join
          const publicChannels = channels.filter((ch) => !ch.is_private);
          if (publicChannels.length > 0) {
            const generalChannel =
              publicChannels.find((ch) => ch.name === "general") ||
              publicChannels[0];
            setActiveChannelId(generalChannel.id);
            setActiveChannelName(generalChannel.name);
          } else {
            setActiveChannelId(null);
            setActiveChannelName("general");
          }
        }
      }
    } catch (error) {
      console.error("Error leaving channel:", error);
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

      const updatedUser = {
        ...user!,
        bio: profile.bio,
        status: profile.status,
        display_name: profile.display_name || user!.display_name,
        avatar_url:
          profile.avatar_url !== undefined
            ? profile.avatar_url
            : user!.avatar_url,
      };

      setUser(updatedUser);

      // Update avatar cache with the new avatar URL
      if (updatedUser.avatar_url) {
        setAvatarCache((prev) =>
          new Map(prev).set(updatedUser.username, updatedUser.avatar_url!)
        );
      } else if (profile.avatar_url === undefined) {
        // Remove from cache if avatar was deleted
        setAvatarCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(updatedUser.username);
          return newCache;
        });
      }

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

  const getUserAvatarUrl = useCallback(
    (username: string) => {
      // First check the avatar cache
      if (avatarCache.has(username)) {
        return avatarCache.get(username);
      }

      // Check online users
      const onlineUser = onlineUsers.find((u) => u.username === username);
      if (onlineUser?.avatar_url) {
        // Cache the avatar URL
        setAvatarCache((prev) =>
          new Map(prev).set(username, onlineUser.avatar_url!)
        );
        return onlineUser.avatar_url;
      }

      // Check if it's the current user
      if (username === user?.username && user?.avatar_url) {
        // Cache the current user's avatar URL
        setAvatarCache((prev) => new Map(prev).set(username, user.avatar_url!));
        return user.avatar_url;
      }

      // Check messages for avatar URLs (message data includes avatar_url field)
      const messageWithAvatar = messages.find(
        (m) => m.username === username && m.avatar_url
      );
      if (messageWithAvatar?.avatar_url) {
        // Cache the avatar URL from message data
        setAvatarCache((prev) =>
          new Map(prev).set(username, messageWithAvatar.avatar_url!)
        );
        return messageWithAvatar.avatar_url;
      }

      console.log(`No avatar found for ${username}`);
      return undefined;
    },
    [avatarCache, onlineUsers, user, messages]
  );

  // Update avatar cache when user data changes
  useEffect(() => {
    if (user?.username && user?.avatar_url) {
      setAvatarCache((prev) =>
        new Map(prev).set(user.username, user.avatar_url!)
      );
    }
  }, [user?.username, user?.avatar_url]);

  // Update avatar cache when online users change
  useEffect(() => {
    onlineUsers.forEach((onlineUser) => {
      if (onlineUser.avatar_url) {
        setAvatarCache((prev) =>
          new Map(prev).set(onlineUser.username, onlineUser.avatar_url!)
        );
      }
    });
  }, [onlineUsers]);

  // Update avatar cache when messages change (for users not in online list)
  useEffect(() => {
    messages.forEach((message) => {
      if (message.avatar_url && !avatarCache.has(message.username)) {
        setAvatarCache((prev) =>
          new Map(prev).set(message.username, message.avatar_url!)
        );
      }
    });
  }, [messages, avatarCache]);

  const handleUserMention = (username: string) => {
    console.log("Mention user:", username);
  };

  return (
    <div className="h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Modern geometric background */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none modern-bg-pattern"
        aria-hidden="true"
      >
        {/* Small floating shapes */}
        <div className="absolute top-10 right-10 w-32 h-32 border border-blue-600/20 rounded-lg rotate-12" />
        <div className="absolute bottom-20 left-10 w-20 h-20 bg-blue-500/5 rounded-full" />
        <div className="absolute top-1/3 left-20 w-16 h-16 border border-blue-500/15 rounded-lg rotate-45" />
      </div>

      <div className="relative z-10 flex h-full">
        {/* Left Sidebar - Channels */}
        <div className="w-60 bg-gray-900/70 backdrop-blur-sm border-r border-gray-700/50 flex flex-col">
          {/* Server Header */}
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gray-900 border border-blue-600/30 flex items-center justify-center">
                <img src="./logo-removebg.png" alt="Logo" height={90} />
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
            isMuted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
            onOpenSettings={handleOpenUserSettings}
            onOpenFriends={() => setIsFriendsManagerOpen(true)}
            onLogout={handleLogout}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-900/40 backdrop-blur-sm">
          <ChatHeader
            activeChannel={activeChannelName}
            connectionStatus={connectionStatus}
            onlineUserCount={onlineUsers.length + (isCurrentUserInList ? 0 : 1)}
            description={
              channels.find((ch) => ch.id === activeChannelId)?.description ||
              undefined
            }
            isChannelOwner={
              channels.find((ch) => ch.id === activeChannelId)?.created_by ===
              session?.user?.id
            }
            showChannelSettings={
              channels.find((ch) => ch.id === activeChannelId)?.isJoined ===
              true
            }
            onOpenChannelSettings={handleOpenChannelSettings}
          />

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex items-start space-x-3 group">
                <Avatar className="w-10 h-10 mt-1">
                  <AvatarFallback className="bg-gray-900 border border-blue-600/30 text-blue-400 font-semibold">
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
                  <div className="text-gray-300 bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600/30">
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
                onDelete={handleDelete}
                currentUsername={user?.username}
                findMessageById={findMessageById}
                getUserAvatarUrl={getUserAvatarUrl}
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
        <div className="w-60 bg-gray-900/50 backdrop-blur-sm border-l border-gray-700/50">
          <UserList
            currentUser={{
              username: user.username,
              avatar_url: user.avatar_url,
            }}
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

      {/* Channel Settings Modal */}
      <ChannelSettingsModal
        isOpen={isChannelSettingsModalOpen}
        onClose={() => setIsChannelSettingsModalOpen(false)}
        channel={channels.find((ch) => ch.id === activeChannelId) || null}
        onUpdateChannel={handleUpdateChannel}
        onDeleteChannel={handleDeleteChannel}
        onLeaveChannel={handleLeaveChannel}
        currentUserId={session?.user?.id || ""}
      />

      {/* User Settings Modal */}
      {isUserSettingsModalOpen && (
        <UserSettingsModal onClose={() => setIsUserSettingsModalOpen(false)} />
      )}

      {/* Friends Manager Modal */}
      {isFriendsManagerOpen && (
        <FriendsManager
          onClose={() => setIsFriendsManagerOpen(false)}
          onSendMessage={(username) => {
            // Switch to DM or general channel and mention the user
            console.log("Send message to:", username);
            setIsFriendsManagerOpen(false);
          }}
          getAvatarColor={getAvatarColor}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
