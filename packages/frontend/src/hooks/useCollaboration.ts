import { useEffect, useState, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export interface User {
  name: string;
  color: string;
}

export interface UseCollaborationReturn {
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc | null;
  users: User[];
  status: 'connecting' | 'connected' | 'disconnected';
  setUser: (user: User) => void;
  reconnect: () => void;
  getContent: () => string;
  getTitle: () => string;
  setTitle: (title: string) => void;
  onTitleChange: (callback: (title: string) => void) => () => void;
}

export function useCollaboration(documentId: string): UseCollaborationReturn {
  // Initialize with null to avoid creating Y.Doc in useState (prevents race conditions)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // Create Y.Doc only once per documentId to prevent "Type already defined" errors
    const newYdoc = new Y.Doc();
    // Initialize the content field as XmlFragment for TipTap compatibility
    newYdoc.getXmlFragment('content');
    // Initialize shared title as Y.Text for collaborative title editing
    newYdoc.getText('title');
    setYdoc(newYdoc);
    
    const hocuspocusProvider = new HocuspocusProvider({
      url: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`,
      name: documentId,
      document: newYdoc,
      token: 'collaboration-token', // Simple token for authentication
      onAuthenticated: () => {
        console.log('✅ Hocuspocus authentication successful');
      },
      onAuthenticationFailed: ({ reason }) => {
        console.error('❌ Hocuspocus authentication failed:', reason);
      },
    });

    setProvider(hocuspocusProvider);

    // Handle status changes
    const handleStatusChange = (event: { status: string }) => {
      setStatus(event.status as 'connecting' | 'connected' | 'disconnected');
    };

    hocuspocusProvider.on('status', handleStatusChange);

    // Handle awareness changes (user presence)
    const handleAwarenessChange = () => {
      const states = hocuspocusProvider.awareness.getStates();
      const connectedUsers: User[] = [];

      states.forEach((state) => {
        if (state.user) {
          connectedUsers.push({
            name: state.user.name,
            color: state.user.color,
          });
        }
      });

      setUsers(connectedUsers);
    };

    hocuspocusProvider.awareness.on('change', handleAwarenessChange);

    return () => {
      hocuspocusProvider.off('status', handleStatusChange);
      hocuspocusProvider.awareness.off('change', handleAwarenessChange);
      hocuspocusProvider.destroy();
      newYdoc.destroy();
    };
  }, [documentId]); // Only depend on documentId, not ydoc

  const setUser = useCallback((user: User) => {
    if (provider) {
      provider.awareness.setLocalStateField('user', user);
    }
  }, [provider]);

  const reconnect = useCallback(() => {
    if (provider) {
      provider.connect();
    }
  }, [provider]);

  const getContent = useCallback(() => {
    if (!ydoc) return '';
    const xmlFragment = ydoc.getXmlFragment('content');
    // Convert XmlFragment to text representation
    return xmlFragment.toString();
  }, [ydoc]);

  const getTitle = useCallback(() => {
    if (!ydoc) return '';
    const titleText = ydoc.getText('title');
    return titleText.toString();
  }, [ydoc]);

  const setTitle = useCallback((title: string) => {
    if (!ydoc) return;
    const titleText = ydoc.getText('title');
    // Replace entire title content
    titleText.delete(0, titleText.length);
    titleText.insert(0, title);
  }, [ydoc]);

  const onTitleChange = useCallback((callback: (title: string) => void) => {
    if (!ydoc) return () => {};
    
    const titleText = ydoc.getText('title');
    const handleTitleChange = () => {
      callback(titleText.toString());
    };

    titleText.observe(handleTitleChange);
    
    // Return cleanup function
    return () => {
      titleText.unobserve(handleTitleChange);
    };
  }, [ydoc]);

  return {
    provider,
    ydoc,
    users,
    status,
    setUser,
    reconnect,
    getContent,
    getTitle,
    setTitle,
    onTitleChange,
  };
}