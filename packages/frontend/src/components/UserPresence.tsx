interface User {
  name: string;
  color: string;
}

interface UserPresenceProps {
  users: User[];
}

export function UserPresence({ users }: UserPresenceProps) {

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Active users:</span>
      <div className="flex -space-x-2">
        {users.map((user, index) => (
          <div
            key={index}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        ))}
      </div>
    </div>
  );
}