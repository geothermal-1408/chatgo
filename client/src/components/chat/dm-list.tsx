import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Search,
  Plus,
  Users,
  CheckCheck,
  Check,
} from "lucide-react";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import { useUserRelationships } from "@/hooks/use-user-relationships";
import { useAuth } from "@/hooks/use-auth";
import type { DMConversation } from "@/hooks/use-direct-messages";

interface DMListProps {
  onSelectConversation: (conversation: DMConversation) => void;
  selectedConversationId: string | null;
  onClose: () => void;
  getAvatarColor: (username: string) => string;
}

export function DMList({
  onSelectConversation,
  selectedConversationId,
  onClose,
  getAvatarColor,
}: DMListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDMDialog, setShowNewDMDialog] = useState(false);

  const { conversations, loading, createOrGetConversation } =
    useDirectMessages();
  const { friends } = useUserRelationships();
  const { user } = useAuth();

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.other_user_username
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (conv.other_user_display_name &&
        conv.other_user_display_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
  );

  const handleStartConversation = async (friendId: string) => {
    try {
      await createOrGetConversation(friendId);
      setShowNewDMDialog(false);
      // The conversations list will be updated automatically, and the user can select it from the list
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
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

  return (
    <div className="h-full flex flex-col bg-gray-900/50 border-r border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-purple-400" />
            Direct Messages
          </h2>
          <Button
            onClick={() => setShowNewDMDialog(!showNewDMDialog)}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 bg-gray-800/70 border-gray-600/50 text-white"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-8">
            Loading conversations...
          </div>
        ) : (
          <div>
            {/* Existing Conversations */}
            {filteredConversations.length > 0 && (
              <div>
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.dm_id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`flex items-center p-4 cursor-pointer transition-all border-b border-gray-800/50 hover:bg-gray-800/30 ${
                      selectedConversationId === conversation.dm_id
                        ? "bg-purple-600/10 border-l-4 border-l-purple-500"
                        : ""
                    }`}
                  >
                    <div className="relative mr-3">
                      <Avatar className="w-12 h-12">
                        {conversation.other_user_avatar_url ? (
                          <AvatarImage
                            src={conversation.other_user_avatar_url}
                            alt={conversation.other_user_username}
                          />
                        ) : null}
                        <AvatarFallback
                          className={`${getAvatarColor(
                            conversation.other_user_username
                          )} text-white font-semibold`}
                        >
                          {conversation.other_user_username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.other_user_is_online && (
                        <div
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${getStatusColor(
                            conversation.other_user_status
                          )}`}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {conversation.other_user_display_name ||
                              conversation.other_user_username}
                          </h3>
                          {conversation.other_user_display_name && (
                            <span className="text-xs text-gray-400 truncate">
                              @{conversation.other_user_username}
                            </span>
                          )}
                        </div>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatMessageTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {conversation.last_message_content && (
                          <p className="text-sm text-gray-400 truncate flex-1">
                            {conversation.last_message_content.length > 50
                              ? `${conversation.last_message_content.substring(
                                  0,
                                  50
                                )}...`
                              : conversation.last_message_content}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                          {conversation.last_message_read_by_recipient &&
                            conversation.last_message_sender_id ===
                              user?.id && (
                              <CheckCheck className="w-4 h-4 text-blue-400" />
                            )}
                          {!conversation.last_message_read_by_recipient &&
                            conversation.last_message_sender_id ===
                              user?.id && (
                              <Check className="w-4 h-4 text-gray-400" />
                            )}
                          {conversation.unread_count > 0 && (
                            <Badge className="bg-purple-600 text-white text-xs px-2 py-1">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New DM Section */}
            {showNewDMDialog && (
              <div className="p-4 border-t border-gray-700/50">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                  Start New Conversation
                </h4>
                {friends
                  .filter(
                    (friend) =>
                      friend.username
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                      (friend.display_name &&
                        friend.display_name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()))
                  )
                  .filter(
                    (friend) =>
                      !conversations.some(
                        (conv) => conv.other_user_id === friend.id
                      )
                  )
                  .map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => handleStartConversation(friend.id)}
                      className="flex items-center p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-800/30"
                    >
                      <div className="relative mr-3">
                        <Avatar className="w-10 h-10">
                          {friend.avatar_url ? (
                            <AvatarImage
                              src={friend.avatar_url}
                              alt={friend.username}
                            />
                          ) : null}
                          <AvatarFallback
                            className={`${getAvatarColor(
                              friend.username
                            )} text-white font-semibold`}
                          >
                            {friend.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {friend.is_online && (
                          <div
                            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${getStatusColor(
                              friend.status
                            )}`}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-white truncate">
                            {friend.display_name || friend.username}
                          </h3>
                          {friend.display_name && (
                            <span className="text-xs text-gray-400 truncate">
                              @{friend.username}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {friend.is_online ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))}

                {friends.filter(
                  (friend) =>
                    !conversations.some(
                      (conv) => conv.other_user_id === friend.id
                    )
                ).length === 0 && (
                  <div className="text-center text-gray-400 py-4">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">All friends have conversations</p>
                  </div>
                )}
              </div>
            )}

            {filteredConversations.length === 0 && !showNewDMDialog && (
              <div className="text-center text-gray-400 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No conversations yet</h3>
                <p className="text-sm">
                  Start a new conversation with a friend
                </p>
                <Button
                  onClick={() => setShowNewDMDialog(true)}
                  size="sm"
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Message
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
