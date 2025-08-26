import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";

interface MessageInputProps {
  activeChannel: string;
  isConnected: boolean;
  onSendMessage: (message: string, replyTo?: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  replyToMessage?: { id: string; username: string; content: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  activeChannel,
  isConnected,
  onSendMessage,
  onTyping,
  onStopTyping,
  replyToMessage,
  onCancelReply,
}: MessageInputProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && !isSending) {
      setIsSending(true);
      onSendMessage(messageInput.trim(), replyToMessage?.id);
      setMessageInput("");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onStopTyping();
      onCancelReply?.(); // Clear reply when message is sent

      // Simulate send animation delay
      setTimeout(() => setIsSending(false), 300);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    // Send typing indicator
    onTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 1000);
  };

  return (
    <div className="p-4 border-t border-gray-700/50 bg-gray-900/20 backdrop-blur-sm">
      {replyToMessage && (
        <div className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">
              Replying to {replyToMessage.username}
            </div>
            <div className="text-sm text-gray-300 truncate">
              {replyToMessage.content}
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="ml-3 p-1 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="relative">
        <input
          type="text"
          value={messageInput}
          onChange={handleInputChange}
          placeholder={
            replyToMessage
              ? `Reply to ${replyToMessage.username}...`
              : `Message #${activeChannel}`
          }
          disabled={!isConnected}
          className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600/50 rounded-lg px-4 py-3 pr-20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed message-input-focus focus-ring"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
          <Button
            type="submit"
            size="sm"
            disabled={!messageInput.trim() || !isConnected || isSending}
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed button-interactive hover-glow transition-all duration-300"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
