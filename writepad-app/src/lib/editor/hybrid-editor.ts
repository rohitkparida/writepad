import { EditorState, StateField, RangeSet } from '@codemirror/state';
import { EditorView, ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { DecorationSet, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';

import { parseMarkdownWasm } from './wasm-parser';
import parseBlock from './parser';
import type { StateNode } from './shared';

// Rich highlight styles inspired by codemirror-rich-markdoc
const richHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '28px' },
  { tag: t.heading2, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '24px' },
  { tag: t.heading3, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '20px' },
  { tag: t.heading4, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '18px' },
  { tag: t.heading5, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '16px' },
  { tag: t.heading6, fontWeight: 'bold', fontFamily: 'sans-serif', fontSize: '14px' },
  { tag: t.link, fontFamily: 'sans-serif', textDecoration: 'underline', color: '#0969da' },
  { tag: t.emphasis, fontFamily: 'sans-serif', fontStyle: 'italic' },
  { tag: t.strong, fontFamily: 'sans-serif', fontWeight: 'bold' },
  { tag: t.monospace, fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", "Roboto Mono", Consolas, "Courier New", monospace' },
  { tag: t.content, fontFamily: 'sans-serif' },
  { tag: t.meta, color: '#656d76' },
]);

// Token types that should be treated as rich elements
const tokenElement = [
  'InlineCode',
  'Emphasis', 
  'StrongEmphasis',
  'FencedCode',
  'Link',
];

// Token types that should be hidden when not focused
const tokenHidden = [
  'HardBreak',
  'LinkMark',
  'EmphasisMark', 
  'CodeMark',
  'CodeInfo',
  'URL',
];

// Decoration classes
const decorationHidden = Decoration.mark({ class: 'cm-writepad-hidden' });
const decorationBullet = Decoration.mark({ class: 'cm-writepad-bullet' });
const decorationCode = Decoration.mark({ class: 'cm-writepad-code' });

// WASM-rendered widget for complex elements
class WasmRenderWidget extends WidgetType {
  private rendered: HTMLElement;

  constructor(public source: string, public parser: 'regex' | 'wasm' = 'wasm') {
    super();
    this.rendered = this.createContainer();
    this.renderContentAsync();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-writepad-render-block';
    container.contentEditable = 'false';
    container.textContent = 'Loading...';
    return container;
  }

  private async renderContentAsync(): Promise<void> {
    try {
      let ast: StateNode[];
      
      if (this.parser === 'wasm') {
        const result = await parseMarkdownWasm(this.source);
        ast = Array.isArray(result) ? result : [result];
      } else {
        // Parse line by line with regex parser
        const lines = this.source.split('\n');
        ast = lines.map(line => parseBlock(line)).filter(block => block !== null) as StateNode[];
      }

      // Clear loading text
      this.rendered.innerHTML = '';

      // Render AST to DOM using our renderer
      ast.forEach(node => {
        const element = this.renderStateNode(node);
        if (element) this.rendered.appendChild(element);
      });

    } catch (error) {
      console.error('Error rendering WASM content:', error);
      this.rendered.textContent = this.source;
    }
  }

  private renderStateNode(node: StateNode): HTMLElement | null {
    if (!node) return null;

    switch (node.type) {
      case 'paragraph':
        const p = document.createElement('p');
        this.renderContentItems(node.content, p);
        return p;
        
      case 'heading':
        const level = Math.min((node.content[0] as string).length, 6);
        const h = document.createElement(`h${level}`);
        h.className = `cm-writepad-heading cm-writepad-h${level}`;
        
        // Skip the hash marks and render content
        this.renderContentItems(node.content.slice(1), h);
        return h;
        
      case 'blockquote':
        const blockquote = document.createElement('blockquote');
        blockquote.className = 'cm-writepad-blockquote';
        this.renderContentItems(node.content.slice(1), blockquote); // Skip '>' marker
        return blockquote;
        
      case 'code_block':
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        pre.className = 'cm-writepad-code-block';
        
        // Extract code content (skip ``` markers)
        let codeContent = '';
        let inCode = false;
        node.content.forEach(item => {
          if (typeof item === 'string') {
            if (item === '```') {
              inCode = !inCode;
            } else if (inCode) {
              codeContent += item;
            }
          }
        });
        
        code.textContent = codeContent.trim();
        pre.appendChild(code);
        return pre;
        
      default:
        const div = document.createElement('div');
        this.renderContentItems(node.content, div);
        return div;
    }
  }

