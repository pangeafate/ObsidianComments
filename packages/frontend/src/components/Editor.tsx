import { useEffect, useState } from 'react';
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
import { MyLinksPane } from './MyLinksPane';
import { NewNoteButton } from './NewNoteButton';
import { TrackChanges } from '../extensions/TrackChanges';
import { CommentHighlight } from '../extensions/CommentHighlight';
import { TrackChangesToolbar } from './TrackChangesToolbar';

interface EditorProps {
  documentId: string;
}

export function Editor({ documentId }: EditorProps) {
  const { provider, ydoc, setUser, users, status } = useCollaboration(documentId);
  const { comments, addComment, resolveComment, deleteComment } = useComments(ydoc);
  
  // Track this document in user's links
  useLinkTracking(documentId);

  // User name and color state
  const [currentUser, setCurrentUser] = useState<string>('');
  const [userColor, setUserColor] = useState<string>('');
  
  // Pane states
  const [isCommentsPaneOpen, setIsCommentsPaneOpen] = useState<boolean>(false);
  const [isMyLinksPaneOpen, setIsMyLinksPaneOpen] = useState<boolean>(false);
  
  useEffect(() => {
    if (currentUser) {
      // Generate color once when user is first set
      const color = userColor || generatePastelColor();
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
    setIsMyLinksPaneOpen(!isMyLinksPaneOpen);
    // Close other panes
    if (!isMyLinksPaneOpen) {
      setIsCommentsPaneOpen(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      Collaboration.configure({
        document: ydoc,
        field: 'content',
      }),
      ...(provider ? [CollaborationCursor.configure({
        provider: provider,
        user: currentUser ? {
          name: currentUser,
          color: userColor || generatePastelColor(),
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
        class: 'prose max-w-none focus:outline-none min-h-screen p-4',
      },
      handleTextInput: (_view, from, _to, text) => {
        // Auto-apply track changes to new text input
        if (editor?.commands) {
          setTimeout(() => {
            editor.commands.setTextSelection({ from, to: from + text.length });
            editor.commands.addTrackChanges();
          }, 0);
        }
        return false;
      },
    },
  }, [provider, currentUser, userColor]);


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

  return (
    <div className="h-screen flex flex-col">
      <UserNamePopup onNameSet={handleNameSet} />
      
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Collaborative Editor</h1>
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
      
      <div className="flex-1 flex relative">
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>
        
        {/* My Links Pane */}
        <div 
          className={`w-80 border-l bg-gray-50 flex flex-col absolute right-0 top-0 h-full transition-transform duration-300 ease-in-out z-20 ${
            isMyLinksPaneOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          data-testid="my-links-pane"
        >
          <MyLinksPane />
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

function generatePastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}