import { WidgetType } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import { RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';
import type { TreeCursor } from '@lezer/common';

class CodeBlockWidget extends WidgetType {
  rendered: string;

  constructor(public source: string, private language: string, private code: string) {
    super();
    this.rendered = this.renderCodeBlock();
  }

  eq(widget: CodeBlockWidget): boolean {
    return widget.source === this.source;
  }

  toDOM(): HTMLElement {
    const content = document.createElement('div');
    content.setAttribute('contenteditable', 'false');
    content.className = 'cm-writepad-renderBlock cm-writepad-codeblock';
    content.innerHTML = this.rendered;
    return content;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private renderCodeBlock(): string {
    // Basic syntax highlighting for common languages
    const highlightedCode = this.highlightCode(this.code, this.language);
    
    return `
      <div class="writepad-code-block">
        <div class="code-header">
          <span class="code-language">${this.escapeHtml(this.language || 'text')}</span>
          <button class="copy-button" onclick="navigator.clipboard.writeText(\`${this.escapeJs(this.code)}\`)">Copy</button>
        </div>
        <pre class="code-content"><code class="language-${this.escapeHtml(this.language || 'text')}">${highlightedCode}</code></pre>
      </div>
    `;
  }

  private highlightCode(code: string, language: string): string {
    // Simple highlighting for demonstration - you can integrate with highlight.js or similar
    const escaped = this.escapeHtml(code);
    
    switch (language?.toLowerCase()) {
      case 'javascript':
      case 'js':
        return this.highlightJavaScript(escaped);
      case 'json':
        return this.highlightJSON(escaped);
      case 'css':
        return this.highlightCSS(escaped);
      default:
        return escaped;
    }
  }

  private highlightJavaScript(code: string): string {
    return code
      .replace(/\b(function|const|let|var|if|else|for|while|return|class|extends|import|export|from|default)\b/g, '<span class="keyword">$1</span>')
      .replace(/\/\/.*$/gm, '<span class="comment">$&</span>')
      .replace(/"[^"]*"/g, '<span class="string">$&</span>')
      .replace(/'[^']*'/g, '<span class="string">$&</span>');
  }

  private highlightJSON(code: string): string {
    return code
      .replace(/"[^"]*":/g, '<span class="json-key">$&</span>')
      .replace(/:\s*"[^"]*"/g, '<span class="json-string">$&</span>')
      .replace(/:\s*(true|false|null)/g, ': <span class="json-literal">$1</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
  }

  private highlightCSS(code: string): string {
    return code
      .replace(/([.#]?[\w-]+)\s*{/g, '<span class="css-selector">$1</span> {')
      .replace(/([\w-]+)\s*:/g, '<span class="css-property">$1</span>:')
      .replace(/\/\*.*?\*\//gs, '<span class="comment">$&</span>');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeJs(text: string): string {
    return text.replace(/`/g, '\\`').replace(/\$/g, '\\$');
  }
}

// Extract code block info using CodeMirror's existing AST (no re-parsing!)
function extractCodeBlockInfo(state: EditorState, node: { from: number; to: number; node: any }): { language: string; code: string } {
  const docText = state.doc.toString();
  let language = '';
  let code = '';
  
  // Use the existing AST to extract language and code
  const cursor = node.node.cursor();
  cursor.iterate((child: any) => {
    if (child.name === 'CodeInfo') {
      // Extract language from CodeInfo node
      const infoText = docText.slice(child.from, child.to);
      language = infoText.replace(/^```/, '').trim();
    } else if (child.name === 'CodeText') {
      // Extract code content from CodeText node
      code = docText.slice(child.from, child.to);
    }
  });
  
  // Fallback: extract manually if AST doesn't provide the info
  if (!language && !code) {
    const fullText = docText.slice(node.from, node.to);
    const lines = fullText.split('\n');
    
    if (lines.length > 0) {
      // First line contains language info
      const firstLine = lines[0];
      language = firstLine.replace(/^```/, '').trim();
      
      // Everything between first and last line is code
      if (lines.length > 2) {
        code = lines.slice(1, -1).join('\n');
      }
    }
  }
  
  return { language, code };
}

function replaceCodeBlocks(state: EditorState, from?: number, to?: number) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;

  syntaxTree(state).iterate({
    from, to,
    enter(node) {
      if (node.name !== 'FencedCode') return;

      // Don't replace code block when cursor is inside it
      if (cursor.from >= node.from && cursor.to <= node.to) {
        return false;
      }

      const text = state.doc.sliceString(node.from, node.to);
      const { language, code } = extractCodeBlockInfo(state, node);
      
      const decoration = Decoration.replace({
        widget: new CodeBlockWidget(text, language, code),
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));
    }
  });

  return decorations;
}

// StateField for managing code block decorations
export const codeWidgetField = StateField.define<DecorationSet>({
  create(state) {
    return RangeSet.of(replaceCodeBlocks(state), true);
  },

  update(decorations, transaction) {
    return RangeSet.of(replaceCodeBlocks(transaction.state), true);
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});

// Event handler for clicking in rendered code blocks
export const codeEventHandler = {
  mousedown(event: MouseEvent, view: EditorView) {
    const target = event.target as Element;
    
    // If clicking on copy button, don't move cursor
    if (target && target.closest('.copy-button')) {
      return true; // Prevent default cursor positioning
    }
    
    if (target && target.closest('.cm-writepad-codeblock')) {
      // Find the position in the document corresponding to the clicked element
      const pos = view.posAtDOM(target);
      if (pos !== null) {
        view.dispatch({ selection: { anchor: pos } });
      }
    }
    return false;
  }
}; 