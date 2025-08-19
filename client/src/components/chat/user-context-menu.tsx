import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  UserPlus,
  UserMinus,
  User,
  VolumeX,
} from "lucide-react";

interface UserContextMenuProps {
  username: string;
  position: { x: number; y: number };
  onClose: () => void;
  onViewProfile: (username: string) => void;
  onSendMessage: (username: string) => void;
  onAddFriend: (username: string) => void;
  onBlockUser: (username: string) => void;
  onMuteUser: (username: string) => void;
}

export function UserContextMenu({
  username,
  position,
  onClose,
  onViewProfile,
  onSendMessage,
  onAddFriend,
  onBlockUser,
  onMuteUser,
}: UserContextMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl shadow-black/50 py-2 min-w-48"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="px-3 py-2 border-b border-gray-700/50">
          <p className="font-semibold text-white text-sm">{username}</p>
        </div>
        <div className="py-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onViewProfile(username);
              onClose();
            }}
            className="w-full justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <User className="w-4 h-4 mr-3" />
            View Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSendMessage(username);
              onClose();
            }}
            className="w-full justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <MessageCircle className="w-4 h-4 mr-3" />
            Send Message
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAddFriend(username);
              onClose();
            }}
            className="w-full justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <UserPlus className="w-4 h-4 mr-3" />
            Add Friend
          </Button>
          <div className="border-t border-gray-700/50 my-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onMuteUser(username);
              onClose();
            }}
            className="w-full justify-start px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50"
          >
            <VolumeX className="w-4 h-4 mr-3" />
            Mute User
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onBlockUser(username);
              onClose();
            }}
            className="w-full justify-start px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <UserMinus className="w-4 h-4 mr-3" />
            Block User
          </Button>
        </div>
      </div>
    </>
  );
}
