import { Hash } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface ChannelListProps {
  channels: Channel[];
  activeChannel: string;
  onChannelChange: (channelId: string) => void;
}

export function ChannelList({
  channels,
  activeChannel,
  onChannelChange,
}: ChannelListProps) {
  return (
    <div className="flex-1 p-3 space-y-1 animate-slide-in-left">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 animate-fade-in-scale">
        Text Channels
      </div>
      {channels.map((channel, index) => (
        <button
          key={channel.id}
          onClick={() => onChannelChange(channel.id)}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-all duration-300 group sidebar-item hover-lift animate-fade-in-scale ${
            activeChannel === channel.id
              ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white shadow-lg shadow-purple-500/10 active animate-pulse-glow"
              : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
          }`}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <Hash className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors duration-200" />
          <span className="font-medium">{channel.name}</span>
        </button>
      ))}
    </div>
  );
}
