import { pool } from '../connection';

export interface CommentData {
  id?: number;
  shareId: string;
  contributorName: string;
  content: string;
  positionStart: number;
  positionEnd: number;
  versionNumber: number;
  parentCommentId?: number;
  createdAt?: Date;
  updatedAt?: Date;
  isResolved?: boolean;
  isActive?: boolean;
}

export interface ContributorColor {
  contributorName: string;
  colorHex: string;
  colorName?: string;
}

export interface CommentWithReplies extends CommentData {
  replies: CommentData[];
  contributorColor?: string;
}

export class CommentModel {
  // Create a new comment
  static async create(commentData: Omit<CommentData, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<CommentData> {
    const query = `
      INSERT INTO comments (
        share_id, contributor_name, content, position_start, position_end, 
        version_number, parent_comment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      commentData.shareId,
      commentData.contributorName,
      commentData.content,
      commentData.positionStart,
      commentData.positionEnd,
      commentData.versionNumber,
      commentData.parentCommentId || null
    ];
    
    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];
      
      return {
        id: row.id,
        shareId: row.share_id,
        contributorName: row.contributor_name,
        content: row.content,
        positionStart: row.position_start,
        positionEnd: row.position_end,
        versionNumber: row.version_number,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isResolved: row.is_resolved,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
  }

  // Get all comments for a share with threading and colors
  static async getByShareId(shareId: string): Promise<CommentWithReplies[]> {
    const query = `
      SELECT 
        c.*,
        cc.color_hex as contributor_color
      FROM comments c
      LEFT JOIN contributor_colors cc ON c.contributor_name = cc.contributor_name
      WHERE c.share_id = $1 AND c.is_active = true
      ORDER BY c.position_start ASC, c.created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [shareId]);
      const allComments = result.rows.map(row => ({
        id: row.id,
        shareId: row.share_id,
        contributorName: row.contributor_name,
        content: row.content,
        positionStart: row.position_start,
        positionEnd: row.position_end,
        versionNumber: row.version_number,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isResolved: row.is_resolved,
        isActive: row.is_active,
        contributorColor: row.contributor_color,
        replies: []
      }));

      // Group comments with their replies
      const topLevelComments: CommentWithReplies[] = [];
      const commentMap = new Map<number, CommentWithReplies>();

      // First pass: create map of all comments
      allComments.forEach(comment => {
        commentMap.set(comment.id!, comment);
      });

      // Second pass: organize into threads
      allComments.forEach(comment => {
        if (comment.parentCommentId) {
          // This is a reply
          const parent = commentMap.get(comment.parentCommentId);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          // This is a top-level comment
          topLevelComments.push(comment);
        }
      });

      return topLevelComments;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  }

  // Update a comment
  static async update(commentId: number, content: string, contributorName: string): Promise<CommentData | null> {
    const query = `
      UPDATE comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND contributor_name = $3 AND is_active = true
      RETURNING *
    `;
    
    try {
      const result = await pool.query(query, [content, commentId, contributorName]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        shareId: row.share_id,
        contributorName: row.contributor_name,
        content: row.content,
        positionStart: row.position_start,
        positionEnd: row.position_end,
        versionNumber: row.version_number,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isResolved: row.is_resolved,
        isActive: row.is_active
      };
    } catch (error) {
      console.error('Error updating comment:', error);
      throw new Error('Failed to update comment');
    }
  }

