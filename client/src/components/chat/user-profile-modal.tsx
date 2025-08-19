"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Edit,
  Save,
  MessageCircle,
  UserPlus,
  UserMinus,
} from "lucide-react";

interface UserProfileModalProps {
  user: {
    username: string;
    status: string;
    joinedAt?: string;
    role?: string;
    bio?: string;
  };
  isCurrentUser: boolean;
  onClose: () => void;
  onSaveProfile?: (profile: { bio: string; status: string }) => void;
  onSendMessage?: (username: string) => void;
  onAddFriend?: (username: string) => void;
  onBlockUser?: (username: string) => void;
  getAvatarColor: (username: string) => string;
}

export function UserProfileModal({
  user,
  isCurrentUser,
  onClose,
  onSaveProfile,
  onSendMessage,
  onAddFriend,
  onBlockUser,
  getAvatarColor,
}: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user.bio || "");
  const [status, setStatus] = useState(user.status || "online");

  const handleSave = () => {
    onSaveProfile?.({ bio, status });
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "invisible":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "Online";
      case "away":
        return "Away";
      case "busy":
        return "Do Not Disturb";
      case "invisible":
        return "Invisible";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="bg-gray-900/90 backdrop-blur-md border-gray-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-2 top-2 w-8 h-8 p-0 hover:bg-gray-700/50"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarFallback
                    className={`${getAvatarColor(
                      user.username
                    )} text-white text-xl font-bold`}
                  >
                    {user.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-gray-900 ${getStatusColor(
                    user.status
                  )}`}
                ></div>
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl text-white">
                  {user.username}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <span className="capitalize">
                    {getStatusText(user.status)}
                  </span>
                  {user.role && <Badge variant="secondary">{user.role}</Badge>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCurrentUser && isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="online">Online</option>
                    <option value="away">Away</option>
                    <option value="busy">Do Not Disturb</option>
                    <option value="invisible">Invisible</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Bio
                  </label>
                  <Input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {bio.length}/100 characters
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSave} size="sm" className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {user.bio && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      About
                    </h4>
                    <p className="text-gray-400 text-sm bg-gray-800/30 rounded-lg p-3">
                      {user.bio}
                    </p>
                  </div>
                )}
                {user.joinedAt && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">
                      Member Since
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {new Date(user.joinedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  {isCurrentUser ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => onSendMessage?.(user.username)}
                        size="sm"
                        className="flex-1"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                      <Button
                        onClick={() => onAddFriend?.(user.username)}
                        variant="outline"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onBlockUser?.(user.username)}
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
