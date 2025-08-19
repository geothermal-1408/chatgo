import type React from "react";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { UserContextMenu } from "./user-context-menu";

interface User {
  id: string;
  username: string;
  status: string;
  role?: string;
  bio?: string;
  joinedAt?: string;
}

interface UserListProps {
  currentUser: { username: string };
  onlineUsers: User[];
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  isConnected: boolean;
  getAvatarColor: (username: string) => string;
  onUserClick?: (user: User) => void;
  onUserRightClick?: (user: User, position: { x: number; y: number }) => void;
}

export function UserList({
  currentUser,
  onlineUsers,
  connectionStatus,
  isConnected,
  getAvatarColor,
  onUserClick,
  onUserRightClick,
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    user: User;
    position: { x: number; y: number };
  } | null>(null);

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500 status-indicator online";
      case "connecting":
        return "bg-yellow-500 status-indicator connecting";
      case "error":
        return "bg-red-500 status-indicator error";
      default:
        return "bg-gray-500 status-indicator";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Connection Error";
      default:
        return "Disconnected";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500 status-indicator online";
      case "away":
        return "bg-yellow-500 status-indicator";
      case "busy":
        return "bg-red-500 status-indicator";
      case "invisible":
        return "bg-gray-500 status-indicator";
      default:
        return "bg-green-500 status-indicator online";
    }
  };

  const filteredUsers = onlineUsers.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserRightClick = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    setContextMenu({
      user,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  return (
    <div className="w-60 bg-gray-900/50 backdrop-blur-sm border-l border-gray-700/50 p-4 animate-slide-in-right">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 animate-fade-in-scale">
          Online — {filteredUsers.length + 1}
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-colors duration-200" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 text-sm h-8 focus-ring transition-all duration-300"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div
          className="flex items-center space-x-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-all duration-300 hover-lift animate-fade-in-scale"
          onClick={() =>
            onUserClick?.({
              id: currentUser.username,
              username: currentUser.username,
              status: isConnected ? "online" : "offline",
              joinedAt: new Date().toISOString(),
            })
          }
        >
          <div className="relative">
            <Avatar className="w-8 h-8 avatar-interactive">
              <AvatarFallback
                className={`${getAvatarColor(
                  currentUser.username
                )} text-white text-sm font-semibold`}
              >
                {currentUser.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getConnectionStatusColor()}`}
            ></div>
          </div>
          <div className="flex-1">
            <div className="font-medium text-white">
              {currentUser.username} (You)
            </div>
            <div
              className={`text-xs ${
                isConnected ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {getConnectionStatusText()}
            </div>
          </div>
        </div>
        {filteredUsers.map((onlineUser, index) => (
          <div
            key={onlineUser.id}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/30 transition-all duration-300 cursor-pointer group hover-lift animate-fade-in-scale"
            style={{ animationDelay: `${index * 0.1}s` }}
            onClick={() => onUserClick?.(onlineUser)}
            onContextMenu={(e) => handleUserRightClick(e, onlineUser)}
          >
            <div className="relative">
              <Avatar className="w-8 h-8 avatar-interactive">
                <AvatarFallback
                  className={`${getAvatarColor(
                    onlineUser.username
                  )} text-white text-sm font-semibold`}
                >
                  {onlineUser.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(
                  onlineUser.status
                )}`}
              ></div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-white group-hover:text-gray-100 flex items-center space-x-2 transition-colors duration-200">
                <span>{onlineUser.username}</span>
                {onlineUser.role && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-1 rounded notification-badge">
                    {onlineUser.role}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400 capitalize transition-colors duration-200">
                {onlineUser.status === "busy"
                  ? "Do Not Disturb"
                  : onlineUser.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <UserContextMenu
          username={contextMenu.user.username}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onViewProfile={(username) => onUserClick?.(contextMenu.user)}
          onSendMessage={(username) => console.log("Send message to", username)}
          onAddFriend={(username) => console.log("Add friend", username)}
          onBlockUser={(username) => console.log("Block user", username)}
          onMuteUser={(username) => console.log("Mute user", username)}
        />
      )}
    </div>
  );
}
