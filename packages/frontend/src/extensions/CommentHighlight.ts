import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentHighlight: {
      /**
       * Add a comment highlight to the current selection
       */
      addCommentHighlight: (commentId: string) => ReturnType;
      /**
       * Remove a comment highlight by comment ID
       */
      removeCommentHighlight: (commentId: string) => ReturnType;
      /**
       * Remove all comment highlights
       */
      removeAllCommentHighlights: () => ReturnType;
    };
  }
}

export const CommentHighlight = Mark.create<CommentHighlightOptions>({
  name: 'commentHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const commentId = mark.attrs.commentId;
    
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-comment-id': commentId,
        class: 'comment-highlight',
        style: `
          background-color: rgba(255, 235, 59, 0.3);
          border-bottom: 2px solid rgba(255, 193, 7, 0.8);
          border-radius: 2px;
          padding: 1px 2px;
          position: relative;
          cursor: pointer;
        `,
        title: `Comment: ${commentId}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      addCommentHighlight:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (!dispatch) return false;

          const { from, to } = state.selection;
          
          // Don't add highlight if no selection
          if (from === to) return false;

          const mark = this.type.create({ commentId });
          dispatch(state.tr.addMark(from, to, mark));
          return true;
        },

      removeCommentHighlight:
        (commentId: string) =>
        ({ state, dispatch }) => {
          if (!dispatch) return false;

          let tr = state.tr;
          let modified = false;

          state.doc.descendants((node, pos) => {
            if (node.isText) {
              node.marks.forEach(mark => {
                if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === commentId) {
                  tr = tr.removeMark(pos, pos + node.nodeSize, this.type);
                  modified = true;
                }
              });
            }
          });

          if (modified) {
            dispatch(tr);
          }
          return modified;
        },

      removeAllCommentHighlights:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return false;

          let tr = state.tr;
          let modified = false;

          state.doc.descendants((node, pos) => {
            if (node.isText) {
              const commentHighlightMarks = node.marks.filter(mark => mark.type.name === 'commentHighlight');
              if (commentHighlightMarks.length > 0) {
                commentHighlightMarks.forEach(mark => {
                  tr = tr.removeMark(pos, pos + node.nodeSize, mark);
                });
                modified = true;
              }
            }
          });

          if (modified) {
            dispatch(tr);
          }
          return modified;
        },
    };
  },

  addStorage() {
    const extension = this;
    
    return {
      /**
       * Get all comment IDs at a specific position
       */
      getCommentsAtPosition: (position: number): string[] => {
        if (!extension.editor?.state) return [];
        
        const doc = extension.editor.state.doc;
        const $pos = doc.resolve(position);
        const commentIds: string[] = [];

        $pos.marks().forEach(mark => {
          if (mark.type.name === 'commentHighlight') {
            commentIds.push(mark.attrs.commentId);
          }
        });

        return commentIds;
      },

      /**
       * Get all comment IDs in the document
       */
      getAllComments: (): string[] => {
        if (!extension.editor?.state) return [];
        
        const commentIds = new Set<string>();
        
        extension.editor.state.doc.descendants((node) => {
          if (node.isText) {
            node.marks.forEach(mark => {
              if (mark.type.name === 'commentHighlight') {
                commentIds.add(mark.attrs.commentId);
              }
            });
          }
        });

        return Array.from(commentIds);
      },

      /**
       * Get the position range of a comment highlight
       */
      getCommentPosition: (commentId: string): { from: number; to: number } | null => {
        if (!extension.editor?.state) return null;
        
        let result: { from: number; to: number } | null = null;

        extension.editor.state.doc.descendants((node, pos) => {
          if (node.isText) {
            node.marks.forEach(mark => {
              if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === commentId) {
                if (!result) {
                  result = { from: pos, to: pos + node.nodeSize };
                } else {
                  // Extend range if we find more of the same comment
                  result.from = Math.min(result.from, pos);
                  result.to = Math.max(result.to, pos + node.nodeSize);
                }
              }
            });
          }
        });

        return result;
      },

      /**
       * Check if a comment highlight exists
       */
      hasComment: (commentId: string): boolean => {
        if (!extension.editor?.state) return false;
        
        let found = false;
        
        extension.editor.state.doc.descendants((node) => {
          if (found) return false; // Stop early if found
          
          if (node.isText) {
            node.marks.forEach(mark => {
              if (mark.type.name === 'commentHighlight' && mark.attrs.commentId === commentId) {
                found = true;
              }
            });
          }
        });

        return found;
      },
    };
  },
});