export function NewNoteButton() {
  const generateDocumentId = (): string => {
    // Use crypto.randomUUID if available (modern browsers)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    
    // Fallback to timestamp + random for older browsers
    const timestamp = Date.now();
    const random = Math.random().toString().slice(2); // Remove "0."
    return `${timestamp}-${random}`;
  };

  const handleNewNote = () => {
    try {
      const documentId = generateDocumentId();
      const newNoteUrl = `/editor/${documentId}`;
      
      const newWindow = window.open(newNoteUrl, '_blank');
      
      if (!newWindow) {
        console.error('Failed to open new note');
      }
    } catch (error) {
      console.error('Error creating new note:', error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleNewNote}
      className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
      title="Create a new document"
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 4v16m8-8H4" 
        />
      </svg>
      New Note
    </button>
  );
}