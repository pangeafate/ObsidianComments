// Rich text editor with real-time collaboration using Slate.js

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  createEditor, 
  Editor, 
  Transforms, 
  Range, 
  Point, 
  Node as SlateNode,
  Text as SlateText
} from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { useCollaboration } from '../../contexts/CollaborationContext';
import type {
  CursorDecoration,
  HighlightDecoration,
  CommentDecoration
} from '../../types/collaboration';

// Define custom element types
type CustomElement = {
  type: 'paragraph' | 'heading' | 'blockquote';
  children: CustomText[];
};

type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
};

declare module 'slate' {
  interface CustomTypes {
    Element: CustomElement;
    Text: CustomText;
  }
}

// Initial editor value
const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: 'Start typing to collaborate...' }],
  },
];

interface SlateEditorProps {
  shareId: string;
  readOnly?: boolean;
}

export function SlateEditor({ readOnly = false }: SlateEditorProps) {
  const { state, actions } = useCollaboration();
  const [, setOperationId] = useState(0);
  
  // Create Slate editor with plugins
  const editor = useMemo(() => {
    return withReact(withHistory(createEditor()));
  }, []);

  // Initialize editor with document content
  useEffect(() => {
    if (state.documentState?.content) {
      try {
        const content = JSON.parse(state.documentState.content);
        // Replace editor content without adding to history
        Editor.withoutNormalizing(editor, () => {
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, []),
              focus: Editor.end(editor, []),
            },
          });
          Transforms.insertNodes(editor, content);
        });
      } catch (error) {
        console.error('Failed to parse document content:', error);
        // If JSON parsing fails, treat as plain text
        const textContent = state.documentState.content;
        Editor.withoutNormalizing(editor, () => {
          Transforms.delete(editor, {
            at: {
              anchor: Editor.start(editor, []),
              focus: Editor.end(editor, []),
            },
          });
          Transforms.insertText(editor, textContent);
        });
      }
    }
  }, [state.documentState?.content, editor]);

  // Handle editor changes
  const handleChange = useCallback((_value: Descendant[]) => {
    const isAstChange = editor.operations.some(
      (op: any) => 'set_selection' !== op.type
    );

    if (isAstChange && !readOnly) {
      // Convert Slate operations to our operation format
      const operations = editor.operations
        .filter((op: any) => op.type !== 'set_selection')
        .map((op: any) => {
          switch (op.type) {
            case 'insert_text':
              return {
                retain: op.offset,
                insert: op.text
              };
            case 'remove_text':
              return {
                retain: op.offset,
                delete: op.text.length
              };
            case 'insert_node':
              const nodeText = SlateNode.string(op.node);
              return {
                retain: op.path[0] || 0,
                insert: nodeText
              };
            case 'remove_node':
              const removedText = SlateNode.string(op.node);
              return {
                retain: op.path[0] || 0,
                delete: removedText.length
              };
            default:
              return null;
          }
        })
        .filter((op: any) => op !== null);

      if (operations.length > 0) {
        const newOperationId = `${Date.now()}-${Math.random()}`;
        setOperationId(prev => prev + 1);
        
        actions.sendTextChange(
          operations,
          newOperationId,
          state.documentState?.version || 1
        );
      }
    }

    // Handle cursor position updates
    if (editor.selection && !readOnly) {
      const anchor = editor.selection.anchor;
      const focus = editor.selection.focus;
      
      // Calculate text position from Slate point
      const position = getTextPosition(editor, anchor);
      const selection = Range.isExpanded(editor.selection) 
        ? {
            start: getTextPosition(editor, anchor),
            end: getTextPosition(editor, focus)
          }
        : undefined;

      actions.sendCursorMove(position, selection);
    }
  }, [editor, actions, readOnly, state.documentState?.version]);

  // Generate decorations for highlights and cursors
  const decorations = useMemo(() => {
    const decorations: (HighlightDecoration | CursorDecoration | CommentDecoration)[] = [];

    // Add highlight decorations
    state.highlights.forEach(highlight => {
      try {
        const start = getSlatePoint(editor, highlight.start);
        const end = getSlatePoint(editor, highlight.end);
        
        if (start && end) {
          decorations.push({
            anchor: start,
            focus: end,
            contributorName: highlight.contributorName,
            contributorColor: highlight.contributorColor,
            intensity: highlight.intensity,
            highlight: true
          });
        }
      } catch (error) {
        console.warn('Failed to create highlight decoration:', error);
      }
    });

    // Add cursor decorations for other contributors
    state.contributors
      .filter(contributor => 
        contributor.name !== state.contributorName && 
        contributor.isOnline &&
        contributor.cursorPosition !== undefined
      )
      .forEach(contributor => {
        try {
          const point = getSlatePoint(editor, contributor.cursorPosition!);
          if (point) {
            decorations.push({
              anchor: point,
              focus: point,
              contributorName: contributor.name,
              contributorColor: contributor.color,
              cursor: true
            });
          }
        } catch (error) {
          console.warn('Failed to create cursor decoration:', error);
        }
      });

    // Add comment decorations
    state.comments.forEach(comment => {
      try {
        const start = getSlatePoint(editor, comment.positionStart);
        const end = getSlatePoint(editor, comment.positionEnd);
        
        if (start && end) {
          decorations.push({
            anchor: start,
            focus: end,
            commentId: comment.id,
            comment: true
          });
        }
      } catch (error) {
        console.warn('Failed to create comment decoration:', error);
      }
    });

    return decorations;
  }, [editor, state.highlights, state.contributors, state.comments, state.contributorName]);

  // Custom render functions
  const renderElement = useCallback((props: any) => {
    const { attributes, children, element } = props;
    
    switch (element.type) {
      case 'heading':
        return (
          <h2 {...attributes} className="text-2xl font-bold mb-4">
            {children}
          </h2>
        );
      case 'blockquote':
        return (
          <blockquote {...attributes} className="border-l-4 border-gray-300 pl-4 italic my-4">
            {children}
          </blockquote>
        );
      default:
        return (
          <p {...attributes} className="mb-2">
            {children}
          </p>
        );
    }
  }, []);

  const renderLeaf = useCallback((props: any) => {
    const { attributes, children, leaf } = props;
    let element = children;

    // Apply text formatting
    if (leaf.bold) {
      element = <strong>{element}</strong>;
    }
    if (leaf.italic) {
      element = <em>{element}</em>;
    }
    if (leaf.underline) {
      element = <u>{element}</u>;
    }
    if (leaf.code) {
      element = <code className="bg-gray-100 px-1 rounded">{element}</code>;
    }

    // Apply collaboration decorations
    let className = '';
    let style: React.CSSProperties = {};

    if (leaf.highlight) {
      className += ' text-highlight';
      style.backgroundColor = `${leaf.contributorColor}${Math.round(leaf.intensity * 255).toString(16).padStart(2, '0')}`;
    }

    if (leaf.comment) {
      className += ' comment-highlight';
    }

    if (leaf.cursor) {
      // Render cursor indicator
      return (
        <span {...attributes} className={className} style={style}>
          {children}
          <span 
            className="cursor-indicator"
            style={{ color: leaf.contributorColor }}
          >
            <span className="cursor-label">
              {leaf.contributorName}
            </span>
          </span>
        </span>
      );
    }

    return (
      <span {...attributes} className={className} style={style}>
        {element}
      </span>
    );
  }, []);

  return (
    <div className="editor-container">
      <Slate
        editor={editor}
        initialValue={initialValue}
        onChange={handleChange}
      >
        <Editable
          className="editor-content"
          placeholder="Start typing to collaborate..."
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          decorate={useCallback(([node, path]: [any, any]) => {
            // Apply decorations to text nodes
            if (SlateText.isText(node)) {
              return decorations.filter(decoration => {
                try {
                  return Range.includes(
                    { anchor: decoration.anchor, focus: decoration.focus },
                    { path, offset: 0 }
                  );
                } catch {
                  return false;
                }
              });
            }
            return [];
          }, [decorations])}
          onKeyDown={(event) => {
            // Handle keyboard shortcuts
            if (!event.ctrlKey && !event.metaKey) return;

            switch (event.key) {
              case 'b':
                event.preventDefault();
                toggleFormat(editor, 'bold');
                break;
              case 'i':
                event.preventDefault();
                toggleFormat(editor, 'italic');
                break;
              case 'u':
                event.preventDefault();
                toggleFormat(editor, 'underline');
                break;
              case '`':
                event.preventDefault();
                toggleFormat(editor, 'code');
                break;
            }
          }}
        />
      </Slate>
    </div>
  );
}

// Helper functions
function getTextPosition(editor: Editor, point: Point): number {
  const before = Editor.before(editor, point, { unit: 'character' });
  const range = before ? { anchor: Editor.start(editor, []), focus: before } : null;
  return range ? Editor.string(editor, range).length : 0;
}

function getSlatePoint(editor: Editor, position: number): Point | null {
  try {
    const point = Editor.start(editor, []);
    const end = Editor.end(editor, []);
    
    let currentPosition = 0;
    const generator = Editor.positions(editor, { 
      at: { anchor: point, focus: end },
      unit: 'character'
    });

    for (const pos of generator) {
      if (currentPosition === position) {
        return pos;
      }
      currentPosition++;
    }
    
    return end;
  } catch {
    return null;
  }
}

function toggleFormat(editor: Editor, format: string) {
  const isActive = isFormatActive(editor, format);
  Transforms.setNodes(
    editor,
    { [format]: isActive ? null : true },
    { match: SlateText.isText, split: true }
  );
}

function isFormatActive(editor: Editor, format: string) {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
}