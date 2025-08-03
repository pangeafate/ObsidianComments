import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';

export interface Version {
  id: string;
  message: string;
  author: string;
  timestamp: Date;
  content: string;
  snapshot: Uint8Array;
}

export interface VersionDiff {
  from: { content: string; message: string };
  to: { content: string; message: string };
  changes: Array<{
    type: 'insert' | 'delete' | 'retain';
    text?: string;
    length?: number;
  }>;
}

export interface UseVersionHistoryOptions {
  autoSnapshotInterval?: number; // milliseconds
  maxVersions?: number;
}

export interface UseVersionHistoryReturn {
  versions: Version[];
  currentVersion: Version | null;
  createSnapshot: (message: string, author: string) => void;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  getVersionDiff: (fromId: string, toId: string) => VersionDiff | null;
}

export function useVersionHistory(
  ydoc: Y.Doc,
  documentId: string,
  options: UseVersionHistoryOptions = {}
): UseVersionHistoryReturn {
  const { autoSnapshotInterval, maxVersions = 50 } = options;
  
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const versionsMap = ydoc.getMap('versions');
  const lastAutoSnapshot = useRef<number>(0);

  // Sync versions from Yjs map
  useEffect(() => {
    const updateVersions = () => {
      const versionsList: Version[] = [];
      versionsMap.forEach((versionData) => {
        const version: Version = {
          ...versionData,
          timestamp: new Date(versionData.timestamp),
          snapshot: new Uint8Array(versionData.snapshot),
        };
        versionsList.push(version);
      });
      
      // Sort by timestamp
      versionsList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setVersions(versionsList);
    };

    updateVersions();
    versionsMap.observe(updateVersions);

    return () => {
      versionsMap.unobserve(updateVersions);
    };
  }, [versionsMap]);

  // Auto-snapshot functionality
  useEffect(() => {
    if (!autoSnapshotInterval) return;

    const handleDocChange = () => {
      const now = Date.now();
      if (now - lastAutoSnapshot.current >= autoSnapshotInterval) {
        createSnapshot('Auto-save', 'System');
        lastAutoSnapshot.current = now;
      }
    };

    ydoc.on('update', handleDocChange);

    return () => {
      ydoc.off('update', handleDocChange);
    };
  }, [autoSnapshotInterval, ydoc]);

  const createSnapshot = useCallback((message: string, author: string) => {
    const text = ydoc.getText('content');
    const content = text.toString();
    const snapshot = Y.encodeStateAsUpdate(ydoc);
    
    const version: Version = {
      id: `version-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      message,
      author,
      timestamp: new Date(),
      content,
      snapshot,
    };

    ydoc.transact(() => {
      versionsMap.set(version.id, {
        ...version,
        timestamp: version.timestamp.toISOString(),
        snapshot: Array.from(snapshot), // Convert Uint8Array to array for Yjs storage
      });

      // Limit version history size after adding new version
      const currentVersions = Array.from(versionsMap.keys())
        .map(id => versionsMap.get(id))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      if (currentVersions.length > maxVersions) {
        // Remove oldest versions to keep only maxVersions
        const toDelete = currentVersions.slice(0, currentVersions.length - maxVersions);
        toDelete.forEach(version => {
          versionsMap.delete(version.id);
        });
      }
    });

    setCurrentVersion(version);
  }, [ydoc, versionsMap, versions.length, maxVersions]);

  const restoreVersion = useCallback((versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    ydoc.transact(() => {
      // Create a new document from the snapshot
      const tempDoc = new Y.Doc();
      Y.applyUpdate(tempDoc, version.snapshot);
      
      // Get the content from the snapshot
      const snapshotText = tempDoc.getText('content');
      const restoredContent = snapshotText.toString();
      
      // Replace current document content
      const currentText = ydoc.getText('content');
      currentText.delete(0, currentText.length);
      currentText.insert(0, restoredContent);
      
      tempDoc.destroy();
    });

    setCurrentVersion(version);
  }, [ydoc, versions]);

  const deleteVersion = useCallback((versionId: string) => {
    ydoc.transact(() => {
      versionsMap.delete(versionId);
    });

    if (currentVersion?.id === versionId) {
      setCurrentVersion(null);
    }
  }, [ydoc, versionsMap, currentVersion]);

  const getVersionDiff = useCallback((fromId: string, toId: string): VersionDiff | null => {
    const fromVersion = versions.find(v => v.id === fromId);
    const toVersion = versions.find(v => v.id === toId);
    
    if (!fromVersion || !toVersion) return null;

    // Simple diff implementation
    const changes = diffStrings(fromVersion.content, toVersion.content);

    return {
      from: { 
        content: fromVersion.content, 
        message: fromVersion.message 
      },
      to: { 
        content: toVersion.content, 
        message: toVersion.message 
      },
      changes,
    };
  }, [versions]);

  return {
    versions,
    currentVersion,
    createSnapshot,
    restoreVersion,
    deleteVersion,
    getVersionDiff,
  };
}

// Simple string diff implementation
function diffStrings(from: string, to: string) {
  const changes: Array<{
    type: 'insert' | 'delete' | 'retain';
    text?: string;
    length?: number;
  }> = [];

  let i = 0;
  let j = 0;

  while (i < from.length || j < to.length) {
    if (i < from.length && j < to.length && from[i] === to[j]) {
      // Characters match, retain
      let retainLength = 0;
      while (i < from.length && j < to.length && from[i] === to[j]) {
        retainLength++;
        i++;
        j++;
      }
      changes.push({ type: 'retain', length: retainLength });
    } else if (j < to.length) {
      // Character in 'to' but not in 'from', insert
      let insertText = '';
      while (j < to.length && (i >= from.length || from[i] !== to[j])) {
        insertText += to[j];
        j++;
      }
      changes.push({ type: 'insert', text: insertText });
    } else {
      // Character in 'from' but not in 'to', delete
      let deleteLength = 0;
      while (i < from.length && (j >= to.length || from[i] !== to[j])) {
        deleteLength++;
        i++;
      }
      changes.push({ type: 'delete', length: deleteLength });
    }
  }

  return changes;
}