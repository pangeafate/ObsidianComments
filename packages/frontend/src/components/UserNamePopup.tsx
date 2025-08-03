import { useState, useEffect, useRef } from 'react';

interface UserNamePopupProps {
  onNameSet: (name: string) => void;
}

const USERNAME_STORAGE_KEY = 'obsidian-comments-username';

export function UserNamePopup({ onNameSet }: UserNamePopupProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if name is already stored
    const storedName = localStorage.getItem(USERNAME_STORAGE_KEY);
    
    if (storedName && storedName.trim()) {
      onNameSet(storedName);
    } else {
      setShowPopup(true);
    }
  }, [onNameSet]);

  useEffect(() => {
    // Focus input when popup shows
    if (showPopup && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showPopup]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      setError('Name cannot be empty');
      return;
    }

    // Save to localStorage
    localStorage.setItem(USERNAME_STORAGE_KEY, trimmedName);
    
    // Call callback
    onNameSet(trimmedName);
    
    // Hide popup
    setShowPopup(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  if (!showPopup) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-testid="user-name-overlay"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-md mx-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Welcome! Please enter your name
        </h2>
        
        <p className="text-gray-600 mb-4">
          Your name will be visible to other users when you comment or edit the document.
        </p>
        
        <div className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              className={`w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your name..."
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}