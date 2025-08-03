import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { getUserColorVariables } from '../utils/userColors';

export interface TrackChangesOptions {
  userId: string;
  userName: string;
  enabled: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      /**
       * Accept all tracked changes in the document
       */
      acceptAllChanges: () => ReturnType;
      /**
       * Toggle track changes mode
       */
      toggleTrackChanges: () => ReturnType;
      /**
       * Set track changes options
       */
      setTrackChangesOptions: (options: Partial<TrackChangesOptions>) => ReturnType;
      /**
       * Add track changes mark to current selection
       */
      addTrackChanges: () => ReturnType;
    };
  }
}

export const TrackChanges = Mark.create<TrackChangesOptions>({
  name: 'trackChange',

  addOptions() {
    return {
      userId: '',
      userName: '',
      enabled: true,
    };
  },

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: element => element.getAttribute('data-user-id'),
        renderHTML: attributes => {
          if (!attributes.userId) {
            return {};
          }
          return {
            'data-user-id': attributes.userId,
          };
        },
      },
      userName: {
        default: null,
        parseHTML: element => element.getAttribute('data-user-name'),
        renderHTML: attributes => {
          if (!attributes.userName) {
            return {};
          }
          return {
            'data-user-name': attributes.userName,
          };
        },
      },
      timestamp: {
        default: null,
        parseHTML: element => element.getAttribute('data-timestamp'),
        renderHTML: attributes => {
          if (!attributes.timestamp) {
            return {};
          }
          return {
            'data-timestamp': attributes.timestamp,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-track-change]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const userId = mark.attrs.userId;
    if (!userId) return ['span', mergeAttributes(HTMLAttributes)];

    const colorVars = getUserColorVariables(userId);
    const style = `
      background-color: var(--user-color-bg, ${colorVars['--user-color-bg']});
      border-bottom: 2px solid var(--user-color-border, ${colorVars['--user-color-border']});
      color: var(--user-color-text, ${colorVars['--user-color-text']});
      padding: 1px 2px;
      border-radius: 2px;
      position: relative;
    `;

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-track-change': 'true',
        'data-user-id': mark.attrs.userId,
        'data-user-name': mark.attrs.userName,
        'data-timestamp': mark.attrs.timestamp,
        style: style,
        title: `Added by ${mark.attrs.userName} at ${new Date(mark.attrs.timestamp).toLocaleString()}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      acceptAllChanges:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return false;

          const { doc } = tr;
          let modified = false;

          doc.descendants((node, pos) => {
            if (node.isText) {
              const trackChangeMarks = node.marks.filter(mark => mark.type.name === 'trackChange');
              if (trackChangeMarks.length > 0) {
                tr.removeMark(pos, pos + node.nodeSize, this.type);
                modified = true;
              }
            }
          });

          return modified;
        },

      toggleTrackChanges:
        () =>
        ({ commands }) => {
          return commands.setTrackChangesOptions({
            enabled: !this.options.enabled,
          });
        },

      setTrackChangesOptions:
        (options) =>
        () => {
          Object.assign(this.options, options);
          return true;
        },

      addTrackChanges:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return false;

          const { from, to } = state.selection;
          const mark = this.type.create({
            userId: this.options.userId,
            userName: this.options.userName,
            timestamp: Date.now(),
          });

          dispatch(state.tr.addMark(from, to, mark));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('trackChanges'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!this.options.enabled) return null;

          let tr = newState.tr;
          let modified = false;

          // Track text insertions by monitoring changes in the document
          transactions.forEach(transaction => {
            if (!transaction.docChanged) return;

            transaction.mapping.maps.forEach((stepMap, i) => {
              stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                // This is an insertion if newEnd > newStart but oldEnd === oldStart
                if (newEnd > newStart && oldEnd === oldStart) {
                  // Apply track changes mark to the inserted content
                  const mark = this.type.create({
                    userId: this.options.userId,
                    userName: this.options.userName,
                    timestamp: Date.now(),
                  });

                  tr.addMark(newStart, newEnd, mark);
                  modified = true;
                }
              });
            });
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});