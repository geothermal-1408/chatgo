import { Hash, Plus } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type?: string;
  description?: string | null;
  is_private?: boolean;
  isJoined?: boolean; // Track if user has joined this channel
}

interface ChannelListProps {
  channels: Channel[];
  activeChannel: string;
  onChannelChange: (channelId: string) => void;
  onCreateChannel?: () => void;
  loading?: boolean;
}

export function ChannelList({
  channels,
  activeChannel,
  onChannelChange,
  onCreateChannel,
  loading = false,
}: ChannelListProps) {
  return (
    <div className="flex-1 p-3 space-y-1 animate-slide-in-left">
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider animate-fade-in-scale">
          Text Channels
        </div>
        {onCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-700/50"
            title="Create Channel"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-3 py-2 rounded-md bg-gray-700/30 animate-pulse"
            >
              <div className="h-4 bg-gray-600/50 rounded w-20"></div>
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="px-3 py-4 text-center text-gray-400 text-sm">
          <p>No channels available</p>
          {onCreateChannel && (
            <button
              onClick={onCreateChannel}
              className="mt-2 text-purple-400 hover:text-purple-300 underline"
            >
              Create your first channel
            </button>
          )}
        </div>
      ) : (
        channels.map((channel, index) => (
          <button
            key={`${channel.id}-${index}`}
            onClick={() => onChannelChange(channel.id)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-300 group sidebar-item hover-lift animate-fade-in-scale ${
              activeChannel === channel.id
                ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white shadow-lg shadow-purple-500/10 active animate-pulse-glow"
                : channel.isJoined
                ? "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                : "text-gray-400 hover:bg-gray-700/30 hover:text-gray-300 opacity-75"
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
            title={
              channel.isJoined
                ? `Joined: ${channel.name}`
                : `Click to join: ${channel.name}`
            }
          >
            <Hash
              className={`w-4 h-4 transition-colors duration-200 ${
                channel.isJoined
                  ? "text-gray-400 group-hover:text-gray-300"
                  : "text-gray-500 group-hover:text-gray-400"
              }`}
            />
            <span className="font-medium">{channel.name}</span>
            {!channel.isJoined && (
              <span className="text-xs text-gray-500 ml-auto">Join</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