  // Resolve a comment (mark as resolved)
  static async resolve(commentId: number, contributorName: string): Promise<boolean> {
    const query = `
      UPDATE comments 
      SET is_resolved = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND contributor_name = $2 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [commentId, contributorName]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error resolving comment:', error);
      throw new Error('Failed to resolve comment');
    }
  }

  // Delete a comment (mark as inactive)
  static async delete(commentId: number, contributorName: string): Promise<boolean> {
    const query = `
      UPDATE comments 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND contributor_name = $2 AND is_active = true
    `;
    
    try {
      const result = await pool.query(query, [commentId, contributorName]);
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new Error('Failed to delete comment');
    }
  }

  // Get contributor color, creating one if it doesn't exist
  static async getContributorColor(contributorName: string): Promise<ContributorColor> {
    let query = `
      SELECT contributor_name, color_hex, color_name 
      FROM contributor_colors 
      WHERE contributor_name = $1
    `;
    
    try {
      let result = await pool.query(query, [contributorName]);
      
      if (result.rows.length === 0) {
        // Color doesn't exist, trigger creation by inserting a dummy comment (will be rolled back)
        // This triggers the auto-assign color function
        await pool.query('BEGIN');
        
        try {
          await pool.query(`
            INSERT INTO contributor_colors (contributor_name, color_hex) 
            SELECT $1, '#' || lpad(to_hex((hashtext($1) & 16777215) | 12632256), 6, '0')
            WHERE NOT EXISTS (SELECT 1 FROM contributor_colors WHERE contributor_name = $1)
          `, [contributorName]);
          
          await pool.query('COMMIT');
          
          // Now get the color
          result = await pool.query(query, [contributorName]);
        } catch (err) {
          await pool.query('ROLLBACK');
          throw err;
        }
      }

      if (result.rows.length === 0) {
        // Fallback to default color
        return {
          contributorName,
          colorHex: '#E0E0E0',
          colorName: 'Light Gray'
        };
      }

      const row = result.rows[0];
      return {
        contributorName: row.contributor_name,
        colorHex: row.color_hex,
        colorName: row.color_name
      };
    } catch (error) {
      console.error('Error getting contributor color:', error);
      // Return default color on error
      return {
        contributorName,
        colorHex: '#E0E0E0',
        colorName: 'Light Gray'
      };
    }
  }

  // Get all contributor colors for a share
  static async getShareContributorColors(shareId: string): Promise<ContributorColor[]> {
    const query = `
      SELECT DISTINCT cc.contributor_name, cc.color_hex, cc.color_name
      FROM contributor_colors cc
      WHERE cc.contributor_name IN (
        SELECT DISTINCT contributor_name FROM comments WHERE share_id = $1
        UNION
        SELECT DISTINCT creator_name FROM shares WHERE share_id = $1
        UNION  
        SELECT DISTINCT last_editor_name FROM shares WHERE share_id = $1
      )
      ORDER BY cc.contributor_name
    `;
    
    try {
      const result = await pool.query(query, [shareId]);
      return result.rows.map(row => ({
        contributorName: row.contributor_name,
        colorHex: row.color_hex,
        colorName: row.color_name
      }));
    } catch (error) {
      console.error('Error fetching contributor colors:', error);
      return [];
    }
  }

  // Get comments by position range (for finding comments in a text selection)
  static async getByPositionRange(shareId: string, startPos: number, endPos: number): Promise<CommentWithReplies[]> {
    const query = `
      SELECT 
        c.*,
        cc.color_hex as contributor_color
      FROM comments c
      LEFT JOIN contributor_colors cc ON c.contributor_name = cc.contributor_name
      WHERE c.share_id = $1 
        AND c.is_active = true
        AND (
          (c.position_start >= $2 AND c.position_start <= $3) OR
          (c.position_end >= $2 AND c.position_end <= $3) OR  
          (c.position_start <= $2 AND c.position_end >= $3)
        )
      ORDER BY c.position_start ASC, c.created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [shareId, startPos, endPos]);
      const comments = result.rows.map(row => ({
        id: row.id,
        shareId: row.share_id,
        contributorName: row.contributor_name,
        content: row.content,
        positionStart: row.position_start,
        positionEnd: row.position_end,
        versionNumber: row.version_number,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isResolved: row.is_resolved,
        isActive: row.is_active,
        contributorColor: row.contributor_color,
        replies: []
      }));

      return comments;
    } catch (error) {
      console.error('Error fetching comments by position:', error);
      throw new Error('Failed to fetch comments by position');
    }
  }
}