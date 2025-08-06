import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Editor as TipTapEditor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCollaboration } from '../hooks/useCollaboration';
import * as Y from 'yjs';
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
  const editorRef = useRef<any>(null);
  const editorIdRef = useRef(Math.random().toString());
  
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
  const [contentInitialized, setContentInitialized] = useState<boolean>(false);
  const [collaborationReady, setCollaborationReady] = useState<boolean>(false);

  // Check if document exists in API (created via Obsidian plugin)
  useEffect(() => {
    async function checkAndLoadDocument() {
      try {
        setIsLoadingDocument(true);
        setContentInitialized(false); // Reset initialization flag for new document
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
        console.error('Failed to load or create document from API:', error);
        // Fallback to regular collaboration
        setObsidianDocument(null);
      } finally {
        setIsLoadingDocument(false);
      }
    }

    checkAndLoadDocument();
  }, [documentId]);
  
  // CRITICAL FIX: Pre-populate Y.js document with content BEFORE editor creation
  useEffect(() => {
    if (ydoc && obsidianDocument && !isLoadingDocument && !contentInitialized) {
      console.log('🔧 EARLY FIX: Pre-populating Y.js document before editor connects');
      
      const yXmlFragment = ydoc.getXmlFragment('content');
      const isYjsEmpty = yXmlFragment.length === 0;
      const hasApiContent = obsidianDocument.content && obsidianDocument.content.trim().length > 20;
      
      if (isYjsEmpty && hasApiContent && !justCreatedDocument) {
        console.log('📝 Conditions met for Y.js pre-population');
        console.log('   - Y.js empty:', isYjsEmpty);
        console.log('   - Has API content:', hasApiContent);
        console.log('   - Not just created:', !justCreatedDocument);
        
        const success = populateInitialContent(obsidianDocument.content);
        if (success) {
          setContentInitialized(true);
          console.log('✅ Y.js document pre-populated successfully');
        }
      }
    }
  }, [ydoc, obsidianDocument, isLoadingDocument, contentInitialized, justCreatedDocument, populateInitialContent]);
  
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

  // REF-BASED FIX: Create stable editor instance using refs (Hypothesis #1)
  const [editor, setEditor] = useState<any>(null);
  
  // Initialize editor only once using ref to prevent re-initialization
  useEffect(() => {
    if (editorRef.current) {
      console.log('🔄 Editor ref exists, skipping re-initialization');
      return; // Already initialized
    }
    
    console.log(`🔧 REF FIX: Initializing stable editor instance. ID: ${editorIdRef.current}`);
    
    const newEditor = new TipTapEditor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        TrackChanges.configure({
          userId: currentUser || 'anonymous',
          userName: currentUser || 'anonymous',
          enabled: true,
        }),
        CommentHighlight,
        // Don't add Collaboration extensions initially
      ],
      editorProps: {
        attributes: {
          class: 'prose max-w-none focus:outline-none min-h-screen p-4 bg-gray-100',
        },
        handleTextInput: (_view, from, _to, text) => {
          return false;
        },
      },
    });
    
    // Assign unique ID for tracking
    (newEditor as any).__id = editorIdRef.current;
    console.log('🔧 REF FIX: Editor instance created with ID:', (newEditor as any).__id);
    
    editorRef.current = newEditor;
    setEditor(newEditor);
    
    return () => {
      console.log('🔧 REF FIX: Cleaning up editor instance');
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []); // Empty deps array - only initialize once
  
  // Effect to reconfigure editor when collaboration is ready
  useEffect(() => {
    if (!editorRef.current || !collaborationReady || !ydoc || !provider) return;
    
    const currentEditor = editorRef.current;
    console.log(`🔧 REF FIX: Reconfiguring editor with collaboration. ID: ${(currentEditor as any).__id}`);
    
    // Store current content
    const currentContent = currentEditor.getHTML();
    console.log('📄 REF FIX: Storing current content before reconfigure:', currentContent.length, 'chars');
    
    // Create new editor with collaboration extensions
    const newEditor = new TipTapEditor({
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: ydoc,
          field: 'content',
        }),
        ...(currentUser ? [CollaborationCursor.configure({
          provider: provider,
          user: {
            name: currentUser,
            color: userColor || generateUserColor(currentUser),
          },
        })] : []),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        TrackChanges.configure({
          userId: currentUser || 'anonymous',
          userName: currentUser || 'anonymous',
          enabled: true,
        }),
        CommentHighlight,
      ],
      editorProps: {
        attributes: {
          class: 'prose max-w-none focus:outline-none min-h-screen p-4 bg-gray-100',
        },
        handleTextInput: (_view, from, _to, text) => {
          return false;
        },
      },
      content: currentContent, // Preserve content during reconfigure
    });
    
    // Assign same ID for tracking
    (newEditor as any).__id = editorIdRef.current;
    console.log('🔧 REF FIX: Editor reconfigured with collaboration. ID:', (newEditor as any).__id);
    
    // Replace editor
    currentEditor.destroy();
    editorRef.current = newEditor;
    setEditor(newEditor);
    
    console.log('✅ REF FIX: Editor successfully reconfigured with collaboration');
  }, [ydoc, provider, collaborationReady, currentUser, userColor]);
  
  // Debug effect to track editor instance stability
  useEffect(() => {
    if (editor) {
      console.log(`🔍 REF FIX: Editor effect running. ID: ${editorIdRef.current}`);
      (editor as any).__id = editorIdRef.current;
      console.log('🔍 REF FIX: Editor instance ID:', (editor as any).__id);
    }
  }, [editor]);

  // Initialize editor with safe content deduplication (without Collaboration extension)
  useEffect(() => {
    if (editor && obsidianDocument && !isLoadingDocument && !contentInitialized && !collaborationReady) {
      const yjsContent = editor.getHTML();
      
      console.log('🛡️ PHASE 1: Content initialization (no collaboration yet)');
      console.log('Current editor content length:', yjsContent.length);
      console.log('API content length:', obsidianDocument.content.length);
      console.log('Document ID:', documentId);
      console.log('Just created document:', justCreatedDocument);
      console.log('Already initialized:', contentInitialized);
      
      // PHASE 1: Initialize content without Y.js interference
      const shouldInitialize = (!yjsContent || yjsContent.trim().length <= 50) && 
                              obsidianDocument.content && 
                              obsidianDocument.content.trim().length > 0 &&
                              !justCreatedDocument &&
                              !contentInitialized;
      
      if (shouldInitialize) {
        console.log('📝 PHASE 1: Initializing editor with API content');
        console.log('API content to load:', obsidianDocument.content.substring(0, 100) + '...');
        
        // PHASE 1 FIX: Set content directly without Y.js interference
        console.log('🔧 PHASE 1 FIX: Setting content directly in editor (no collaboration extensions)');
        
        initializeContentSafely(
          yjsContent,
          obsidianDocument.content,
          (safeContent) => {
            console.log('📝 PHASE 1: Setting content in collaboration-free editor');
            try {
              // Check if content is HTML or markdown
              const isHTML = safeContent.trim().startsWith('<');
              
              if (isHTML) {
                console.log('📝 Setting HTML content directly');
                editor.commands.setContent(safeContent);
                console.log('✅ PHASE 1: HTML content set successfully');
              } else {
                console.log('📝 Converting markdown content');
                const proseMirrorDoc = markdownToProseMirror(safeContent);
                editor.commands.setContent(proseMirrorDoc);
                console.log('✅ PHASE 1: Markdown content set successfully');
              }
              
              // Mark content as initialized and enable collaboration
              setContentInitialized(true);
              
              // Enable collaboration after content is set
              setTimeout(() => {
                console.log('🔧 PHASE 2: Enabling collaboration extensions');
                setCollaborationReady(true);
              }, 500); // Small delay to ensure content is fully set
              
            } catch (error) {
              console.error('❌ PHASE 1 failed:', error);
              // Fallback
              editor.commands.setContent(safeContent);
              setContentInitialized(true);
              setCollaborationReady(true);
            }
          }
        );
      } else {
        console.log('⚠️ PHASE 1: Skipping content initialization');
        console.log('   Conditions:');
        console.log('   - Editor content empty:', (!yjsContent || yjsContent.trim().length <= 50));
        console.log('   - Has API content:', !!(obsidianDocument.content && obsidianDocument.content.trim().length > 0));
        console.log('   - Not just created:', !justCreatedDocument);
        console.log('   - Not already initialized:', !contentInitialized);
        console.log('   - Should initialize:', shouldInitialize);
        
        // Enable collaboration immediately for documents that don't need content initialization
        if (!collaborationReady) {
          console.log('🔧 PHASE 1: Enabling collaboration (no content to initialize)');
          setCollaborationReady(true);
        }
      }
    } else {
      console.log('⏳ PHASE 1: Waiting for initialization requirements:');
      console.log('   - Editor ready:', !!editor);
      console.log('   - Document loaded:', !!obsidianDocument);
      console.log('   - Not loading:', !isLoadingDocument);
      console.log('   - Not already initialized:', !contentInitialized);
      console.log('   - Not collaboration ready:', !collaborationReady);
    }
  }, [editor, obsidianDocument, isLoadingDocument, justCreatedDocument, documentId, contentInitialized, collaborationReady]);

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
        const currentSmartTitle = extractSmartTitle(deduplicatedContent);
        const titleChanged = currentSmartTitle !== documentTitle && 
          currentSmartTitle !== `New Document ${new Date().toLocaleDateString()}`;
        
        // Save content and title together
        await extendedDocumentService.saveDocument(
          documentId, 
          deduplicatedContent, 
          titleChanged ? currentSmartTitle : undefined
        );
        
        // Update local title state if it changed
        if (titleChanged) {
          console.log('🧠 Title updated from content:', currentSmartTitle);
          setDocumentTitle(currentSmartTitle);
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

  // Update page title when document title changes
  useEffect(() => {
    if (documentTitle && documentTitle !== 'Collaborative Editor') {
      document.title = `${documentTitle} - Obsidian Comments`;
      console.log('📋 Page title updated to:', document.title);
    } else {
      document.title = 'Obsidian Comments';
    }
  }, [documentTitle]);

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

