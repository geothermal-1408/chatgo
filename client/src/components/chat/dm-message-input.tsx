import type React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";

interface DMMessageInputProps {
  onSendMessage: (message: string) => void;
  onTyping?: () => void;
  replyTo?: { id: string; username: string; content: string } | null;
  onCancelReply?: () => void;
  placeholder?: string;
}

export function DMMessageInput({
  onSendMessage,
  onTyping,
  replyTo,
  onCancelReply,
  placeholder = "Type a message...",
}: DMMessageInputProps) {
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    // Send typing indicator
    if (onTyping) {
      onTyping();

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        // Typing indicator automatically expires on the server
      }, 3000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && !isSending) {
      setIsSending(true);

      // Clear typing timeout when sending
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      onSendMessage(messageInput.trim());
      setMessageInput("");
      onCancelReply?.();

      // Simulate send animation delay
      setTimeout(() => setIsSending(false), 300);
    }
  };

  return (
    <div className="p-4">
      {/* Reply indicator */}
      {replyTo && (
        <div className="mb-3 p-3 bg-gray-700/50 rounded-lg border-l-4 border-purple-500 flex justify-between items-start">
          <div>
            <div className="text-xs text-purple-400 font-medium mb-1">
              Replying to {replyTo.username}
            </div>
            <div className="text-sm text-gray-300 truncate max-w-md">
              {replyTo.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            className="text-gray-400 hover:text-white p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Message form */}
      <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
        <div className="flex-1">
          <input
            type="text"
            value={messageInput}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            maxLength={2000}
          />
        </div>
        <Button
          type="submit"
          disabled={!messageInput.trim() || isSending}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed p-3 transition-all duration-200"
        >
          <Send className={`w-5 h-5 ${isSending ? "animate-pulse" : ""}`} />
        </Button>
      </form>
    </div>
  );
}
