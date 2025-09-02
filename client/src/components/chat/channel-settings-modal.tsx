import { useState, useEffect } from "react";
import { X, Edit3, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Channel } from "@/hooks/use-database";

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  onUpdateChannel: (
    channelId: string,
    updates: { name?: string; description?: string; is_private?: boolean }
  ) => Promise<void>;
  onDeleteChannel: (channelId: string) => Promise<void>;
  currentUserId: string;
}

export function ChannelSettingsModal({
  isOpen,
  onClose,
  channel,
  onUpdateChannel,
  onDeleteChannel,
  currentUserId,
}: ChannelSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (channel) {
      setChannelName(channel.name);
      setChannelDescription(channel.description || "");
      setIsPrivate(channel.is_private);
    }
  }, [channel]);

  const isOwner = channel?.created_by === currentUserId;

  const handleSave = async () => {
    if (!channel) return;

    setIsSaving(true);
    try {
      await onUpdateChannel(channel.id, {
        name: channelName.trim(),
        description: channelDescription.trim() || undefined,
        is_private: isPrivate,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update channel:", error);
      alert("Failed to update channel. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!channel) return;

    console.log("handleDelete called for channel:", channel.name, channel.id);

    const confirmed = window.confirm(
      `Are you sure you want to delete the channel "${channel.name}"? This action cannot be undone and will remove all messages in this channel.`
    );

    if (!confirmed) {
      console.log("User cancelled deletion");
      return;
    }

    console.log("User confirmed deletion, proceeding...");
    setIsDeleting(true);
    try {
      console.log("Calling onDeleteChannel prop...");
      await onDeleteChannel(channel.id);
      console.log("onDeleteChannel completed successfully");
      onClose();
    } catch (error) {
      console.error("Failed to delete channel:", error);
      alert("Failed to delete channel. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (channel) {
      setChannelName(channel.name);
      setChannelDescription(channel.description || "");
      setIsPrivate(channel.is_private);
    }
    setIsEditing(false);
  };

  if (!isOpen || !channel) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">
              Channel Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isOwner ? (
          <div className="text-center py-8">
            <p className="text-gray-400">
              Only the channel owner can modify channel settings.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Channel Name
              </label>
              {isEditing ? (
                <Input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Enter channel name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-white">{channel.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              {isEditing ? (
                <Input
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="Enter channel description"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-white">
                    {channel.description || "No description"}
                  </span>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={!isEditing}
                  className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Private Channel</span>
              </label>
            </div>

            {isEditing ? (
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !channelName.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="pt-4 border-t border-gray-700">
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="destructive"
                  className="w-full bg-red-600 hover:bg-red-700 flex items-center justify-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? "Deleting..." : "Delete Channel"}</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
