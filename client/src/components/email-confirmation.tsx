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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gray-900/95 backdrop-blur-lg border-gray-700/50 shadow-2xl shadow-purple-500/20">
          <CardHeader className="text-center space-y-4">
            <Link
              to="/signup"
              className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                We've sent you a confirmation link
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Almost There!
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We've sent a confirmation link to{" "}
                  {email && (
                    <span className="text-purple-400 font-medium">{email}</span>
                  )}
                  {!email && (
                    <span className="text-purple-400 font-medium">
                      your email address
                    </span>
                  )}
                  . Click the link in the email to verify your account and start
                  chatting!
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

              <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4">
                <p className="text-purple-300 text-sm">
                  🔒 Your account is secure and will be activated once you
                  confirm your email address.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700/50">
              <p className="text-gray-500 text-sm mb-3">
                Redirecting to sign in page in{" "}
                <span className="text-purple-400 font-medium">{countdown}</span>{" "}
                seconds
              </p>
              <Button
                onClick={() => navigate("/signin")}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium"
              >
                Go to Sign In Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
