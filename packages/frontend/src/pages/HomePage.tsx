import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateNote = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/notes/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Note',
          content: '# New Note\n\nStart writing your collaborative note here...\n\n',
          metadata: {
            source: 'web',
            publishedBy: 'web-user'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const data = await response.json();
      
      // Navigate to the editor page for the newly created note
      navigate(`/editor/${data.shareId}`);
      
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Failed to create note. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          Obsidian Comments
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          A collaborative Markdown editor with real-time editing and commenting features.
          Publish your notes from Obsidian and collaborate with others in real-time.
        </p>
        
        <div className="mb-8">
          <button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-lg"
          >
            {isCreating ? 'Creating...' : '+ Create New Note'}
          </button>
          {error && (
            <p className="text-red-600 mt-3">{error}</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">How it works:</h2>
          <ol className="text-left space-y-2">
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
              Create a new note here or publish from Obsidian using our plugin
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
              Share the generated URL with collaborators
            </li>
            <li className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
              Edit and comment together in real-time
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}