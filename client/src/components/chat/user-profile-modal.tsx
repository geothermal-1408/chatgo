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
  LogOut,
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
  onLogout?: () => void;
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
  onLogout,
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
        <Card className="bg-gray-900/95 backdrop-blur-lg border-gray-700/50 shadow-2xl shadow-purple-500/20">
          <CardHeader className="relative bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-t-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-2 top-2 w-8 h-8 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20 ring-4 ring-purple-500/20">
                  <AvatarFallback
                    className={`${getAvatarColor(
                      user.username
                    )} text-white text-2xl font-bold`}
                  >
                    {user.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-gray-900 ${getStatusColor(
                    user.status
                  )} shadow-lg`}
                ></div>
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {user.username}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2 text-gray-300">
                  <span className="capitalize text-sm font-medium">
                    {getStatusText(user.status)}
                  </span>
                  {user.role && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                    >
                      {user.role}
                    </Badge>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {isCurrentUser && isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-3 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-800/70 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  >
                    <option value="online">🟢 Online</option>
                    <option value="away">🟡 Away</option>
                    <option value="busy">🔴 Do Not Disturb</option>
                    <option value="invisible">⚫ Invisible</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-3 block">
                    Bio
                  </label>
                  <Input
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    className="bg-gray-800/70 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-purple-500/50"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-500 mt-2 text-right">
                    {bio.length}/100 characters
                  </p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {user.bio && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                      💬 About
                    </h4>
                    <p className="text-gray-400 text-sm bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 leading-relaxed">
                      {user.bio}
                    </p>
                  </div>
                )}
                {user.joinedAt && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                      📅 Member Since
                    </h4>
                    <p className="text-gray-400 text-sm bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                      {new Date(user.joinedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                <div className="flex flex-col space-y-3 pt-2">
                  {isCurrentUser ? (
                    <>
                      <Button
                        onClick={() => setIsEditing(true)}
                        size="sm"
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button
                        onClick={() => {
                          console.log(
                            "Logout button clicked, onLogout function:",
                            onLogout
                          );
                          onLogout?.();
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 hover:border-red-500"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <div className="flex space-x-3">
                      <Button
                        onClick={() => onSendMessage?.(user.username)}
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                      <Button
                        onClick={() => onAddFriend?.(user.username)}
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => onBlockUser?.(user.username)}
                        variant="outline"
                        size="sm"
                        className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
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
