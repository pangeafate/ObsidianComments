import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useNavigate } from 'react-router-dom';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCollaboration } from '../hooks/useCollaboration';
import { useComments } from '../hooks/useComments';
import { useLinkTracking } from '../hooks/useLinkTracking';
import { useTitleManager } from '../hooks/useTitleManager';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { EnhancedCommentPanel } from './EnhancedCommentPanel';
import { UserNamePopup } from './UserNamePopup';
import { MyLinksPane, MyLinksPaneRef } from './MyLinksPane';
import { NewNoteButton } from './NewNoteButton';
import { EditableTitle } from './EditableTitle';
import { TrackChanges } from '../extensions/TrackChanges';
import { CommentHighlight } from '../extensions/CommentHighlight';
import { TrackChangesToolbar } from './TrackChangesToolbar';
import { documentService, DocumentData } from '../services/documentService';
import { extendedDocumentService } from '../services/documentServiceExtensions';
import { markdownToProseMirror } from '../utils/markdownConverter';
import { stripTrackChangesMarkup } from '../utils/contentSanitizer';
import { initializeContentSafely, deduplicateContent } from '../utils/contentDeduplication';
import { pickInitialContent } from '../utils/contentSource';
import { generateUserColor } from '../utils/userColors';

interface EditorProps {
  documentId: string;
}

