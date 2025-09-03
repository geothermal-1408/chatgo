import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, MessageCircle } from "lucide-react";

interface AuthModalProps {
  onAuthenticate: (username: string) => void;
}

export function AuthModal({ onAuthenticate }: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    // Simulate authentication delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    onAuthenticate(username.trim());
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="bg-gray-900/90 backdrop-blur-md border-gray-700/50 shadow-2xl shadow-purple-500/10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-900 border border-blue-600/30 rounded-xl flex items-center justify-center shadow-[0_0_0_6px_rgba(37,99,235,0.08)]">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">
                Welcome to Discord Clone
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Enter your username to join the conversation
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-gray-300"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setUsername(e.target.value)
                    }
                    className="pl-10 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 focus:ring-purple-500/50 focus:border-purple-500/50"
                    maxLength={20}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Choose a name that others will see in the chat
                </p>
              </div>
              <Button
                type="submit"
                disabled={!username.trim() || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Joining...</span>
                  </div>
                ) : (
                  "Join Chat"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
