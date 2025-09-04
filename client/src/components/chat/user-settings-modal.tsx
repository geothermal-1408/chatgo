import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Settings,
  X as XIcon,
  Save,
  Moon,
  Sun,
  Bell,
  Volume2,
  Eye,
  Users,
} from "lucide-react";
import { useUserPreferences } from "@/hooks/use-user-relationships";

interface UserSettingsModalProps {
  onClose: () => void;
}

export function UserSettingsModal({ onClose }: UserSettingsModalProps) {
  const { preferences, updatePreferences, loading } = useUserPreferences();

  const [theme, setTheme] = useState<"light" | "dark" | "auto">("dark");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setTheme(preferences.theme);
      setNotificationsEnabled(preferences.notifications_enabled);
      setSoundEnabled(preferences.sound_enabled);
      setShowOnlineStatus(preferences.show_online_status);
      setAllowFriendRequests(preferences.allow_friend_requests);
    }
  }, [preferences]);

  useEffect(() => {
    if (preferences) {
      const hasChanged =
        theme !== preferences.theme ||
        notificationsEnabled !== preferences.notifications_enabled ||
        soundEnabled !== preferences.sound_enabled ||
        showOnlineStatus !== preferences.show_online_status ||
        allowFriendRequests !== preferences.allow_friend_requests;

      setHasChanges(hasChanged);
    }
  }, [
    preferences,
    theme,
    notificationsEnabled,
    soundEnabled,
    showOnlineStatus,
    allowFriendRequests,
  ]);

  const handleSave = async () => {
    try {
      await updatePreferences({
        theme,
        notifications_enabled: notificationsEnabled,
        sound_enabled: soundEnabled,
        show_online_status: showOnlineStatus,
        allow_friend_requests: allowFriendRequests,
      });
      setHasChanges(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save settings. Please try again.");
    }
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
    label,
    description,
    icon: Icon,
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description: string;
    icon: React.ElementType;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/50">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h4 className="font-semibold text-white">{label}</h4>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
          enabled ? "bg-blue-600" : "bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="text-white">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="bg-gray-900/95 backdrop-blur-lg border-gray-700/50 shadow-2xl shadow-blue-500/20">
          <CardHeader className="bg-gradient-to-br from-blue-600/20 to-blue-600/20 rounded-t-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-400" />
                <CardTitle className="text-2xl font-bold text-white">
                  Settings
                </CardTitle>
              </div>
              <div>
                <button
                  onClick={onClose}
                  aria-label="Close settings"
                  className="p-2 rounded hover:bg-gray-800/30"
                >
                  <XIcon className="w-5 h-5 text-gray-300" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6 max-h-96 overflow-y-auto">
            {/* Theme Selection */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Appearance</h3>
              <div className="space-y-2">
                <div className="flex space-x-2">
                  {[
                    { value: "light" as const, label: "Light", icon: Sun },
                    { value: "dark" as const, label: "Dark", icon: Moon },
                    { value: "auto" as const, label: "Auto", icon: Settings },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg border transition-colors ${
                        theme === option.value
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-gray-800/30 border-gray-700/50 text-gray-400 hover:bg-gray-700/30"
                      }`}
                    >
                      <option.icon className="w-4 h-4" />
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">
                Notifications
              </h3>
              <ToggleSwitch
                enabled={notificationsEnabled}
                onChange={setNotificationsEnabled}
                label="Enable Notifications"
                description="Receive notifications for new messages and activities"
                icon={Bell}
              />
              <ToggleSwitch
                enabled={soundEnabled}
                onChange={setSoundEnabled}
                label="Sound Effects"
                description="Play sounds for notifications and interactions"
                icon={Volume2}
              />
            </div>

            {/* Privacy */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Privacy</h3>
              <ToggleSwitch
                enabled={showOnlineStatus}
                onChange={setShowOnlineStatus}
                label="Show Online Status"
                description="Let others see when you're online"
                icon={Eye}
              />
              <ToggleSwitch
                enabled={allowFriendRequests}
                onChange={setAllowFriendRequests}
                label="Allow Friend Requests"
                description="Allow others to send you friend requests"
                icon={Users}
              />
            </div>

            {/* Save Button */}
            {hasChanges && (
              <div className="flex justify-end pt-4 border-t border-gray-700/50">
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