export function Editor({ documentId }: EditorProps) {
  const navigate = useNavigate();
  const { 
    provider, 
    ydoc, 
    setUser, 
    users, 
    status, 
    synced,
    isInitialSyncComplete,
    getTitle, 
    setTitle, 
    onTitleChange 
  } = useCollaboration(documentId);
  const { comments, addComment, resolveComment, deleteComment } = useComments(ydoc || null);
  
  // Refs
  const myLinksPaneRef = useRef<MyLinksPaneRef>(null);
  
  // User name and color state
  const [currentUser, setCurrentUser] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('');
  
  // Pane states
  const [isCommentsPaneOpen, setIsCommentsPaneOpen] = useState<boolean>(false);
  const [isMyLinksPaneOpen, setIsMyLinksPaneOpen] = useState<boolean>(false);

  // Obsidian document state
  const [obsidianDocument, setObsidianDocument] = useState<DocumentData | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState<boolean>(true);
  
  // Centralized title management
  const titleManager = useTitleManager({
    documentId,
    getTitle,
    setTitle,
    onTitleChange,
    onSaveTitle: async (title: string) => {
      await extendedDocumentService.saveTitle(documentId, title);
    },
    debounceMs: 1500
  });
  
  // Track this document in user's links with dynamic title
  useLinkTracking(documentId, titleManager.title);
  
  // Auto-save state
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [justCreatedDocument, setJustCreatedDocument] = useState<boolean>(false);

  // Check if document exists in API (created via Obsidian plugin)
  useEffect(() => {
    async function checkAndLoadDocument() {
      try {
        setIsLoadingDocument(true);
        const exists = await documentService.checkDocumentExists(documentId);
        
        if (exists) {
          const document = await documentService.loadDocument(documentId);
          setObsidianDocument(document);
          const apiTitle = document.title || 'Untitled Document';
          console.log('✅ Loaded existing document from database:', apiTitle);
          
          // Initialize title through centralized manager
          titleManager.initializeFromAPI(apiTitle);
        } else {
          // Document doesn't exist - create it immediately with default content
          console.log('📝 Document not found, creating new document in database:', documentId);
          
          const defaultTitle = 'Untitled Document';
          const defaultContent = `Start typing here...`; // No H1 - title displayed separately
          
          const newDocument = await extendedDocumentService.createDocument(
            documentId,
            defaultTitle,
            defaultContent
          );
          
          setObsidianDocument(newDocument);
          setJustCreatedDocument(true); // Flag to prevent content overwrite on refresh
          console.log('✅ New document created in database with default content:', newDocument.title);
          
          // Initialize title through centralized manager
          titleManager.initializeFromAPI(newDocument.title);
          
          // Clear the flag after a delay to allow normal initialization later
          setTimeout(() => setJustCreatedDocument(false), 5000);
        }
      } catch (error) {
        console.error('Failed to load document from API:', error);
        // Fallback to regular collaboration
        setObsidianDocument(null);
      } finally {
        setIsLoadingDocument(false);
      }
    }

    checkAndLoadDocument();
  }, [documentId]);
  
  useEffect(() => {
    if (currentUser) {
      // Generate consistent color based on user name to match track changes
      const color = userColor || generateUserColor(currentUser);
      if (!userColor) {
        setUserColor(color);
      }
      
      setUser({
        name: currentUser,
        color: color,
      });
    }
  }, [setUser, currentUser, userColor]);

  // Title management is now handled by useTitleManager hook


  const handleNameSet = (name: string) => {
    setCurrentUser(name);
  };

  // Handle title changes from EditableTitle component
  const handleTitleChange = useCallback((newTitle: string) => {
    titleManager.handleTitleChange(newTitle);
  }, [titleManager.handleTitleChange]);

  // Handle immediate title save (e.g., on blur or Enter key)
  const handleTitleSave = useCallback(async (title: string): Promise<void> => {
    await titleManager.handleTitleSave(title);
  }, [titleManager.handleTitleSave]);

  const toggleCommentsPane = () => {
    setIsCommentsPaneOpen(!isCommentsPaneOpen);
    // Close other panes
    if (!isCommentsPaneOpen) {
      setIsMyLinksPaneOpen(false);
    }
  };

  const toggleMyLinksPane = () => {
    const wasOpen = isMyLinksPaneOpen;
    setIsMyLinksPaneOpen(!wasOpen);
    
    // Close other panes when opening
    if (!wasOpen) {
      setIsCommentsPaneOpen(false);
      // Refresh links when opening the pane
      console.log('🔄 Opening My Links pane, refreshing data...');
      myLinksPaneRef.current?.refreshLinks();
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      ...(ydoc ? [Collaboration.configure({
        document: ydoc,
        field: 'content',
      })] : []),
      ...(provider ? [CollaborationCursor.configure({
        provider: provider,
        user: currentUser ? {
          name: currentUser,
          color: userColor || generateUserColor(currentUser),
        } : undefined,
      })] : []),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TrackChanges.configure({
        userId: currentUser,
        userName: currentUser,
        enabled: true,
      }),
      CommentHighlight,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-screen p-4 bg-gray-100',
      },
      handleTextInput: (_view, from, _to, text) => {
        // Auto-apply track changes to new text input
        // Note: Removed editor self-reference to fix initialization error
        // Track changes will be handled by the extension automatically
        return false;
      },
    },
  }, [provider, currentUser, userColor, ydoc]);

  // Initialize editor with safe content deduplication - FIXED: Wait for Yjs sync completion
  useEffect(() => {
    if (editor && obsidianDocument && !isLoadingDocument && ydoc && synced && isInitialSyncComplete) {
      const yXmlFragment = ydoc.getXmlFragment('content');
      const yjsContent = editor.getHTML();
      
      console.log('🛡️ Starting safe content initialization');
      console.log('Yjs fragment length:', yXmlFragment.length);
      console.log('Yjs fragment toString():', yXmlFragment.toString());
      console.log('Current editor content length:', yjsContent.length);
      console.log('Current editor HTML:', yjsContent);
      console.log('API content length:', obsidianDocument.content.length);
      console.log('API content preview:', obsidianDocument.content.substring(0, 100) + '...');
      console.log('Sync status - synced:', synced, 'isInitialSyncComplete:', isInitialSyncComplete);
      
      // ENHANCED: Check both Yjs fragment length AND if editor appears empty
      // Sometimes Yjs has structure but no actual content
      const yjsFragmentIsEmpty = yXmlFragment.length === 0;
      const editorContentIsEmpty = !yjsContent || yjsContent.replace(/<[^>]*>/g, '').trim().length === 0;
      const shouldLoadContent = (yjsFragmentIsEmpty || editorContentIsEmpty) && !justCreatedDocument;
      
      console.log('🔍 Enhanced content loading decision:');
      console.log('   - Yjs fragment empty?', yjsFragmentIsEmpty);
      console.log('   - Editor content effectively empty?', editorContentIsEmpty);
      console.log('   - Just created document?', justCreatedDocument);
      console.log('   - Should load API content?', shouldLoadContent);
      
      if (shouldLoadContent) {
        const chosen = pickInitialContent(obsidianDocument);
        console.log('📝 Loading API content into editor (editor appears empty) via', chosen.type);
        if (chosen.type === 'html') {
          // Directly set HTML for TipTap, allowing its parser to ingest DOM
          editor.commands.setContent(chosen.content, false, { parseOptions: { preserveWhitespace: 'full' } });
          console.log('✅ HTML content initialization complete');
        } else {
          initializeContentSafely(
            yjsContent,
            obsidianDocument.content,
            (safeContent) => {
              try {
                const proseMirrorDoc = markdownToProseMirror(safeContent);
                editor.commands.setContent(proseMirrorDoc);
                console.log('✅ Markdown content initialization complete');
              } catch (error) {
                console.error('Failed to convert markdown to ProseMirror:', error);
                editor.commands.setContent(safeContent);
              }
            }
          );
        }
      } else {
        console.log('⚠️ Skipping API content loading');
        console.log('   - Editor has content or document was just created');
        console.log('   - Yjs fragment empty?', yjsFragmentIsEmpty);
        console.log('   - Editor content effectively empty?', editorContentIsEmpty);
        console.log('   - Just created?', justCreatedDocument);
      }
    } else if (editor && obsidianDocument && !isLoadingDocument && ydoc && (!synced || !isInitialSyncComplete)) {
      console.log('⏳ Waiting for Yjs sync completion before loading content...');
      console.log('   - synced:', synced, 'isInitialSyncComplete:', isInitialSyncComplete);
    }
  }, [editor, obsidianDocument, isLoadingDocument, ydoc, synced, isInitialSyncComplete, justCreatedDocument]);

  // Fallback content loading when Yjs fails or is delayed
  useEffect(() => {
    if (editor && obsidianDocument && !isLoadingDocument && !ydoc) {
      console.log('🆘 Yjs not available, loading content directly from API');
      
      try {
        const proseMirrorDoc = markdownToProseMirror(obsidianDocument.content);
        editor.commands.setContent(proseMirrorDoc);
        console.log('✅ Direct content loading complete (no Yjs)');
      } catch (error) {
        console.error('Failed to convert markdown to ProseMirror:', error);
        editor.commands.setContent(obsidianDocument.content);
      }
    }
  }, [editor, obsidianDocument, isLoadingDocument, ydoc]);

  // Auto-save function with sanitization and deduplication
  const saveContent = useCallback(async (content: string) => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      console.log('💾 Saving content:', content.length, 'chars');
      
      // First, sanitize track changes markup
      const sanitizedContent = stripTrackChangesMarkup(content);
      console.log('🧹 Content sanitized:', sanitizedContent.length, 'chars');
      
      // Then, deduplicate any duplicated content
      const deduplicatedContent = deduplicateContent(sanitizedContent);
      console.log('🔍 Content deduplicated:', deduplicatedContent.length, 'chars');
      
      // If no document exists in database, create it first
      if (!obsidianDocument) {
        console.log('📝 Creating new document in database:', documentId);
        
        // Use default title for new documents
        const defaultTitle = 'Untitled Document';
        console.log('📝 Using default title:', defaultTitle);
        
        const newDocument = await extendedDocumentService.createDocument(
          documentId,
          defaultTitle,
          deduplicatedContent
        );
        setObsidianDocument(newDocument);
        setJustCreatedDocument(true); // Flag to prevent content overwrite on refresh
        console.log('✅ New document created in database with default title');
        
        // Initialize title through centralized manager
        titleManager.initializeFromAPI(newDocument.title);
        
        // Clear the flag after a delay to allow normal initialization later
        setTimeout(() => setJustCreatedDocument(false), 5000);
      } else {
        // Document exists, update it and potentially update title
        await extendedDocumentService.saveDocument(documentId, deduplicatedContent);
        
        // Title updates are handled manually through EditableTitle component
        // No automatic title extraction from content
        
        console.log('✅ Existing document updated');
      }
      
      setLastSavedContent(deduplicatedContent);
      console.log('✅ Save complete with sanitization and deduplication');
      
    } catch (error) {
      console.error('❌ Failed to save content:', error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, obsidianDocument, isSaving]);

  // Auto-save with debouncing and change detection
  useEffect(() => {
    if (!editor) return;

    let timeoutId: NodeJS.Timeout;
    
    const handleUpdate = () => {
      const currentContent = editor.getHTML();
      
      // Only save if content has actually changed
      if (currentContent !== lastSavedContent && currentContent.trim() !== '') {
        // Clear existing timeout
        clearTimeout(timeoutId);
        
        // Set new timeout for debounced save
        timeoutId = setTimeout(() => {
          console.log('🔄 Content changed, triggering auto-save');
          saveContent(currentContent);
        }, 2000); // 2 second debounce
      }
    };

    // Listen to editor updates
    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
      clearTimeout(timeoutId);
    };
  }, [editor, lastSavedContent, saveContent]);

  // Debug functions for testing (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as any).editorFunctions = {
        stripTrackChangesMarkup,
        getEditorContent: () => editor?.getHTML() || '',
        getLastSavedContent: () => lastSavedContent,
        debugEditor: () => ({
          hasEditor: !!editor,
          hasDocument: !!obsidianDocument,
          isSaving,
          lastSavedLength: lastSavedContent.length
        })
      };
    }
  }, [editor, obsidianDocument, isSaving, lastSavedContent]);


  const handleAddComment = (comment: {
    content: string;
    author: string;
    position: { from: number; to: number } | null;
    threadId: string | null;
    selectedText?: string;
    displayText?: string;
  }) => {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Add comment to the comment system
    addComment({
      id: commentId,
      ...comment,
    });

    // If there's a position (text selection), add highlight to the editor
    if (comment.position && editor) {
      const { from, to } = comment.position;
      editor.commands.setTextSelection({ from, to });
      editor.commands.addCommentHighlight(commentId);
    }
  };


  // Handle removing comment highlight when comment is deleted
  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    
    // Remove highlight from editor
    if (editor) {
      editor.commands.removeCommentHighlight(commentId);
    }
  };

  // Show loading state while checking document
  if (isLoadingDocument) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading document...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <UserNamePopup onNameSet={handleNameSet} />
      
      <div className="border-b bg-white p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <EditableTitle
            title={titleManager.title}
            onTitleChange={handleTitleChange}
            onSave={handleTitleSave}
            placeholder="Untitled Document"
            maxLength={200}
            className="w-full"
          />
          {titleManager.isSaving && (
            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Saving title...
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          {/* Dashboard Section */}
          <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200" data-testid="dashboard-section">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800" data-testid="mode-indicator">
              Edit Mode
            </span>
            <div className="hidden sm:flex items-center gap-3">
              <UserPresence users={users} />
              <ConnectionStatus status={status} />
            </div>
          </div>
          
          {/* Action Buttons Section */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto" data-testid="button-section">
            {/* View Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/view/${documentId}`)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">View</span>
              </button>
            </div>
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isMyLinksPaneOpen 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={toggleMyLinksPane}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <span className="hidden sm:inline">My Links</span>
            </button>
            <NewNoteButton />
            <button
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isCommentsPaneOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={toggleCommentsPane}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span className="hidden sm:inline">Comments</span>
            </button>
          </div>
          {/* Mobile Dashboard Section */}
          <div className="flex sm:hidden items-center gap-2 mt-2 w-full bg-gray-50 rounded-lg border border-gray-200 p-2">
            <UserPresence users={users} />
            <ConnectionStatus status={status} />
          </div>
        </div>
      </div>

      {/* Track Changes Toolbar */}
      {editor && <TrackChangesToolbar editor={editor} />}
      
      <div className="flex-1 flex relative bg-gray-100">
        <div className="flex-1 overflow-auto bg-gray-100">
          <EditorContent editor={editor} />
        </div>
        
        {/* My Links Pane */}
        <div 
          className={`w-80 max-w-full sm:max-w-none border-l bg-gray-50 flex flex-col fixed sm:absolute right-0 top-auto sm:top-0 bottom-0 sm:bottom-auto h-[60vh] sm:h-full transition-transform duration-300 ease-in-out z-20 shadow-lg sm:shadow-none ${
            isMyLinksPaneOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="my-links-pane"
        >
          <MyLinksPane ref={myLinksPaneRef} />
        </div>

        {/* Comments Pane */}
        {editor && (
          <div 
            className={`w-80 max-w-full sm:max-w-none border-l bg-gray-50 flex flex-col fixed sm:absolute right-0 top-auto sm:top-0 bottom-0 sm:bottom-auto h-[60vh] sm:h-full transition-transform duration-300 ease-in-out z-10 shadow-lg sm:shadow-none ${
              isCommentsPaneOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            data-testid="comments-pane"
          >
            <EnhancedCommentPanel
              comments={comments}
              currentUser={currentUser}
              editor={editor}
              onAddComment={handleAddComment}
              onResolveComment={resolveComment}
              onDeleteComment={handleDeleteComment}
            />
          </div>
        )}
      </div>
    </div>
  );
}

