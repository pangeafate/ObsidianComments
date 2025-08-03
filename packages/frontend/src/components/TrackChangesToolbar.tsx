import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { getUserColorVariables } from '../utils/userColors';

interface TrackChangesToolbarProps {
  editor: Editor;
}

interface UserChange {
  userId: string;
  userName: string;
  count: number;
}

export function TrackChangesToolbar({ editor }: TrackChangesToolbarProps) {
  const [trackChangesCount, setTrackChangesCount] = useState(0);
  const [activeUsers, setActiveUsers] = useState<UserChange[]>([]);
  const [isTrackChangesEnabled, setIsTrackChangesEnabled] = useState(true);

  // Update track changes info when editor content changes
  useEffect(() => {
    const updateTrackChangesInfo = () => {
      const userChanges = new Map<string, UserChange>();
      let totalChanges = 0;

      editor.state.doc.descendants((node) => {
        if (node.isText) {
          node.marks.forEach(mark => {
            if (mark.type.name === 'trackChange') {
              totalChanges++;
              const userId = mark.attrs.userId;
              const userName = mark.attrs.userName || 'Unknown User';
              
              if (userChanges.has(userId)) {
                userChanges.get(userId)!.count++;
              } else {
                userChanges.set(userId, {
                  userId,
                  userName,
                  count: 1
                });
              }
            }
          });
        }
      });

      setTrackChangesCount(totalChanges);
      setActiveUsers(Array.from(userChanges.values()));
    };

    // Update on editor state changes
    const handleUpdate = () => {
      updateTrackChangesInfo();
    };

    editor.on('update', handleUpdate);
    updateTrackChangesInfo(); // Initial update

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // Check if track changes is enabled
  useEffect(() => {
    const trackChangesExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackChange'
    );
    
    if (trackChangesExt) {
      setIsTrackChangesEnabled(trackChangesExt.options.enabled !== false);
    }
  }, [editor]);

  const handleAcceptAllChanges = () => {
    editor.commands.acceptAllChanges();
  };

  const handleToggleTrackChanges = () => {
    // Get current state from extension
    const trackChangesExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'trackChange'
    );
    
    const currentlyEnabled = trackChangesExt?.options.enabled !== false;
    
    // Toggle the extension
    editor.commands.toggleTrackChanges();
    
    // If we're disabling track changes, clear marks at cursor position
    if (currentlyEnabled) {
      editor.commands.clearTrackChangesAtCursor();
    }
    
    // Update local state to match extension state
    setIsTrackChangesEnabled(!currentlyEnabled);
  };

  return (
    <div className="border-b bg-gray-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleTrackChanges}
            className={`px-4 py-2 rounded-md border font-medium transition-colors ${
              isTrackChangesEnabled
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Track Changes
          </button>

          <button
            onClick={handleAcceptAllChanges}
            disabled={trackChangesCount === 0}
            className={`px-4 py-2 rounded-md border font-medium transition-colors ${
              trackChangesCount > 0
                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
            }`}
          >
            Accept All Changes
          </button>
        </div>

        <div className="text-sm text-gray-600">
          {trackChangesCount > 0 ? (
            <span>
              {trackChangesCount} change{trackChangesCount !== 1 ? 's' : ''} pending
            </span>
          ) : (
            <span>No pending changes</span>
          )}
        </div>
      </div>

      {activeUsers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Active Contributors:</h4>
          <div className="flex flex-wrap gap-2">
            {activeUsers.map((user) => {
              const colorVars = getUserColorVariables(user.userId);
              return (
                <div
                  key={user.userId}
                  className="flex items-center gap-2 px-3 py-1 rounded-full border text-sm"
                  style={{
                    backgroundColor: colorVars['--user-color-bg'],
                    borderColor: colorVars['--user-color-border'],
                    color: colorVars['--user-color-text']
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: colorVars['--user-color-border']
                    }}
                  />
                  <span className="font-medium">{user.userName}</span>
                  <span className="text-xs opacity-75">
                    ({user.count} change{user.count !== 1 ? 's' : ''})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}