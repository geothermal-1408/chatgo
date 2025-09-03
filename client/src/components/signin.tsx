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
import { MessageCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";

export function SignInSupabase() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const { signIn, loading } = useAuth();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await signIn(formData);
      // Navigation will be handled by auth state change
    } catch (error) {
      console.error("Sign in error:", error);
      setErrors({
        email: error instanceof Error ? error.message : "Sign in failed",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

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
              <div className="mx-auto w-16 h-16 bg-gray-900 border border-blue-600/40 rounded-xl flex items-center justify-center shadow-[0_0_0_6px_rgba(37,99,235,0.08)]">
                <MessageCircle className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-white">
                  Welcome back
                </CardTitle>
                <CardDescription className="text-gray-400 mt-2">
                  Sign in to your ChatGo account to continue chatting
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-300"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 ${
                      errors.email ? "border-red-500" : ""
                    }`}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-300"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 pr-10 ${
                        errors.password ? "border-red-500" : ""
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm">{errors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors shadow-lg"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign Up
                  </Link>
                </p>
              </div>

              <div className="mt-4 text-center">
                <button className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot your password?
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
