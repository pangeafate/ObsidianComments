import { pool } from '../connection';

export interface NoteData {
  id?: number;
  shareId: string;
  content: string;
  creatorName?: string;
  lastEditorName?: string;
  editCount?: number;
  lastChangeSummary?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  isActive?: boolean;
}

export interface Comment {
  id: number;
  shareId: string;
  contributorName: string;
  content: string;
  lineNumber?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class NoteModel {
  // Create a new shared note
  static async create(noteData: Omit<NoteData, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isActive'>): Promise<NoteData> {
    const contributorName = noteData.creatorName || 'Anonymous';
    
    const query = `
      INSERT INTO shares (share_id, content, creator_name, last_editor_name, edit_count)
      VALUES ($1, $2, $3, $4, 0)
      RETURNING *
    `;
    
    const values = [noteData.shareId, noteData.content, contributorName, contributorName];
    
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      
      // Create initial version entry
      await this.createVersionEntry(noteData.shareId, noteData.content, contributorName, 'Initial version', 1);
      
      return {
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        creatorName: row.creator_name,
        lastEditorName: row.last_editor_name,
        editCount: row.edit_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error creating note:', error);
      throw new Error('Failed to create shared note');
    }
  }

  // Get a shared note by shareId
  static async getByShareId(shareId: string): Promise<NoteData | null> {
    const query = `
      SELECT * FROM shares 
      WHERE share_id = $1 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [shareId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        creatorName: row.creator_name,
        lastEditorName: row.last_editor_name,
        editCount: row.edit_count,
        lastChangeSummary: row.last_change_summary,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error fetching note:', error);
      throw new Error('Failed to fetch shared note');
    }
  }

  // Update a shared note with contributor tracking
  static async update(shareId: string, content: string, contributorName?: string, changeSummary?: string): Promise<NoteData> {
    const editorName = contributorName || 'Anonymous';
    
    const query = `
      UPDATE shares 
      SET content = $1, 
          last_editor_name = $2,
          last_change_summary = $3,
          edit_count = edit_count + 1,
          version = version + 1, 
          updated_at = CURRENT_TIMESTAMP
      WHERE share_id = $4 AND is_active = true
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [content, editorName, changeSummary, shareId]);
      
      if (result.rows.length === 0) {
        throw new Error('Note not found');
      }
      
      const row = result.rows[0];
      
      // Create version entry for this update
      await this.createVersionEntry(shareId, content, editorName, changeSummary, row.version);
      
      return {
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        creatorName: row.creator_name,
        lastEditorName: row.last_editor_name,
        editCount: row.edit_count,
        lastChangeSummary: row.last_change_summary,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error updating note:', error);
      if (error instanceof Error && error.message === 'Note not found') {
        throw error;
      }
      throw new Error('Failed to update shared note');
    }
  }

  // Create version history entry
  static async createVersionEntry(shareId: string, content: string, contributorName: string, changeSummary?: string, versionNumber?: number): Promise<void> {
    // Get the current max version if not provided
    if (!versionNumber) {
      const versionQuery = `
        SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
        FROM note_versions
        WHERE share_id = $1
      `;
      const versionResult = await pool.query(versionQuery, [shareId]);
      versionNumber = versionResult.rows[0].next_version;
    }

    const query = `
      INSERT INTO note_versions (share_id, content, contributor_name, change_summary, version_number)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    try {
      await pool.query(query, [shareId, content, contributorName, changeSummary || null, versionNumber]);
    } catch (error) {
      console.error('Error creating version entry:', error);
      // Don't throw - version history is optional
    }
  }

  // Notes are never deleted in the new system - they persist with full history
  // Legacy delete method kept for backward compatibility but doesn't actually delete
  static async delete(shareId: string, contributorName?: string): Promise<boolean> {
    // In the new system, we don't delete notes, just return true for compatibility
    console.log(`Delete requested for ${shareId} by ${contributorName || 'Anonymous'} - ignored in anonymous system`);
    return true;
  }

  // Get recent notes (replaces getByOwner since there are no owners)
  static async getRecentNotes(limit: number = 50): Promise<NoteData[]> {
    const query = `
      SELECT * FROM shares 
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT $1
    `;
    
    try {
      const result = await pool.query(query, [limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        creatorName: row.creator_name,
        lastEditorName: row.last_editor_name,
        editCount: row.edit_count,
        lastChangeSummary: row.last_change_summary,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      }));
    } catch (error) {
      console.error('Error fetching recent notes:', error);
      throw new Error('Failed to fetch recent notes');
    }
  }

  // Check if shareId exists
  static async exists(shareId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM shares 
      WHERE share_id = $1 AND is_active = true
      LIMIT 1
    `;
    
    try {
      const result = await pool.query(query, [shareId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking note existence:', error);
      return false;
    }
  }
}