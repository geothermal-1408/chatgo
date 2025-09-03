"use client";

import { Hash, Users, Settings } from "lucide-react";

interface ChatHeaderProps {
  activeChannel: string;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  onlineUserCount: number;
  description?: string;
  isChannelOwner?: boolean;
  showChannelSettings?: boolean;
  onOpenChannelSettings?: () => void;
}

export function ChatHeader({
  activeChannel,
  connectionStatus,
  onlineUserCount,
  description,
  showChannelSettings,
  onOpenChannelSettings,
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
    <div className="h-16 border-b border-gray-700/50 flex items-center px-6 bg-gray-900/50 backdrop-blur-sm">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gray-900 border border-blue-600/30 flex items-center justify-center">
          <Hash className="w-4 h-4 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">{activeChannel}</h2>
        <div className="w-px h-6 bg-gray-600"></div>
        <p className="text-sm text-gray-400">
          Welcome to #{activeChannel}! {description}
        </p>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        {showChannelSettings && (
          <button
            onClick={onOpenChannelSettings}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Channel Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
        <div
          className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}
        ></div>
        <div className="flex items-center gap-1 text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-sm">{onlineUserCount}</span>
        </div>
      </div>
    </div>
  );
}
