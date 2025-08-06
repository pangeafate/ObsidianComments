import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCollaboration } from '../hooks/useCollaboration';
import { useComments } from '../hooks/useComments';
import { useLinkTracking } from '../hooks/useLinkTracking';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { EnhancedCommentPanel } from './EnhancedCommentPanel';
import { UserNamePopup } from './UserNamePopup';
import { MyLinksPane, MyLinksPaneRef } from './MyLinksPane';
import { NewNoteButton } from './NewNoteButton';
import { TrackChanges } from '../extensions/TrackChanges';
import { CommentHighlight } from '../extensions/CommentHighlight';
import { TrackChangesToolbar } from './TrackChangesToolbar';
import { documentService, DocumentData } from '../services/documentService';
import { extendedDocumentService } from '../services/documentServiceExtensions';
import { markdownToProseMirror } from '../utils/markdownConverter';
import { stripTrackChangesMarkup } from '../utils/contentSanitizer';
import { initializeContentSafely, deduplicateContent } from '../utils/contentDeduplication';
import { extractSmartTitle } from '../utils/smartTitle';
import { generateUserColor } from '../utils/userColors';

interface EditorProps {
  documentId: string;
}

export function Editor({ documentId }: EditorProps) {
  const { provider, ydoc, setUser, users, status, populateInitialContent } = useCollaboration(documentId);
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
  const [documentTitle, setDocumentTitle] = useState<string>('Collaborative Editor');
  
  // Track this document in user's links with dynamic title (AFTER documentTitle is initialized)
  useLinkTracking(documentId, documentTitle);
  
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
          setDocumentTitle(document.title);
          console.log('✅ Loaded existing document from database:', document.title);
        } else {
          // Document doesn't exist - create it immediately with default content
          console.log('📝 Document not found, creating new document in database:', documentId);
          
          const defaultTitle = `New Document ${new Date().toLocaleDateString()}`;
          const defaultContent = `# ${defaultTitle}\n\nStart typing here...`;
          
          const newDocument = await extendedDocumentService.createDocument(
            documentId,
            defaultTitle,
            defaultContent
          );
          
          setObsidianDocument(newDocument);
          setDocumentTitle(newDocument.title);
          setJustCreatedDocument(true); // Flag to prevent content overwrite on refresh
          console.log('✅ New document created in database with default content:', newDocument.title);
          
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


  const handleNameSet = (name: string) => {
    setCurrentUser(name);
  };

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

  // Initialize editor with safe content deduplication
  useEffect(() => {
    if (editor && obsidianDocument && !isLoadingDocument && ydoc) {
      const yXmlFragment = ydoc.getXmlFragment('content');
      const yjsContent = editor.getHTML();
      
      console.log('🛡️ Starting safe content initialization');
      console.log('Yjs fragment length:', yXmlFragment.length);
      console.log('Current editor content length:', yjsContent.length);
      console.log('API content length:', obsidianDocument.content.length);
      
      // RACE CONDITION FIX: Only initialize if Yjs is truly empty AND we didn't just create this document
      // This prevents overwriting content that was just typed but not yet persisted
      if (yXmlFragment.length === 0 && (!yjsContent || yjsContent.trim().length <= 50) && !justCreatedDocument) {
        console.log('📝 Yjs is empty, initializing with API content');
        initializeContentSafely(
          yjsContent,
          obsidianDocument.content,
          (safeContent) => {
            try {
              const proseMirrorDoc = markdownToProseMirror(safeContent);
              editor.commands.setContent(proseMirrorDoc);
              console.log('✅ Safe content initialization complete');
            } catch (error) {
              console.error('Failed to convert markdown to ProseMirror:', error);
              // Fallback to plain text
              editor.commands.setContent(safeContent);
            }
          }
        );
      } else {
        console.log('⚠️ Skipping API initialization - preventing overwrite');
        console.log('   Reasons:');
        console.log('   - Yjs fragment length:', yXmlFragment.length);
        console.log('   - Yjs content length:', yjsContent?.length || 0);
        console.log('   - Just created document:', justCreatedDocument);
        console.log('   This prevents race condition on first refresh after new note creation');
      }
    }
  }, [editor, obsidianDocument, isLoadingDocument, ydoc, justCreatedDocument]);

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
        
        // Extract smart title from content
        const smartTitle = extractSmartTitle(deduplicatedContent);
        console.log('🧠 Smart title extracted:', smartTitle);
        
        const newDocument = await extendedDocumentService.createDocument(
          documentId,
          smartTitle,
          deduplicatedContent
        );
        setObsidianDocument(newDocument);
        setDocumentTitle(newDocument.title);
        setJustCreatedDocument(true); // Flag to prevent content overwrite on refresh
        console.log('✅ New document created in database with smart title');
        
        // Clear the flag after a delay to allow normal initialization later
        setTimeout(() => setJustCreatedDocument(false), 5000);
      } else {
        // Document exists, update it and potentially update title
        await extendedDocumentService.saveDocument(documentId, deduplicatedContent);
        
        // Update title if content has changed significantly
        const currentSmartTitle = extractSmartTitle(deduplicatedContent);
        if (currentSmartTitle !== documentTitle && currentSmartTitle !== `New Document ${new Date().toLocaleDateString()}`) {
          console.log('🧠 Title updated from content:', currentSmartTitle);
          setDocumentTitle(currentSmartTitle);
          // Note: We don't update the title in the database here to avoid too many API calls
          // The title in DB will be updated on next document creation/major save
        }
        
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
      
      <div className="border-b bg-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">{documentTitle}</h1>
        <div className="flex items-center gap-4">
          <UserPresence users={users} />
          <ConnectionStatus status={status} />
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isMyLinksPaneOpen 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={toggleMyLinksPane}
            >
              My Links
            </button>
            <NewNoteButton />
            <button
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                isCommentsPaneOpen 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={toggleCommentsPane}
            >
              Comments
            </button>
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
          className={`w-80 border-l bg-gray-50 flex flex-col absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out z-20 ${
            isMyLinksPaneOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="my-links-pane"
        >
          <MyLinksPane ref={myLinksPaneRef} />
        </div>

        {/* Comments Pane */}
        {editor && (
          <div 
            className={`w-80 border-l bg-gray-50 flex flex-col absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out z-10 ${
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

