"use client";

import { Hash, Users } from "lucide-react";

interface ChatHeaderProps {
  activeChannel: string;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  onlineUserCount: number;
}

export function ChatHeader({
  activeChannel,
  connectionStatus,
  onlineUserCount,
}: ChatHeaderProps) {
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="h-16 border-b border-gray-700/50 flex items-center px-6 bg-gray-900/20 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        <Hash className="w-5 h-5 text-gray-400" />
        <h2 className="text-xl font-semibold text-white">{activeChannel}</h2>
        <div className="w-px h-6 bg-gray-600"></div>
        <p className="text-sm text-gray-400">
          Welcome to #{activeChannel}! This is the beginning of the channel.
        </p>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        <div
          className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
        ></div>
        <Users className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-400">{onlineUserCount}</span>
      </div>
    </div>
  );
}
