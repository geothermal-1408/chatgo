import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DMMessageInput } from "@/components/chat/dm-message-input";
import { DMMessageComponent } from "@/components/chat/dm-message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useDMMessages } from "@/hooks/use-direct-messages";
import { useDirectMessages } from "@/hooks/use-direct-messages";
import type { DMConversation } from "@/hooks/use-direct-messages";

interface DMChatProps {
  conversation: DMConversation;
  onBack: () => void;
  getAvatarColor: (username: string) => string;
  currentUserId: string;
}

export function DMChat({
  conversation,
  onBack,
  getAvatarColor,
  currentUserId,
}: DMChatProps) {
  const [replyToMessage, setReplyToMessage] = useState<{
    id: string;
    username: string;
    content: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTypingIndicator,
    typingIndicator,
    isConnected,
    connectionStatus,
  } = useDMMessages(conversation.dm_id);
  const { markAsRead } = useDirectMessages();

  // Handle typing indicator
  const handleTyping = () => {
    if (sendTypingIndicator && conversation.other_user_id) {
      sendTypingIndicator(conversation.other_user_id, true);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation.dm_id && conversation.unread_count > 0) {
      markAsRead(conversation.dm_id);
    }
  }, [conversation.dm_id, conversation.unread_count, markAsRead]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content, replyToMessage?.id);
      setReplyToMessage(null);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleReply = (
    messageId: string,
    username: string,
    content: string
  ) => {
    setReplyToMessage({ id: messageId, username, content });
  };

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error("Error deleting message:", error);
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

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* DM Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="relative">
            <Avatar className="w-10 h-10">
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
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(
                  conversation.other_user_status
                )}`}
              />
            )}
          </div>

          <div>
            <h2 className="font-semibold text-white">
              {conversation.other_user_display_name ||
                conversation.other_user_username}
            </h2>
            <div className="flex items-center space-x-2">
              {conversation.other_user_display_name &&
                conversation.other_user_display_name !==
                  conversation.other_user_username && (
                  <span className="text-sm text-gray-400">
                    @{conversation.other_user_username}
                  </span>
                )}
              {conversation.other_user_is_online && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-300 text-xs"
                >
                  {conversation.other_user_status}
                </Badge>
              )}
              {/* Connection status indicator */}
              <div className="flex items-center space-x-1">
                {isConnected ? (
                  <Wifi className="w-3 h-3 text-green-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-red-400" />
                )}
                <span className="text-xs text-gray-500 capitalize">
                  {connectionStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              Start your conversation
            </h3>
            <p className="text-center max-w-md">
              This is the beginning of your direct message history with{" "}
              <span className="text-white font-medium">
                {conversation.other_user_display_name ||
                  conversation.other_user_username}
              </span>
              . Send a message to get started!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <DMMessageComponent
              key={message.id}
              id={message.id}
              username={message.sender.username}
              displayName={message.sender.display_name}
              avatar={message.sender.avatar_url}
              content={message.content}
              timestamp={message.created_at}
              type={message.message_type}
              fileUrl={message.file_url}
              replyTo={message.reply_to}
              edited={message.edited}
              editedAt={message.edited_at}
              isOwn={message.sender_id === currentUserId}
              readByRecipient={message.read_by_recipient}
              readAt={message.read_at}
              getAvatarColor={getAvatarColor}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}

        {/* Typing indicator */}
        {typingIndicator.isTyping && (
          <TypingIndicator typingUsers={new Set([typingIndicator.username])} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-700/50 bg-gray-800/30">
        <DMMessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          placeholder={`Message ${
            conversation.other_user_display_name ||
            conversation.other_user_username
          }...`}
        />
      </div>
    </div>
  );
}
