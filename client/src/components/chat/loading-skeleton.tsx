export function MessageSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-2 animate-pulse">
      <div className="w-10 h-10 bg-gray-700/50 rounded-full skeleton"></div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gray-700/50 rounded w-20 skeleton"></div>
          <div className="h-3 bg-gray-700/30 rounded w-16 skeleton"></div>
        </div>
        <div className="h-4 bg-gray-700/30 rounded w-3/4 skeleton"></div>
      </div>
    </div>
  );
}

export function UserSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-2 animate-pulse">
      <div className="w-8 h-8 bg-gray-700/50 rounded-full skeleton"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-700/50 rounded w-16 skeleton"></div>
        <div className="h-3 bg-gray-700/30 rounded w-12 skeleton"></div>
      </div>
    </div>
  );
}

export function ChannelSkeleton() {
  return (
    <div className="flex items-center space-x-3 px-3 py-2 animate-pulse">
      <div className="w-4 h-4 bg-gray-700/50 rounded skeleton"></div>
      <div className="h-4 bg-gray-700/50 rounded w-20 skeleton"></div>
    </div>
  );
}
