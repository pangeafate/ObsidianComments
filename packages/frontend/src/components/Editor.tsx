import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useCollaboration } from '../hooks/useCollaboration';
import { useComments } from '../hooks/useComments';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { CommentPanel } from './CommentPanel';
import { TrackChanges } from '../extensions/TrackChanges';
import { CommentHighlight } from '../extensions/CommentHighlight';
import { TrackChangesToolbar } from './TrackChangesToolbar';

interface EditorProps {
  documentId: string;
}

export function Editor({ documentId }: EditorProps) {
  const { provider, ydoc, setUser, users, status } = useCollaboration(documentId);
  const { comments, addComment, resolveComment, deleteComment } = useComments(ydoc);

  // Set a random user on mount
  const [currentUser] = useState(() => `User ${Math.random().toString(36).substring(7)}`);
  
  useEffect(() => {
    setUser({
      name: currentUser,
      color: generatePastelColor(),
    });
  }, [setUser, currentUser]);

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
      handleTextInput: (view, from, to, text) => {
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
  }, [provider, currentUser]);


  const handleAddComment = (comment: {
    content: string;
    author: string;
    position: { from: number; to: number } | null;
    threadId: string | null;
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

  // Handle adding comment to current selection
  const handleAddCommentToSelection = () => {
    if (!editor) return;
    
    const { from, to } = editor.state.selection;
    if (from === to) return; // No selection
    
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    
    // Trigger comment panel to show add comment form with pre-filled position
    handleAddComment({
      content: `Comment on: "${selectedText}"`,
      author: currentUser,
      position: { from, to },
      threadId: null,
    });
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
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Collaborative Editor</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddCommentToSelection}
            className="px-3 py-1 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-colors"
            disabled={!editor || editor.state.selection.from === editor.state.selection.to}
          >
            💬 Comment
          </button>
          <UserPresence users={users} />
          <ConnectionStatus status={status} />
        </div>
      </div>

      {/* Track Changes Toolbar */}
      {editor && <TrackChangesToolbar editor={editor} />}
      
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>
        
        <CommentPanel
          comments={comments}
          currentUser={currentUser}
          onAddComment={handleAddComment}
          onResolveComment={resolveComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>
    </div>
  );
}

function generatePastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}