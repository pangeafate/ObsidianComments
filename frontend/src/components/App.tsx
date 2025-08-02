// Main application component for collaborative editing

import { useState, useEffect } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import { SlateEditor } from './Editor/SlateEditor';
import { Comments } from './Sidebar/Comments';
import { Contributors } from './Sidebar/Contributors';
import { NamePrompt } from './NamePrompt';
import { Toolbar } from './Toolbar';

interface AppProps {
  shareId: string;
}

export function App({ shareId }: AppProps) {
  const { state, actions } = useCollaboration();
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'contributors' | 'comments'>('contributors');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize connection when component mounts
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await actions.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
        // Error will be handled by the context via connection-status event
      } finally {
        setIsLoading(false);
      }
    };

    initializeConnection();

    return () => {
      actions.disconnect();
    };
  }, [actions]);

  // Join share when contributor name is provided
  const handleNameSubmit = (contributorName: string) => {
    actions.joinShare(shareId, contributorName);
    setShowNamePrompt(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">Connecting...</p>
        </div>
      </div>
    );
  }

  // Show name prompt if not connected
  if (showNamePrompt || !state.contributorName) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <NamePrompt onSubmit={handleNameSubmit} />
      </div>
    );
  }

  // Show connection error if failed to connect
  if (!state.isConnected && state.error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-sm">
          <div className="text-red-500 mb-3">
            <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Connection Failed</h2>
          <p className="text-sm text-gray-600 mb-4">{state.error}</p>
          <div className="space-y-2">
            <button
              onClick={() => actions.retry()}
              className="w-full bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-300 text-gray-700 px-4 py-2 text-sm rounded hover:bg-gray-400 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Collaborative Document
            </h1>
            <p className="text-sm text-gray-500">
              {state.contributorName} • {state.contributors.filter(c => c.isOnline).length} online
            </p>
          </div>
          
          {/* Connection indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              state.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {state.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <Toolbar />
          
          {/* Editor */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <SlateEditor shareId={shareId} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          {/* Sidebar tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSidebarTab('contributors')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                sidebarTab === 'contributors'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Contributors
            </button>
            <button
              onClick={() => setSidebarTab('comments')}
              className={`flex-1 px-4 py-3 text-sm font-medium relative ${
                sidebarTab === 'comments'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comments
              {state.comments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {state.comments.length}
                </span>
              )}
            </button>
          </div>

          {/* Sidebar content */}
          <div className="flex-1 overflow-hidden">
            {sidebarTab === 'contributors' ? (
              <Contributors />
            ) : (
              <Comments />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}