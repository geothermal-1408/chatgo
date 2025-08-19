import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Mic, MicOff, Headphones, LogOut } from "lucide-react";

interface UserControlsProps {
  user: { username: string };
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  isConnected: boolean;
  isMuted: boolean;
  onMuteToggle: () => void;
  onLogout: () => void;
  getAvatarColor: (username: string) => string;
}

export function UserControls({
  user,
  connectionStatus,
  isConnected,
  isMuted,
  onMuteToggle,
  onLogout,
  getAvatarColor,
}: UserControlsProps) {
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

  return (
    <div className="p-3 border-t border-gray-700/50">
      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback
              className={`${getAvatarColor(
                user.username
              )} text-white text-sm font-semibold`}
            >
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="text-sm">
            <div className="font-medium text-white">{user.username}</div>
            <div
              className={`text-xs ${
                isConnected ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {getConnectionStatusText()}
            </div>
          </div>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMuteToggle}
            className="w-8 h-8 p-0 hover:bg-gray-700/50"
          >
            {isMuted ? (
              <MicOff className="w-4 h-4 text-red-400" />
            ) : (
              <Mic className="w-4 h-4 text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 hover:bg-gray-700/50"
          >
            <Headphones className="w-4 h-4 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 hover:bg-gray-700/50"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="w-8 h-8 p-0 hover:bg-gray-700/50 hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  );
}
