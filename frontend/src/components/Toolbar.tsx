// Formatting toolbar for the rich text editor

import { useCollaboration } from '../contexts/CollaborationContext';

export function Toolbar() {
  const { state, actions } = useCollaboration();

  const formatButtons = [
    {
      id: 'bold',
      label: 'Bold',
      icon: 'B',
      shortcut: 'Ctrl+B',
      className: 'font-bold'
    },
    {
      id: 'italic',
      label: 'Italic',
      icon: 'I',
      shortcut: 'Ctrl+I',
      className: 'italic'
    },
    {
      id: 'underline',
      label: 'Underline',
      icon: 'U',
      shortcut: 'Ctrl+U',
      className: 'underline'
    },
    {
      id: 'code',
      label: 'Code',
      icon: '</>',
      shortcut: 'Ctrl+`',
      className: 'font-mono'
    }
  ];

  const handleVersionHistory = () => {
    // TODO: Implement version history modal
    alert('Version history feature coming soon!');
  };

  const handleSync = () => {
    actions.requestSync();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Formatting controls */}
        <div className="flex items-center space-x-1">
          {formatButtons.map((button) => (
            <button
              key={button.id}
              title={`${button.label} (${button.shortcut})`}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <span className={`text-sm ${button.className}`}>
                {button.icon}
              </span>
            </button>
          ))}
          
          <div className="w-px h-6 bg-gray-300 mx-2"></div>
          
          {/* Paragraph formatting */}
          <select className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="paragraph">Paragraph</option>
            <option value="heading">Heading</option>
            <option value="blockquote">Quote</option>
          </select>
        </div>

        {/* Document actions */}
        <div className="flex items-center space-x-3">
          {/* Sync status */}
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className={`w-2 h-2 rounded-full ${
              state.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span>
              {state.isConnected ? 'Synced' : 'Offline'}
            </span>
          </div>

          {/* Action buttons */}
          <button
            onClick={handleSync}
            disabled={!state.isConnected}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Sync
          </button>
          
          <button
            onClick={handleVersionHistory}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            History
          </button>

          {/* Document stats */}
          <div className="text-sm text-gray-500">
            Version {state.documentState?.version || 1}
          </div>
        </div>
      </div>
    </div>
  );
}