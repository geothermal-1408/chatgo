interface TypingIndicatorProps {
  typingUsers: Set<string>;
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.size === 0) return null;

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-400 animate-fade-in-scale">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"></div>
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"
          style={{ animationDelay: "0.2s" }}
        ></div>
        <div
          className="w-2 h-2 bg-gray-400 rounded-full animate-typing-bounce"
          style={{ animationDelay: "0.4s" }}
        ></div>
      </div>
      <span className="animate-pulse">
        {Array.from(typingUsers).join(", ")}{" "}
        {typingUsers.size === 1 ? "is" : "are"} typing...
      </span>
    </div>
  );
}
