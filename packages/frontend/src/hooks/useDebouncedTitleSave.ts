import { useCallback, useRef, useEffect } from 'react';
import { extendedDocumentService } from '../services/documentServiceExtensions';

interface UseDebouncedTitleSaveOptions {
  documentId: string;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveSuccess?: (title: string) => void;
  onSaveError?: (error: Error) => void;
}

export function useDebouncedTitleSave({
  documentId,
  debounceMs = 1500,
  onSaveStart,
  onSaveSuccess,
  onSaveError
}: UseDebouncedTitleSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedTitleRef = useRef<string>('');
  const isSavingRef = useRef<boolean>(false);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedSaveTitle = useCallback(async (title: string) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Don't save if already saving or if title hasn't changed
    if (isSavingRef.current || title === lastSavedTitleRef.current) {
      return;
    }

    // Don't save empty titles
    if (!title.trim()) {
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        isSavingRef.current = true;
        onSaveStart?.();
        
        console.log('💾 Auto-saving title:', title);
        await extendedDocumentService.updateDocumentTitle(documentId, title.trim());
        
        lastSavedTitleRef.current = title.trim();
        onSaveSuccess?.(title.trim());
        console.log('✅ Title auto-save successful');
        
      } catch (error) {
        console.error('❌ Failed to auto-save title:', error);
        onSaveError?.(error instanceof Error ? error : new Error('Failed to save title'));
      } finally {
        isSavingRef.current = false;
      }
    }, debounceMs);
  }, [documentId, debounceMs, onSaveStart, onSaveSuccess, onSaveError]);

  const saveImmediately = useCallback(async (title: string): Promise<void> => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Don't save if already saving or if title hasn't changed
    if (isSavingRef.current || title === lastSavedTitleRef.current) {
      return;
    }

    // Don't save empty titles
    if (!title.trim()) {
      throw new Error('Title cannot be empty');
    }

    try {
      isSavingRef.current = true;
      onSaveStart?.();
      
      console.log('💾 Immediately saving title:', title);
      await extendedDocumentService.updateDocumentTitle(documentId, title.trim());
      
      lastSavedTitleRef.current = title.trim();
      onSaveSuccess?.(title.trim());
      console.log('✅ Title immediate save successful');
      
    } catch (error) {
      console.error('❌ Failed to immediately save title:', error);
      const errorObj = error instanceof Error ? error : new Error('Failed to save title');
      onSaveError?.(errorObj);
      throw errorObj;
    } finally {
      isSavingRef.current = false;
    }
  }, [documentId, onSaveStart, onSaveSuccess, onSaveError]);

  const cancelPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      console.log('🚫 Cancelled pending title save');
    }
  }, []);

  const setLastSavedTitle = useCallback((title: string) => {
    lastSavedTitleRef.current = title;
  }, []);

  return {
    debouncedSaveTitle,
    saveImmediately,
    cancelPendingSave,
    setLastSavedTitle,
    get isSaving() { return isSavingRef.current; },
    get lastSavedTitle() { return lastSavedTitleRef.current; }
  };
}