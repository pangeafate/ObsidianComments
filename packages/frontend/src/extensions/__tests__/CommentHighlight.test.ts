import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { CommentHighlight } from '../CommentHighlight';

describe('CommentHighlight Extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        StarterKit,
        CommentHighlight
      ],
      content: 'This is some test content for commenting.'
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Comment highlighting functionality', () => {
    it('should apply comment highlight to selected text', () => {
      // Select text from position 5 to 15 ("is some")
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      let foundHighlight = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => mark.type.name === 'commentHighlight')) {
          foundHighlight = true;
        }
      });

      expect(foundHighlight).toBe(true);
    });

    it('should store comment ID in highlight attributes', () => {
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-123');
      
      let foundMark = null;
      editor.state.doc.descendants((node) => {
        const commentMark = node.marks.find(mark => mark.type.name === 'commentHighlight');
        if (commentMark) {
          foundMark = commentMark;
        }
      });

      expect(foundMark).toBeTruthy();
      expect(foundMark?.attrs.commentId).toBe('comment-123');
    });

    it('should remove comment highlight by comment ID', () => {
      // Add highlight
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      // Verify it exists
      let hasHighlight = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => 
          mark.type.name === 'commentHighlight' && 
          mark.attrs.commentId === 'comment-1'
        )) {
          hasHighlight = true;
        }
      });
      expect(hasHighlight).toBe(true);

      // Remove highlight
      editor.commands.removeCommentHighlight('comment-1');

      // Verify it's removed
      hasHighlight = false;
      editor.state.doc.descendants((node) => {
        if (node.marks.some(mark => 
          mark.type.name === 'commentHighlight' && 
          mark.attrs.commentId === 'comment-1'
        )) {
          hasHighlight = true;
        }
      });
      expect(hasHighlight).toBe(false);
    });

    it('should support multiple overlapping comment highlights', () => {
      // Add first highlight
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      // Add overlapping highlight
      editor.commands.setTextSelection({ from: 10, to: 20 });
      editor.commands.addCommentHighlight('comment-2');

      const commentIds = new Set();
      editor.state.doc.descendants((node) => {
        node.marks.forEach(mark => {
          if (mark.type.name === 'commentHighlight') {
            commentIds.add(mark.attrs.commentId);
          }
        });
      });

      expect(commentIds.size).toBe(2);
      expect(commentIds.has('comment-1')).toBe(true);
      expect(commentIds.has('comment-2')).toBe(true);
    });

    it('should find comment highlights by position', () => {
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      // Position 10 should be within the highlight
      const commentsAtPosition = editor.storage.commentHighlight.getCommentsAtPosition(10);
      expect(commentsAtPosition).toContain('comment-1');
      
      // Position 20 should not be within the highlight
      const commentsAtPosition20 = editor.storage.commentHighlight.getCommentsAtPosition(20);
      expect(commentsAtPosition20).not.toContain('comment-1');
    });
  });

  describe('Visual styling', () => {
    it('should apply consistent styling to comment highlights', () => {
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      // Check if the highlight has proper CSS classes
      const html = editor.getHTML();
      expect(html).toContain('data-comment-id="comment-1"');
      expect(html).toContain('comment-highlight');
    });

    it('should handle nested comment highlights with different intensities', () => {
      // Add first highlight
      editor.commands.setTextSelection({ from: 5, to: 20 });
      editor.commands.addCommentHighlight('comment-1');
      
      // Add nested highlight
      editor.commands.setTextSelection({ from: 8, to: 12 });
      editor.commands.addCommentHighlight('comment-2');

      const html = editor.getHTML();
      
      // Should contain both comment IDs
      expect(html).toContain('data-comment-id="comment-1"');
      expect(html).toContain('data-comment-id="comment-2"');
    });
  });

  describe('Comment highlight storage', () => {
    it('should provide storage API for comment management', () => {
      expect(editor.storage.commentHighlight).toBeDefined();
      expect(typeof editor.storage.commentHighlight.getCommentsAtPosition).toBe('function');
      expect(typeof editor.storage.commentHighlight.getAllComments).toBe('function');
    });

    it('should return all comment IDs in the document', () => {
      editor.commands.setTextSelection({ from: 5, to: 15 });
      editor.commands.addCommentHighlight('comment-1');
      
      editor.commands.setTextSelection({ from: 20, to: 30 });
      editor.commands.addCommentHighlight('comment-2');

      const allComments = editor.storage.commentHighlight.getAllComments();
      expect(allComments).toHaveLength(2);
      expect(allComments).toContain('comment-1');
      expect(allComments).toContain('comment-2');
    });
  });
});