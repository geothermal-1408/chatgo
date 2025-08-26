import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message } from "@/hooks/use-websocket";
import { useState } from "react";

interface MessageProps {
  message: Message;
  getAvatarColor: (username: string) => string;
  formatTimestamp: (timestamp: string) => string;
  onUserClick?: (username: string) => void;
  onReply?: (messageId: string, username: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  currentUsername?: string;
  findMessageById?: (messageId: string) => Message | undefined;
}

export function MessageComponent({
  message,
  getAvatarColor,
  formatTimestamp,
  onUserClick,
  onReply,
  onEdit,
  currentUsername,
  findMessageById,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const parseMessageContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a username from a mention
        return (
          <span
            key={index}
            className="bg-purple-500/20 text-purple-300 px-1 rounded cursor-pointer hover:bg-purple-500/30 transition-all duration-200 hover:scale-105"
            onClick={() => onUserClick?.(part)}
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const handleEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const repliedMessage = message.reply_to
    ? findMessageById?.(message.reply_to)
    : undefined;

  return (
    <div className="flex items-start space-x-3 group hover:bg-gray-700/20 -mx-2 px-2 py-1 rounded-lg transition-all duration-300 animate-message-slide-in hover-lift">
      <div
        className="cursor-pointer avatar-interactive"
        onClick={() => onUserClick?.(message.username)}
      >
        <Avatar className="w-10 h-10 mt-1">
          <AvatarFallback
            className={`${
              message.type === "user_joined" || message.type === "user_left"
                ? message.type === "user_joined"
                  ? "bg-gradient-to-br from-green-500 to-emerald-500"
                  : message.type === "user_left"
                  ? "bg-gradient-to-br from-red-500 to-orange-500"
                  : "bg-gradient-to-br from-purple-500 to-blue-500"
                : getAvatarColor(message.username)
            } text-white font-semibold transition-all duration-300`}
          >
            {message.type === "user_joined" || message.type === "user_left"
              ? "S"
              : message.username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span
            className="font-semibold text-white cursor-pointer hover:underline transition-all duration-200 hover:text-purple-300"
            onClick={() => onUserClick?.(message.username)}
          >
            {message.username}
          </span>
          <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {formatTimestamp(message.timestamp)}
            {message.edited && (
              <span className="ml-1 text-xs text-blue-400">(edited)</span>
            )}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-1">
            <button
              onClick={() => onReply?.(message.id, message.username)}
              className="text-xs text-gray-400 hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-600/20"
            >
              Reply
            </button>
            {currentUsername === message.username && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-400 hover:text-yellow-400 px-2 py-1 rounded hover:bg-gray-600/20"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Reply indicator */}
        {repliedMessage && (
          <div className="mb-2 pl-3 border-l-2 border-gray-600 bg-gray-800/30 rounded-r p-2">
            <div className="text-xs text-gray-400 mb-1">
              Replying to {repliedMessage.username}
            </div>
            <div className="text-sm text-gray-300 truncate">
              {repliedMessage.content}
            </div>
          </div>
        )}

        <div
          className={`${
            message.type === "user_joined"
              ? "text-green-400 bg-green-900/20 border-green-600/30"
              : message.type === "user_left"
              ? "text-red-400 bg-red-900/20 border-red-600/30"
              : "text-gray-300"
          } ${
            message.type !== "message"
              ? "backdrop-blur-sm rounded-lg p-3 border transition-all duration-300"
              : ""
          }`}
        >
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
                className="flex-1 bg-gray-700 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleEdit}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : message.type === "message" ? (
            parseMessageContent(message.content)
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}
