import { useEffect, useState, useCallback } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export interface User {
  name: string;
  color: string;
}

export interface UseCollaborationReturn {
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc;
  users: User[];
  status: 'connecting' | 'connected' | 'disconnected';
  setUser: (user: User) => void;
  reconnect: () => void;
  getContent: () => string;
}

export function useCollaboration(documentId: string): UseCollaborationReturn {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const hocuspocusProvider = new HocuspocusProvider({
      url: import.meta.env.VITE_WS_URL || 'ws://localhost:8082',
      name: documentId,
      document: ydoc,
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
    };
  }, [documentId, ydoc]);

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
    const text = ydoc.getText('content');
    return text.toString();
  }, [ydoc]);

  return {
    provider,
    ydoc,
    users,
    status,
    setUser,
    reconnect,
    getContent,
  };
}