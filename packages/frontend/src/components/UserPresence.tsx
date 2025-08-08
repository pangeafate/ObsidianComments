interface User {
  name: string;
  color: string;
}

interface UserPresenceProps {
  users: User[];
}

export function UserPresence({ users }: UserPresenceProps) {

  if (users.length === 0) return null;

  // Helper function to get display character from user name
  const getDisplayCharacter = (name: string | undefined | null): string => {
    // Handle null, undefined, or empty strings
    if (!name) return '?';
    
    // Trim whitespace and check if result is empty
    const trimmedName = name.trim();
    if (trimmedName.length === 0) return '?';
    
    // Get first character and convert to uppercase
    const firstChar = trimmedName.charAt(0);
    
    // Handle emojis and special characters by checking if they display properly
    // For emojis, we'll just use the first code unit which should work for most cases
    return firstChar.toUpperCase();
  };

  return (
    <div className="flex items-center gap-2" data-testid="user-presence">
      <span className="text-sm text-gray-500">Active users:</span>
      <div className="flex -space-x-2">
        {users.map((user, index) => {
          const displayChar = getDisplayCharacter(user.name);
          return (
            <div
              key={index}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: user.color }}
              title={user.name || ''}
              role="presentation"
              aria-label={`User ${user.name || 'Unknown'}`}
            >
              {displayChar}
            </div>
          );
        })}
      </div>
    </div>
  );
}