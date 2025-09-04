import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Mic, MicOff, Headphones, LogOut, Users } from "lucide-react";

interface UserControlsProps {
  user: { username: string; avatar_url?: string };
  isMuted: boolean;
  onMuteToggle: () => void;
  onOpenSettings: () => void;
  onOpenFriends: () => void;
  onLogout: () => void;
}

export function UserControls({
  user,
  isMuted,
  onMuteToggle,
  onOpenSettings,
  onOpenFriends,
  onLogout,
}: UserControlsProps) {
  return (
    <div className="p-3 border-t border-gray-700/50">
      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-2">
        <div className="flex items-center">
          <Avatar className="w-8 h-8">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.username} />
            )}
            <AvatarFallback className="bg-gray-900 border border-blue-600/30 text-blue-400 text-sm font-semibold">
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
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
            onClick={onOpenFriends}
            className="w-8 h-8 p-0 hover:bg-gray-700/50"
            title="Friends"
          >
            <Users className="w-4 h-4 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenSettings}
            className="w-8 h-8 p-0 hover:bg-gray-700/50"
            title="Settings"
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
