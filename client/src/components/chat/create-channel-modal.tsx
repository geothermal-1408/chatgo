import { useState } from "react";
import { X, Hash, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (
    name: string,
    description?: string,
    isPrivate?: boolean
  ) => Promise<void>;
}

export function CreateChannelModal({
  isOpen,
  onClose,
  onCreateChannel,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    if (name.length < 1 || name.length > 50) {
      setError("Channel name must be between 1 and 50 characters");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      await onCreateChannel(
        name.trim(),
        description.trim() || undefined,
        isPrivate
      );
      setName("");
      setDescription("");
      setIsPrivate(false);
      onClose();
    } catch (error) {
      console.error("Error creating channel:", error);
      setError("Failed to create channel. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      setError("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Create Channel</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Channel Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Channel Type
            </label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-md border transition-colors ${
                  !isPrivate
                    ? "bg-purple-500/20 border-purple-500 text-purple-300"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Hash className="w-4 h-4" />
                <span>Public</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-md border transition-colors ${
                  isPrivate
                    ? "bg-purple-500/20 border-purple-500 text-purple-300"
                    : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <label
              htmlFor="channel-name"
              className="text-sm font-medium text-gray-300"
            >
              Channel Name *
            </label>
            <Input
              id="channel-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter channel name"
              maxLength={50}
              disabled={isCreating}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
            />
            <p className="text-xs text-gray-400">{name.length}/50 characters</p>
          </div>

          {/* Channel Description */}
          <div className="space-y-2">
            <label
              htmlFor="channel-description"
              className="text-sm font-medium text-gray-300"
            >
              Description (optional)
            </label>
            <Input
              id="channel-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              maxLength={200}
              disabled={isCreating}
              className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isCreating ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
