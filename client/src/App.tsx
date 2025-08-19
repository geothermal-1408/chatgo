import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { WelcomeScreen } from "@/components/welcome-screen";
import { SignInSupabase } from "@/components/signin";
import { SignUpSupabase } from "@/components/signup";
import { ChatLayout } from "@/components/chat-layout";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { DebugUserInfo } from "@/components/debug-user-info";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route
        path="/signin"
        element={user ? <Navigate to="/chat" replace /> : <SignInSupabase />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/chat" replace /> : <SignUpSupabase />}
      />
      <Route path="/debug" element={<DebugUserInfo />} />
      <Route
        path="/chat"
        element={
          user ? (
            <ChatLayout
              initialUser={{
                username: user.username,
                status: "online",
                bio: user.display_name || "",
              }}
            />
          ) : (
            <Navigate to="/signin" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