  private renderContentItems(content: (StateNode | string)[], container: HTMLElement) {
    content.forEach(item => {
      if (typeof item === 'string') {
        container.appendChild(document.createTextNode(item));
      } else {
        const element = this.renderStateNode(item);
        if (element) container.appendChild(element);
      }
    });
  }

  eq(widget: WasmRenderWidget): boolean {
    return widget.source === this.source;
  }

  toDOM(): HTMLElement {
    return this.rendered;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

// Rich editing plugin that hides syntax based on cursor position
class RichEditPlugin {
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
          if ((node.name.startsWith('ATXHeading') || tokenElement.includes(node.name)) &&
              cursor.from >= node.from && cursor.to <= node.to) {
            return false;
          }

          // Handle list bullets
          if (node.name === 'ListMark' && node.matchContext(['BulletList', 'ListItem']) &&
              cursor.from !== node.from && cursor.from !== node.from + 1) {
            widgets.push(decorationBullet.range(node.from, node.to));
          }

          // Hide header marks when not focused
          if (node.name === 'HeaderMark') {
            widgets.push(decorationHidden.range(node.from, node.to + 1));
          }

          // Hide other markdown syntax when not focused
          if (tokenHidden.includes(node.name)) {
            widgets.push(decorationHidden.range(node.from, node.to));
          }

          // Style code blocks
          if (node.name === 'FencedCode') {
            widgets.push(decorationCode.range(node.from, node.to));
          }
        }
      });
    }

    return Decoration.set(widgets);
  }
}

// Block renderer that uses WASM for complex elements
function createBlockRenderer(parser: 'regex' | 'wasm' = 'wasm') {
  return StateField.define<DecorationSet>({
    create(state) {
      return RangeSet.of(replaceBlocks(state, parser), true);
    },

    update(decorations, transaction) {
      return RangeSet.of(replaceBlocks(transaction.state, parser), true);
    },

    provide(field) {
      return EditorView.decorations.from(field);
    },
  });
}

function replaceBlocks(state: EditorState, parser: 'regex' | 'wasm'): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;

  syntaxTree(state).iterate({
    enter(node) {
      // Replace complex blocks with WASM-rendered widgets
      if (!['Table', 'Blockquote', 'FencedCode'].includes(node.name)) {
        return;
      }

      // Don't replace when cursor is inside the block
      if (cursor.from >= node.from && cursor.to <= node.to) {
        return false;
      }

      const text = state.doc.sliceString(node.from, node.to);
      const decoration = Decoration.replace({
        widget: new WasmRenderWidget(text, parser),
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));
    }
  });

  return decorations;
}

// Main hybrid editor class
export class HybridEditor {
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
        
        // Markdown language support
        markdown(),
        
        // Rich editing features
        ViewPlugin.fromClass(RichEditPlugin, {
          decorations: v => v.decorations,
          eventHandlers: {
            mousedown({ target }, view) {
              // Handle clicks in rendered blocks
              if (target instanceof Element && target.matches('.cm-writepad-render-block *')) {
                view.dispatch({ selection: { anchor: view.posAtDOM(target) } });
              }
            }
          }
        }),
        
        // Syntax highlighting
        syntaxHighlighting(richHighlightStyle),
        
        // Block rendering
        createBlockRenderer(this.currentParser),
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
    if (this.currentParser === parser) return;
    
    this.currentParser = parser;
    
    // Force re-render by triggering a document change
    this.view.dispatch({
      changes: {
        from: 0,
        to: 0,
        insert: ''
      }
    });
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
} 