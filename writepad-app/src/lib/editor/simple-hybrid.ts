import { EditorState } from '@codemirror/state';
import { EditorView, ViewPlugin, Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Rich highlight styles for better markdown presentation
const richHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontWeight: 'bold', fontSize: '28px', color: '#1f2328' },
  { tag: t.heading2, fontWeight: 'bold', fontSize: '24px', color: '#1f2328' },
  { tag: t.heading3, fontWeight: 'bold', fontSize: '20px', color: '#1f2328' },
  { tag: t.heading4, fontWeight: 'bold', fontSize: '18px', color: '#1f2328' },
  { tag: t.heading5, fontWeight: 'bold', fontSize: '16px', color: '#1f2328' },
  { tag: t.heading6, fontWeight: 'bold', fontSize: '14px', color: '#656d76' },
  { tag: t.link, textDecoration: 'underline', color: '#0969da' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: '#6b7280' },
  { tag: t.monospace, 
    fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", Consolas, "Courier New", monospace',
    backgroundColor: '#f6f8fa',
    padding: '0.2em 0.4em',
    borderRadius: '3px'
  },
  { tag: t.content, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { tag: t.meta, color: '#656d76' },
]);

// Token types that should be hidden when not focused
const tokenHidden = [
  'HeaderMark',
  'LinkMark', 
  'EmphasisMark',
  'CodeMark',
  'URL',
  'QuoteMark',
  'TaskMarker',
  'TableDelimiter'
];

// Rich editing plugin that provides cursor-aware syntax hiding
class SimpleRichEditPlugin {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.process(view);
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.process(update.view);
    }
  }

  process(view: EditorView): DecorationSet {
    const widgets: Range<Decoration>[] = [];
    const [cursor] = view.state.selection.ranges;

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from, to,
        enter(node) {
          // Don't hide syntax when cursor is inside the element
          const cursorInside = cursor.from >= node.from && cursor.to <= node.to;
          
          // Hide markdown syntax marks when not focused
          if (tokenHidden.includes(node.name) && !cursorInside) {
            widgets.push(Decoration.mark({ class: 'cm-writepad-hidden' }).range(node.from, node.to));
          }

          // Style list bullets
          if (node.name === 'ListMark' && !cursorInside) {
            widgets.push(Decoration.mark({ class: 'cm-writepad-bullet' }).range(node.from, node.to));
          }

          // Style code blocks
          if (node.name === 'FencedCode') {
            widgets.push(Decoration.mark({ class: 'cm-writepad-code-block' }).range(node.from, node.to));
          }
        }
      });
    }

    return Decoration.set(widgets);
  }
}

// Main hybrid editor class
export class SimpleHybridEditor {
  private view: EditorView;
  private currentParser: 'regex' | 'wasm' = 'wasm';

  constructor(container: HTMLElement, initialContent: string = '') {
    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        // Core editor functionality
        EditorView.lineWrapping,
        history(),
        drawSelection(),
        highlightActiveLine(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        
        // Markdown language support with rich editing
        markdown(),
        
        // Rich editing plugin for syntax hiding
        ViewPlugin.fromClass(SimpleRichEditPlugin, {
          decorations: v => v.decorations,
        }),
        
        // Rich syntax highlighting
        syntaxHighlighting(richHighlightStyle),
        
        // Theme
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          },
          '.cm-content': {
            padding: '16px',
            minHeight: '400px',
            lineHeight: '1.6',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-editor': {
            border: '1px solid #d1d9e0',
            borderRadius: '6px',
          },
          '.cm-editor.cm-focused': {
            borderColor: '#0969da',
            boxShadow: '0 0 0 3px rgba(9, 105, 218, 0.1)',
          },
          '.cm-writepad-hidden': {
            display: 'none',
          },
          '.cm-writepad-bullet': {
            '&::before': {
              content: '"•"',
              color: '#656d76',
              marginRight: '0.5em',
            },
            '& span': {
              display: 'none',
            }
          },
          '.cm-writepad-code-block': {
            backgroundColor: '#f6f8fa',
            borderRadius: '6px',
            padding: '16px',
            fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", Consolas, "Courier New", monospace',
          },
        }),
      ],
    });

    this.view = new EditorView({
      state,
      parent: container,
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(content: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
  }

  async setParser(parser: 'regex' | 'wasm'): Promise<void> {
    this.currentParser = parser;
    // For now, just store the preference - actual parsing integration would go here
  }

  getParser(): 'regex' | 'wasm' {
    return this.currentParser;
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
  }
  
  // Method to get parse time for compatibility with existing interface
  getLastParseTime(): number {
    // For now return 0, this would be implemented with actual parser integration
    return 0;
  }
} 