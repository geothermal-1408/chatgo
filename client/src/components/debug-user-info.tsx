import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

export function DebugUserInfo() {
  const { user, session } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
        } else {
          setProfiles(profilesData || []);
        }

        // Try to fetch auth users (might not work due to RLS)
        const { data: authData, error: authError } =
          await supabase.auth.admin.listUsers();

        if (authError) {
          console.error("Error fetching auth users:", authError);
        } else {
          setAuthUsers(authData?.users || []);
        }
      } catch (error) {
        console.error("Debug fetch error:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg max-w-md max-h-96 overflow-auto text-xs">
      <h3 className="font-bold mb-2">Debug Info</h3>

      <div className="mb-2">
        <h4 className="font-semibold">Current User:</h4>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </div>

      <div className="mb-2">
        <h4 className="font-semibold">Current Session:</h4>
        <pre>{session ? "Active" : "None"}</pre>
      </div>

      <div className="mb-2">
        <h4 className="font-semibold">Recent Profiles ({profiles.length}):</h4>
        {profiles.map((profile) => (
          <div key={profile.id} className="border-b border-gray-600 py-1">
            <div>ID: {profile.id.substring(0, 8)}...</div>
            <div>Username: {profile.username}</div>
            <div>Email: {profile.email}</div>
            <div>Display: {profile.display_name}</div>
            <div>Created: {new Date(profile.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-semibold">Auth Users ({authUsers.length}):</h4>
        {authUsers.map((authUser) => (
          <div key={authUser.id} className="border-b border-gray-600 py-1">
            <div>ID: {authUser.id.substring(0, 8)}...</div>
            <div>Email: {authUser.email}</div>
            <div>Confirmed: {authUser.email_confirmed_at ? "Yes" : "No"}</div>
            <div>Created: {new Date(authUser.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
