import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users, Zap, Shield, ArrowRight } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-lg">
              C
            </div>
            <span className="text-xl font-bold">ChatGo</span>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <div className="mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 mb-8 shadow-lg shadow-purple-500/25">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-tight">
                Connect, Chat,
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Collaborate
                </span>
              </h1>

              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                Experience seamless communication with your team. Join channels,
                share ideas, and stay connected in real-time with our modern
                chat platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 
             hover:from-purple-600 hover:to-blue-600 
             text-white px-8 py-3 rounded-lg font-semibold 
             shadow-lg shadow-purple-500/25 
             transition-colors 
             duration-500 ease-in-out 
             hover:shadow-xl hover:shadow-purple-500/40"
                >
                  <Link to="/signup" className="flex items-center space-x-2">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200"
                >
                  <Link to="/signin">Sign In</Link>
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/50 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 mb-4 group-hover:from-purple-500/30 group-hover:to-purple-600/30 transition-all duration-300">
                    <MessageCircle className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Real-time Chat
                  </h3>
                  <p className="text-gray-400">
                    Instant messaging with typing indicators and message status
                    updates.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/50 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 mb-4 group-hover:from-blue-500/30 group-hover:to-blue-600/30 transition-all duration-300">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Team Channels
                  </h3>
                  <p className="text-gray-400">
                    Organize conversations by topics with dedicated channels for
                    your team.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700/50 hover:bg-gray-800/50 transition-all duration-300 group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/20 mb-4 group-hover:from-green-500/30 group-hover:to-green-600/30 transition-all duration-300">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-white">
                    Lightning Fast
                  </h3>
                  <p className="text-gray-400">
                    Built with modern tech stack for optimal performance and
                    reliability.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bottom CTA */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30">
              <div className="flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-green-400 mr-3" />
                <h3 className="text-2xl font-bold text-white">
                  Secure & Private
                </h3>
              </div>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Your conversations are protected with end-to-end encryption.
                Join thousands of teams who trust ChatGo for their daily
                communication.
              </p>
              <Button
                asChild
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg shadow-green-500/25 transition-all duration-200"
              >
                <Link to="/signup">Start Chatting Today</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
