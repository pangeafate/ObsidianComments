// Contributors panel showing active users and their presence

import { useCollaboration } from '../../contexts/CollaborationContext';
import type { Contributor } from '../../types/collaboration';

interface ContributorItemProps {
  contributor: Contributor;
  isCurrentUser: boolean;
}

function ContributorItem({ contributor, isCurrentUser }: ContributorItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSeen = (lastSeen?: Date) => {
    if (!lastSeen) return '';
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors">
      {/* Avatar */}
      <div 
        className="contributor-avatar relative"
        style={{ backgroundColor: contributor.color }}
      >
        {getInitials(contributor.name)}
        
        {/* Online indicator */}
        {contributor.isOnline && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        )}
      </div>

      {/* Contributor info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {contributor.name}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-gray-500">(you)</span>
            )}
          </p>
          {contributor.isOnline && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse-slow"></div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {contributor.isOnline ? (
            <span className="text-green-600">Online</span>
          ) : (
            <span>Last seen {formatLastSeen(contributor.lastSeen)}</span>
          )}
          {contributor.cursorPosition !== undefined && contributor.isOnline && (
            <span className="ml-2">• Cursor at {contributor.cursorPosition}</span>
          )}
        </div>
      </div>

      {/* Activity indicator */}
      {contributor.isOnline && (
        <div className="flex items-center space-x-1">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: contributor.color }}
          ></div>
        </div>
      )}
    </div>
  );
}

export function Contributors() {
  const { state } = useCollaboration();
  const { contributors, contributorName } = state;

  const onlineContributors = contributors.filter(c => c.isOnline);
  const offlineContributors = contributors.filter(c => !c.isOnline);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Contributors</h2>
        <p className="text-sm text-gray-500">
          {onlineContributors.length} online • {contributors.length} total
        </p>
      </div>

      {/* Contributors list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Online contributors */}
        {onlineContributors.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Online ({onlineContributors.length})
            </h3>
            {onlineContributors.map(contributor => (
              <ContributorItem
                key={contributor.name}
                contributor={contributor}
                isCurrentUser={contributor.name === contributorName}
              />
            ))}
          </div>
        )}

        {/* Offline contributors */}
        {offlineContributors.length > 0 && (
          <div className={onlineContributors.length > 0 ? 'mt-6' : ''}>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Offline ({offlineContributors.length})
            </h3>
            {offlineContributors.map(contributor => (
              <ContributorItem
                key={contributor.name}
                contributor={contributor}
                isCurrentUser={contributor.name === contributorName}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {contributors.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No contributors yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Share this document to start collaborating
            </p>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">{state.highlights.length}</p>
            <p className="text-xs text-gray-500">Active Highlights</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{state.comments.length}</p>
            <p className="text-xs text-gray-500">Comments</p>
          </div>
        </div>
        
        {/* Connection status */}
        <div className="mt-3 flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            state.isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className="text-xs text-gray-500">
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}