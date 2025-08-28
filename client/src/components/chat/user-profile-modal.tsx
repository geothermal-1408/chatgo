"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Camera,
  Trash2,
  Upload,
  Check,
  XIcon,
} from "lucide-react";
import { useUserRelationships } from "@/hooks/use-user-relationships";
import { useAuth } from "@/hooks/use-auth";

interface UserProfileModalProps {
  user: {
    id?: string;
    username: string;
    status: string;
    joinedAt?: string;
    role?: string;
    bio?: string;
    avatar_url?: string;
    display_name?: string;
    created_at?: string; // Add this for member since date
    is_online?: boolean;
  };
  isCurrentUser: boolean;
  onClose: () => void;
  onSaveProfile?: (profile: {
    bio: string;
    status: string;
    display_name?: string;
    avatar_url?: string;
  }) => void;
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
  const { uploadAvatar, deleteAvatar, user: authUser } = useAuth();

  // Use auth user data for current user to get real-time updates
  const displayUser = isCurrentUser && authUser ? authUser : user;

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(displayUser.bio || "");
  const [status, setStatus] = useState(user.status || "online");
  const [displayName, setDisplayName] = useState(
    displayUser.display_name || displayUser.username
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    friends,
    blockedUsers,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    declineFriendRequest,
  } = useUserRelationships();

  // Cleanup avatar preview URL on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // Update form state when auth user changes (for avatar updates)
  useEffect(() => {
    if (isCurrentUser && authUser) {
      setBio(authUser.bio || "");
      setDisplayName(authUser.display_name || authUser.username);
    }
  }, [isCurrentUser, authUser]);

  // Check relationship status
  const isFriend = friends.some((friend) => friend.username === user.username);
  const isBlocked = blockedUsers.some(
    (blocked) => blocked.username === user.username
  );
  const hasPendingRequest = friendRequests.some(
    (req) => req.target_user.username === user.username
  );

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    // Clean up previous preview URL
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !isCurrentUser) return;

    try {
      setIsUploading(true);
      console.log("Starting avatar upload...", avatarFile.name);

      const avatarUrl = await uploadAvatar(avatarFile);
      console.log("Avatar upload successful:", avatarUrl);

      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);

      // Trigger an immediate profile save to update the modal display
      onSaveProfile?.({
        bio,
        status,
        display_name: displayName,
        avatar_url: avatarUrl,
      });

      // Show success message
      alert("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to upload avatar. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Storage")) {
          errorMessage = "Storage configuration error. Please contact support.";
        } else if (error.message.includes("bucket")) {
          errorMessage = "Avatar storage is not properly configured.";
        } else if (error.message.includes("policy")) {
          errorMessage = "You do not have permission to upload avatars.";
        } else if (error.message.includes("size")) {
          errorMessage = "File size is too large. Please use a smaller image.";
        }
      }

      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!displayUser.avatar_url || !isCurrentUser) return;

    try {
      setIsUploading(true);
      await deleteAvatar(displayUser.avatar_url);

      // Trigger an immediate profile save to update the modal display
      onSaveProfile?.({
        bio,
        status,
        display_name: displayName,
        avatar_url: undefined,
      });

      // The profile will be updated through the auth context
    } catch (error) {
      console.error("Avatar delete error:", error);
      alert("Failed to delete avatar. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    onSaveProfile?.({
      bio,
      status,
      display_name: displayName,
      avatar_url: displayUser.avatar_url,
    });
    setIsEditing(false);
  };

  const handleRelationshipAction = async (action: string) => {
    try {
      switch (action) {
        case "add_friend":
          await sendFriendRequest(user.username);
          break;
        case "accept_friend":
          await acceptFriendRequest(user.username);
          break;
        case "remove_friend":
          if (user.id) await removeFriend(user.id);
          break;
        case "block":
          await blockUser(user.username);
          break;
        case "unblock":
          if (user.id) await unblockUser(user.id);
          break;
        case "decline_request":
          if (user.id) await declineFriendRequest(user.id);
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action.replace("_", " ")}. Please try again.`);
    }
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
                  {displayUser.avatar_url ? (
                    <AvatarImage
                      src={displayUser.avatar_url}
                      alt={displayUser.username}
                    />
                  ) : null}
                  <AvatarFallback
                    className={`${getAvatarColor(
                      displayUser.username
                    )} text-white text-2xl font-bold`}
                  >
                    {displayUser.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-gray-900 ${getStatusColor(
                    user.status
                  )} shadow-lg`}
                ></div>
                {isCurrentUser && isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {displayUser.display_name || displayUser.username}
                </CardTitle>
                {displayUser.display_name &&
                  displayUser.display_name !== displayUser.username && (
                    <p className="text-sm text-gray-400">
                      @{displayUser.username}
                    </p>
                  )}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {isCurrentUser && isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold text-gray-300 mb-3 block">
                    Display Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="bg-gray-800/70 border-gray-600/50 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-purple-500/50"
                    maxLength={50}
                  />
                </div>
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
                {avatarFile && (
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-3 block">
                      New Avatar
                    </label>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={avatarPreview || ""} />
                        <AvatarFallback className="bg-gray-600">
                          <Camera className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleAvatarUpload}
                          disabled={isUploading}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                        <Button
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreview(null);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-gray-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                {displayUser.avatar_url && !avatarFile && (
                  <div>
                    <label className="text-sm font-semibold text-gray-300 mb-3 block">
                      Current Avatar
                    </label>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={displayUser.avatar_url} />
                        <AvatarFallback className="bg-gray-600">
                          {displayUser.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        onClick={handleAvatarDelete}
                        disabled={isUploading}
                        variant="outline"
                        size="sm"
                        className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isUploading ? "Deleting..." : "Remove"}
                      </Button>
                    </div>
                  </div>
                )}
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
                {displayUser.bio && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                      💬 About
                    </h4>
                    <p className="text-gray-400 text-sm bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 leading-relaxed">
                      {displayUser.bio}
                    </p>
                  </div>
                )}
                {(displayUser.created_at || user.joinedAt) && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                      📅 Member Since
                    </h4>
                    <p className="text-gray-400 text-sm bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                      {new Date(
                        displayUser.created_at || user.joinedAt!
                      ).toLocaleDateString("en-US", {
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
                    <div className="flex flex-col space-y-3">
                      {/* Message and Friend Actions */}
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => onSendMessage?.(user.username)}
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>

                        {/* Friend Management */}
                        {!isBlocked && !isFriend && !hasPendingRequest && (
                          <Button
                            onClick={() =>
                              handleRelationshipAction("add_friend")
                            }
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}

                        {hasPendingRequest && (
                          <div className="flex space-x-2">
                            <Button
                              onClick={() =>
                                handleRelationshipAction("accept_friend")
                              }
                              variant="outline"
                              size="sm"
                              className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() =>
                                handleRelationshipAction("decline_request")
                              }
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                            >
                              <XIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {isFriend && (
                          <Button
                            onClick={() =>
                              handleRelationshipAction("remove_friend")
                            }
                            variant="outline"
                            size="sm"
                            className="border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Block/Unblock Action */}
                      <div className="flex justify-center">
                        {!isBlocked ? (
                          <Button
                            onClick={() => handleRelationshipAction("block")}
                            variant="outline"
                            size="sm"
                            className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Block User
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleRelationshipAction("unblock")}
                            variant="outline"
                            size="sm"
                            className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Unblock User
                          </Button>
                        )}
                      </div>
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
