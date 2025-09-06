import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck } from "lucide-react";
import { useState } from "react";

interface DMMessageProps {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  content: string;
  timestamp: string;
  type: "text" | "image" | "file" | "system";
  fileUrl?: string | null;
  replyTo?: string | null;
  edited: boolean;
  editedAt?: string | null;
  isOwn: boolean;
  readByRecipient?: boolean;
  readAt?: string | null;
  getAvatarColor: (username: string) => string;
  onReply?: (messageId: string, username: string, content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

export function DMMessageComponent({
  id,
  username,
  displayName,
  avatar,
  content,
  timestamp,
  type,
  fileUrl: _fileUrl,
  replyTo: _replyTo,
  edited,
  editedAt: _editedAt,
  isOwn,
  readByRecipient,
  readAt: _readAt,
  getAvatarColor,
  onReply,
  onEdit,
  onDelete,
}: DMMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const parseMessageContent = (content: string) => {
    const mentionRegex = /@(\w+)/g;
    const parts = content.split(mentionRegex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a username from a mention
        return (
          <span
            key={index}
            className="bg-blue-500/20 text-blue-300 px-1 rounded cursor-pointer hover:bg-blue-500/30 transition-all duration-200 hover:scale-105"
          >
            @{part}
          </span>
        );
      }
      return part;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(id, editContent.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  return (
    <div
      className={`flex items-start space-x-3 group hover:bg-gray-700/20 -mx-2 px-2 py-1 rounded-lg transition-all duration-300 ${
        isOwn ? "justify-end" : ""
      }`}
    >
      {!isOwn && (
        <Avatar className="w-8 h-8 mt-1">
          {avatar && <AvatarImage src={avatar} alt={username} />}
          <AvatarFallback
            className={`${getAvatarColor(
              username
            )} text-white font-semibold text-sm`}
          >
            {username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`flex-1 max-w-xs md:max-w-md lg:max-w-lg ${
          isOwn ? "text-right" : ""
        }`}
      >
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-white text-sm">
              {displayName || username}
            </span>
            {displayName && displayName !== username && (
              <span className="text-xs text-gray-400">@{username}</span>
            )}
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {formatTimestamp(timestamp)}
              {edited && (
                <span className="ml-1 text-xs text-blue-400">(edited)</span>
              )}
            </span>
          </div>
        )}

        <div
          className={`inline-block p-3 rounded-lg max-w-full ${
            isOwn
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white ml-auto"
              : "bg-gray-700/50 text-gray-300"
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
                className="flex-1 bg-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          ) : type === "text" ? (
            parseMessageContent(content)
          ) : (
            content
          )}
        </div>

        {isOwn && (
          <div className="flex items-center justify-end space-x-2 mt-1">
            <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {formatTimestamp(timestamp)}
              {edited && (
                <span className="ml-1 text-xs text-blue-400">(edited)</span>
              )}
            </span>
            {/* Read status indicator */}
            <div className="flex items-center">
              {readByRecipient ? (
                <CheckCheck className="w-3 h-3 text-blue-400" />
              ) : (
                <Check className="w-3 h-3 text-gray-500" />
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-1 mt-1">
          <button
            onClick={() => onReply?.(id, username, content)}
            className="text-xs text-gray-400 hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-600/20"
          >
            Reply
          </button>
          {isOwn && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-gray-400 hover:text-yellow-400 px-2 py-1 rounded hover:bg-gray-600/20"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this message?"
                    )
                  ) {
                    onDelete?.(id);
                  }
                }}
                className="text-xs text-gray-400 hover:text-red-400 px-2 py-1 rounded hover:bg-gray-600/20"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar className="w-8 h-8 mt-1">
          {avatar && <AvatarImage src={avatar} alt={username} />}
          <AvatarFallback
            className={`${getAvatarColor(
              username
            )} text-white font-semibold text-sm`}
          >
            {username[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
