import { pool } from '../connection';

export interface NoteData {
  id?: number;
  shareId: string;
  content: string;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  version?: number;
  isActive?: boolean;
}

export interface Comment {
  id: number;
  shareId: string;
  userId: number;
  content: string;
  lineNumber?: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export class NoteModel {
  // Create a new shared note
  static async create(noteData: Omit<NoteData, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'isActive'>): Promise<NoteData> {
    const query = `
      INSERT INTO shares (share_id, content, owner_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [noteData.shareId, noteData.content, noteData.ownerId || null];
    
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      
      return {
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        ownerId: row.owner_id,
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
        ownerId: row.owner_id,
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

  // Update a shared note
  static async update(shareId: string, content: string, ownerId?: string): Promise<NoteData> {
    const query = `
      UPDATE shares 
      SET content = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE share_id = $2 AND (owner_id = $3 OR owner_id IS NULL) AND is_active = true
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [content, shareId, ownerId || null]);
      
      if (result.rows.length === 0) {
        throw new Error('Note not found or access denied');
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error updating note:', error);
      if (error instanceof Error && error.message === 'Note not found or access denied') {
        throw error;
      }
      throw new Error('Failed to update shared note');
    }
  }

  // Delete (soft delete) a shared note
  static async delete(shareId: string, ownerId?: string): Promise<boolean> {
    const query = `
      UPDATE shares 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE share_id = $1 AND (owner_id = $2 OR owner_id IS NULL) AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [shareId, ownerId || null]);
      return result.rowCount! > 0;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw new Error('Failed to delete shared note');
    }
  }

  // Get notes by owner
  static async getByOwner(ownerId: string): Promise<NoteData[]> {
    const query = `
      SELECT * FROM shares 
      WHERE owner_id = $1 AND is_active = true
      ORDER BY updated_at DESC
    `;
    
    try {
      const result = await pool.query(query, [ownerId]);
      
      return result.rows.map(row => ({
        id: row.id,
        shareId: row.share_id,
        content: row.content,
        ownerId: row.owner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        version: row.version,
        isActive: row.is_active
      }));
    } catch (error) {
      console.error('Error fetching user notes:', error);
      throw new Error('Failed to fetch user notes');
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