import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageCircle, Mail, CheckCircle, ArrowLeft } from "lucide-react";

interface EmailConfirmationProps {
  email?: string;
}

export function EmailConfirmation({ email }: EmailConfirmationProps) {
  const [countdown, setCountdown] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/signin");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative">
      {/* Modern geometric background */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none modern-bg-pattern"
        aria-hidden="true"
      >
        {/* Triangle */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 rotate-12"
          style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
        />
        {/* Rotated square outline */}
        <div className="absolute top-16 right-10 w-40 h-40 border-2 border-blue-600/30 rotate-45 rounded-sm" />
        {/* Small floating elements */}
        <div className="absolute bottom-10 right-20 w-16 h-16 border border-blue-500/20 rounded-lg rotate-12" />
        <div className="absolute top-1/3 left-16 w-8 h-8 bg-blue-500/10 rounded-full" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gray-900 border border-blue-600/30">
                <img src="./logo-removebg.png" alt="Logo" height={90} />
              </div>
              <span className="text-2xl font-bold">ChatGo</span>
            </div>
          </div>

          <Card className="bg-gray-900/70 backdrop-blur-sm border border-gray-800 shadow-2xl shadow-blue-500/10">
            <CardHeader className="text-center space-y-4">
              <Link
                to="/signup"
                className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="mx-auto w-20 h-20 bg-gray-900 border border-blue-600/40 rounded-xl flex items-center justify-center shadow-[0_0_0_6px_rgba(37,99,235,0.08)]">
                <Mail className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                  Check Your Email
                </CardTitle>
                <CardDescription className="text-gray-400 mt-2">
                  We've sent you a confirmation link
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-3">
                    <MessageCircle className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Almost There!
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We've sent a confirmation link to{" "}
                    {email && (
                      <span className="text-blue-400 font-medium">{email}</span>
                    )}
                    {!email && (
                      <span className="text-blue-400 font-medium">
                        your email address
                      </span>
                    )}
                    . Click the link in the email to verify your account and
                    start chatting!
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="text-sm text-gray-500">
                    <p>Didn't receive the email? Check your spam folder or</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:text-white"
                    onClick={() => {
                      // In a real app, you'd implement resend functionality
                      alert("Resend functionality would be implemented here");
                    }}
                  >
                    Resend Confirmation Email
                  </Button>
                </div>

                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    🔒 Your account is secure and will be activated once you
                    confirm your email address.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700/50">
                <p className="text-gray-500 text-sm mb-3">
                  Redirecting to sign in page in{" "}
                  <span className="text-blue-400 font-medium">{countdown}</span>{" "}
                  seconds
                </p>
                <Button
                  onClick={() => navigate("/signin")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Go to Sign In Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
