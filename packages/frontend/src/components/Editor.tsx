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
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-screen p-4',
      },
    },
  }, [provider]);


  const handleAddComment = (comment: {
    content: string;
    author: string;
    position: { from: number; to: number } | null;
    threadId: string | null;
  }) => {
    addComment({
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...comment,
    });
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Collaborative Editor</h1>
        <div className="flex items-center gap-4">
          <UserPresence users={users} />
          <ConnectionStatus status={status} />
        </div>
      </div>
      
      <div className="flex-1 flex">
        <div className="flex-1 overflow-auto">
          <EditorContent editor={editor} />
        </div>
        
        <CommentPanel
          comments={comments}
          currentUser={currentUser}
          onAddComment={handleAddComment}
          onResolveComment={resolveComment}
          onDeleteComment={deleteComment}
        />
      </div>
    </div>
  );
}

function generatePastelColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}