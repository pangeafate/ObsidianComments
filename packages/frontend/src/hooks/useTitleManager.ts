import { useState, useEffect, useCallback, useRef } from 'react';
import { deduplicateTitle } from '../utils/contentDeduplication';

interface TitleManagerConfig {
  documentId: string;
  getTitle?: () => string | null;
  setTitle?: (title: string) => void;
  onTitleChange?: (callback: (title: string) => void) => () => void;
  onSaveTitle?: (title: string) => Promise<void>;
  debounceMs?: number;
}

interface TitleManagerState {
  title: string;
  isSaving: boolean;
  lastSavedTitle: string;
  isInitialized: boolean;
}

export function useTitleManager(config: TitleManagerConfig) {
  const {
    documentId,
    getTitle,
    setTitle,
    onTitleChange,
    onSaveTitle,
    debounceMs = 1500
  } = config;

  const [state, setState] = useState<TitleManagerState>({
    title: '',
    isSaving: false,
    lastSavedTitle: '',
    isInitialized: false
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const initializationLockRef = useRef<boolean>(false);

  // Centralized title update function with deduplication
  const updateTitle = useCallback((newTitle: string, source: string) => {
    if (initializationLockRef.current) {
      console.log(`🔒 Title update from ${source} blocked during initialization:`, newTitle);
      return;
    }

    const cleanTitle = deduplicateTitle(newTitle) || 'Untitled Document';
    console.log(`📝 Title update from ${source}:`, { original: newTitle, clean: cleanTitle });

    setState(prev => {
      // Only update if title actually changed
      if (prev.title === cleanTitle) {
        return prev;
      }

      return {
        ...prev,
        title: cleanTitle
      };
    });

    // Update Yjs if available and title is different
    if (setTitle && cleanTitle !== getTitle?.()) {
      console.log('🔄 Syncing title to Yjs:', cleanTitle);
      setTitle(cleanTitle);
    }
  }, [setTitle, getTitle]);

  // Initialize title from API data (highest priority)
  const initializeFromAPI = useCallback((apiTitle: string) => {
    if (state.isInitialized) {
      console.log('⚠️ Title already initialized, ignoring API update');
      return;
    }

    console.log('🚀 Initializing title from API:', apiTitle);
    initializationLockRef.current = true;

    const cleanTitle = deduplicateTitle(apiTitle) || 'Untitled Document';
    
    setState({
      title: cleanTitle,
      isSaving: false,
      lastSavedTitle: cleanTitle,
      isInitialized: true
    });

    // Set initial Yjs title if needed
    const currentYjsTitle = getTitle?.();
    if (setTitle && currentYjsTitle !== cleanTitle) {
      console.log('🔄 Setting initial Yjs title:', cleanTitle);
      setTitle(cleanTitle);
    }

    // Release initialization lock after a brief delay
    setTimeout(() => {
      initializationLockRef.current = false;
      console.log('🔓 Title initialization lock released');
    }, 1000);
  }, [state.isInitialized, getTitle, setTitle]);

  // Handle local title changes (user input)
  const handleTitleChange = useCallback((newTitle: string) => {
    updateTitle(newTitle, 'user-input');

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (onSaveTitle && newTitle !== state.lastSavedTitle) {
        console.log('💾 Auto-saving title:', newTitle);
        setState(prev => ({ ...prev, isSaving: true }));
        
        onSaveTitle(newTitle)
          .then(() => {
            setState(prev => ({ 
              ...prev, 
              isSaving: false, 
              lastSavedTitle: newTitle 
            }));
            console.log('✅ Title saved successfully');
          })
          .catch((error) => {
            setState(prev => ({ ...prev, isSaving: false }));
            console.error('❌ Title save failed:', error);
          });
      }
    }, debounceMs);
  }, [updateTitle, onSaveTitle, state.lastSavedTitle, debounceMs]);

  // Handle immediate title save (e.g., on blur)
  const handleTitleSave = useCallback(async (title: string) => {
    if (!onSaveTitle || title === state.lastSavedTitle) return;

    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    console.log('💾 Immediate title save:', title);
    setState(prev => ({ ...prev, isSaving: true }));

    try {
      await onSaveTitle(title);
      setState(prev => ({ 
        ...prev, 
        isSaving: false, 
        lastSavedTitle: title 
      }));
      console.log('✅ Title saved immediately');
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      console.error('❌ Immediate title save failed:', error);
    }
  }, [onSaveTitle, state.lastSavedTitle]);

  // Listen for collaborative title changes (lowest priority)
  useEffect(() => {
    if (!onTitleChange || !state.isInitialized) return;

    console.log('👂 Setting up collaborative title listener');
    
    const cleanup = onTitleChange((collaborativeTitle: string) => {
      // Only accept collaborative changes if they're different from current
      if (collaborativeTitle && collaborativeTitle !== state.title) {
        console.log('📨 Received collaborative title change:', collaborativeTitle);
        updateTitle(collaborativeTitle, 'collaborative');
      }
    });

    return cleanup;
  }, [onTitleChange, state.isInitialized, state.title, updateTitle]);

  // Update browser tab title
  useEffect(() => {
    const displayTitle = state.title || 'Untitled Document';
    document.title = `${displayTitle} - Obsidian Comments`;
  }, [state.title]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    title: state.title,
    isSaving: state.isSaving,
    isInitialized: state.isInitialized,
    initializeFromAPI,
    handleTitleChange,
    handleTitleSave
  };
}