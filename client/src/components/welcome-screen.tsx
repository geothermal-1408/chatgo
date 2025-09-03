import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users, Zap, Shield, ArrowRight } from "lucide-react";

export function WelcomeScreen() {
  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Hero geometric background */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Triangle */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rotate-12"
          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        {/* Rotated square outline */}
        <div className="absolute top-16 right-10 w-40 h-40 border-2 border-blue-600/30 rotate-45 rounded-sm" />
        {/* Dot grid base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-40 hero-geo-dots opacity-20 scale-110" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-900 border border-blue-600/30">
              <img src="./logo-removebg.png" alt="Logo" height={90} />
            </div>
            <span className="text-xl font-bold">ChatGo</span>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            {/* Hero Section */}
            <div className="mb-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-gray-900 border border-blue-600/40 shadow-[0_0_0_6px_rgba(37,99,235,0.08)] mb-8">
                <MessageCircle className="w-10 h-10 text-blue-400" />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                Connect, Chat,
                <br />
                <span className="cursive-highlight text-amber-400">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow-lg/50 transition-colors"
                >
                  <Link to="/signup" className="flex items-center gap-2">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-8 py-3 rounded-lg font-semibold transition-colors bg-transparent"
                >
                  <Link to="/signin">Sign In</Link>
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <Card className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 hover:bg-gray-900 transition-colors group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-900 border border-blue-600/30 mb-4">
                    <MessageCircle className="w-6 h-6 text-blue-400" />
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

              <Card className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 hover:bg-gray-900 transition-colors group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-900 border border-blue-600/30 mb-4">
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

              <Card className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 hover:bg-gray-900 transition-colors group">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-900 border border-blue-600/30 mb-4">
                    <Zap className="w-6 h-6 text-blue-400" />
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
            <div className="bg-gray-900/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
              <div className="flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-blue-400 mr-3" />
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
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
