import { useState, useEffect, useRef, useCallback } from 'react';

interface EditableTitleProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  onSave?: (title: string) => Promise<void>;
  isReadOnly?: boolean;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}

export function EditableTitle({
  title,
  onTitleChange,
  onSave,
  isReadOnly = false,
  className = '',
  placeholder = 'Untitled Document',
  maxLength = 200
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const originalTitleRef = useRef<string>(title);

  // Update local title when prop changes (for real-time updates from other users)
  useEffect(() => {
    if (!isEditing && title !== localTitle) {
      setLocalTitle(title);
    }
  }, [title, isEditing, localTitle]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    if (isReadOnly) return;
    
    originalTitleRef.current = localTitle;
    setIsEditing(true);
    setError(null);
  }, [isReadOnly, localTitle]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setLocalTitle(originalTitleRef.current);
    setError(null);
  }, []);

  const saveTitle = useCallback(async () => {
    const trimmedTitle = localTitle.trim();
    
    // Validate title
    if (!trimmedTitle) {
      setError('Title cannot be empty');
      return false;
    }

    if (trimmedTitle === originalTitleRef.current) {
      // No change, just exit editing mode
      setIsEditing(false);
      return true;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      // Update through parent component first (for optimistic updates)
      onTitleChange(trimmedTitle);
      
      // Save to backend if save function provided
      if (onSave) {
        await onSave(trimmedTitle);
      }
      
      setIsEditing(false);
      return true;
    } catch (error) {
      console.error('Failed to save title:', error);
      setError(error instanceof Error ? error.message : 'Failed to save title');
      
      // Revert optimistic update
      onTitleChange(originalTitleRef.current);
      setLocalTitle(originalTitleRef.current);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [localTitle, onTitleChange, onSave]);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  }, [saveTitle, cancelEditing]);

  const handleInputBlur = useCallback(async () => {
    // Small delay to allow click events to fire first
    setTimeout(async () => {
      if (isEditing) {
        await saveTitle();
      }
    }, 100);
  }, [isEditing, saveTitle]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setLocalTitle(value);
      setError(null);
    }
  }, [maxLength]);

  // Display title or input based on editing state
  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          value={localTitle}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={isSaving}
          className={`
            w-full text-xl font-semibold text-gray-900 bg-transparent
            border-2 border-blue-500 rounded px-2 py-1 
            focus:outline-none focus:border-blue-600
            ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
            ${error ? 'border-red-500' : ''}
          `}
          maxLength={maxLength}
        />
        
        {/* Character counter */}
        {localTitle.length > maxLength * 0.8 && (
          <div className={`text-xs absolute -bottom-5 right-0 ${
            localTitle.length >= maxLength ? 'text-red-500' : 'text-gray-500'
          }`}>
            {localTitle.length}/{maxLength}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="text-red-500 text-sm mt-1 absolute -bottom-6 left-0">
            {error}
          </div>
        )}
        
        {/* Save indicator */}
        {isSaving && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    );
  }

  // Display mode
  return (
    <div className={`relative group ${className}`}>
      <h1 
        className={`
          text-xl font-semibold text-gray-900 truncate cursor-pointer
          ${!isReadOnly ? 'hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors' : ''}
          ${!isReadOnly ? 'group-hover:outline group-hover:outline-1 group-hover:outline-gray-300' : ''}
        `}
        onClick={startEditing}
        title={!isReadOnly ? `Click to edit: ${localTitle}` : localTitle}
      >
        {localTitle || placeholder}
      </h1>
      
      {/* Edit icon hint */}
      {!isReadOnly && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg 
            className="w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
            />
          </svg>
        </div>
      )}
    </div>
  );
}