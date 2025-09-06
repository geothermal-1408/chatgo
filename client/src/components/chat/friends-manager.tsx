import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  UserMinus,
  MessageCircle,
  Search,
  Check,
  X as XIcon,
  UserX,
} from "lucide-react";
import {
  useUserRelationships,
  useUserSearch,
} from "@/hooks/use-user-relationships";

interface FriendsManagerProps {
  onClose: () => void;
  onStartDirectMessage: (friendId: string) => void;
  getAvatarColor: (username: string) => string;
}

type userProps = {
  id: string;
  username: string;
  status: string;
  avatar_url?: string | null;
  display_name?: string | null;
  bio?: string | null;
};
export function FriendsManager({
  onClose,
  onStartDirectMessage,
  getAvatarColor,
}: FriendsManagerProps) {
  const [activeTab, setActiveTab] = useState<
    "friends" | "requests" | "blocked" | "search"
  >("friends");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    friends,
    blockedUsers,
    friendRequests,
    sentRequests,
    sendFriendRequest,
    acceptFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    declineFriendRequest,
    //loading: relationshipsLoading,
  } = useUserRelationships();

  const {
    searchResults,
    loading: searchLoading,
    searchUsers,
    clearResults,
  } = useUserSearch();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchUsers(query);
    } else {
      clearResults();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "busy":
        return "bg-red-500";
      case "invisible":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const handleRelationshipAction = async (
    action: string,
    userId: string,
    username?: string
  ) => {
    try {
      switch (action) {
        case "add_friend":
          if (username) await sendFriendRequest(username);
          break;
        case "accept_friend":
          if (username) await acceptFriendRequest(username);
          break;
        case "remove_friend":
          await removeFriend(userId);
          break;
        case "block":
          if (username) await blockUser(username);
          break;
        case "unblock":
          await unblockUser(userId);
          break;
        case "decline_request":
          await declineFriendRequest(userId);
          break;
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action.replace("_", " ")}. Please try again.`);
    }
  };

  const UserCard = ({
    user,
    actions,
  }: {
    user: userProps;
    actions: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <Avatar className="w-12 h-12">
            {user.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user.username} />
            ) : null}
            <AvatarFallback
              className={`${getAvatarColor(
                user.username
              )} text-white font-semibold`}
            >
              {user.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {user.status && (
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${getStatusColor(
                user.status
              )}`}
            ></div>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-white">
            {user.display_name || user.username}
          </h4>
          {user.display_name && user.display_name !== user.username && (
            <p className="text-sm text-gray-400">@{user.username}</p>
          )}
          {user.bio && (
            <p className="text-sm text-gray-400 truncate max-w-48">
              {user.bio}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">{actions}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-2xl max-h-[80vh] animate-in fade-in-0 zoom-in-95 duration-300">
        <Card className="bg-gray-900/95 backdrop-blur-lg border-gray-700/50 shadow-2xl shadow-purple-500/20">
          <CardHeader className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <Users className="w-6 h-6 mr-2 text-purple-400" />
                Friends & Social
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-8 h-8 p-0 hover:bg-gray-700/50 text-gray-400 hover:text-white"
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mt-4 bg-gray-800/50 rounded-lg p-1">
              <Button
                variant={activeTab === "friends" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("friends")}
                className={
                  activeTab === "friends"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : ""
                }
              >
                Friends ({friends.length})
              </Button>
              <Button
                variant={activeTab === "requests" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("requests")}
                className={
                  activeTab === "requests"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : ""
                }
              >
                Requests ({friendRequests.length})
              </Button>
              <Button
                variant={activeTab === "blocked" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("blocked")}
                className={
                  activeTab === "blocked"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : ""
                }
              >
                Blocked ({blockedUsers.length})
              </Button>
              <Button
                variant={activeTab === "search" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("search")}
                className={
                  activeTab === "search"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : ""
                }
              >
                Add Friends
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 max-h-96 overflow-y-auto">
            {activeTab === "search" && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search users by username or display name..."
                    className="pl-10 bg-gray-800/70 border-gray-600/50 text-white"
                  />
                </div>

                {searchLoading && (
                  <div className="text-center text-gray-400 py-4">
                    Searching...
                  </div>
                )}

                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      actions={
                        <Button
                          onClick={() =>
                            handleRelationshipAction(
                              "add_friend",
                              user.id,
                              user.username
                            )
                          }
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Friend
                        </Button>
                      }
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "friends" && (
              <div className="space-y-3">
                {friends.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No friends yet. Start by adding some friends!</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <UserCard
                      key={friend.id}
                      user={friend}
                      actions={
                        <>
                          <Button
                            onClick={() => onStartDirectMessage(friend.id)}
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700/50"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() =>
                              handleRelationshipAction(
                                "remove_friend",
                                friend.id
                              )
                            }
                            size="sm"
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-600/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </>
                      }
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === "requests" && (
              <div className="space-y-3">
                {friendRequests.length === 0 && sentRequests.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending friend requests.</p>
                  </div>
                ) : (
                  <>
                    {friendRequests.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-3">
                          Incoming Requests
                        </h4>
                        {friendRequests.map((request) => (
                          <UserCard
                            key={request.id}
                            user={request.target_user}
                            actions={
                              <>
                                <Button
                                  onClick={() =>
                                    handleRelationshipAction(
                                      "accept_friend",
                                      request.target_user.id,
                                      request.target_user.username
                                    )
                                  }
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() =>
                                    handleRelationshipAction(
                                      "decline_request",
                                      request.target_user.id
                                    )
                                  }
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-600 text-gray-300"
                                >
                                  <XIcon className="w-4 h-4" />
                                </Button>
                              </>
                            }
                          />
                        ))}
                      </div>
                    )}

                    {sentRequests.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white mb-3">
                          Sent Requests
                        </h4>
                        {sentRequests.map((request) => (
                          <UserCard
                            key={request.id}
                            user={request.target_user}
                            actions={
                              <Badge
                                variant="secondary"
                                className="bg-yellow-500/20 text-yellow-300"
                              >
                                Pending
                              </Badge>
                            }
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "blocked" && (
              <div className="space-y-3">
                {blockedUsers.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No blocked users.</p>
                  </div>
                ) : (
                  blockedUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      actions={
                        <Button
                          onClick={() =>
                            handleRelationshipAction("unblock", user.id)
                          }
                          size="sm"
                          variant="outline"
                          className="border-green-600/50 text-green-400 hover:bg-green-600/10"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Unblock
                        </Button>
                      }
                    />
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
