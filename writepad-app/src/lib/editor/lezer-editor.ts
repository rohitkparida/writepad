import { parseMarkdown, getInlineSpans, type ParsedBlock, type InlineSpan } from './lezer-parser.js';
import morphdom from 'morphdom';

interface EditorState {
  text: string;
  selection: { start: number; end: number };
}

export class LezerEditor {
  private container: HTMLElement;
  private state: EditorState;
  private isUpdating = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.state = {
      text: '',
      selection: { start: 0, end: 0 }
    };
    
    this.setupContainer();
    this.setupEventListeners();
  }

  private setupContainer() {
    this.container.contentEditable = 'true';
    this.container.className = 'writepad-editor lezer-editor';
    this.container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      padding: 20px;
      outline: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      min-height: 400px;
    `;
  }

  private setupEventListeners() {
    // Track selection changes
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.container) {
        this.updateSelection();
      }
    });

    // Handle input
    this.container.addEventListener('input', (e) => {
      if (!this.isUpdating) {
        this.handleInput();
      }
    });

    // Prevent default paste behavior and handle it manually
    this.container.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      this.insertText(text);
    });
  }

  private updateSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (!this.container.contains(range.commonAncestorContainer)) return;

    // Convert DOM selection to text offset
    const start = this.getTextOffset(range.startContainer, range.startOffset);
    const end = this.getTextOffset(range.endContainer, range.endOffset);
    
    this.state.selection = { start, end };
  }

  private getTextOffset(node: Node, offset: number): number {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let textOffset = 0;
    let currentNode;
    
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
    }
    
    return textOffset;
  }

  private setTextOffset(targetOffset: number) {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let node;
    
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      
      if (currentOffset + nodeLength >= targetOffset) {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          const relativeOffset = targetOffset - currentOffset;
          range.setStart(node, Math.min(relativeOffset, nodeLength));
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return;
      }
      
      currentOffset += nodeLength;
    }
  }

  private extractText(): string {
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let text = '';
    let node;
    
    while (node = walker.nextNode()) {
      text += node.textContent || '';
    }
    
    return text;
  }

  private handleInput() {
    const newText = this.extractText();
    
    if (newText !== this.state.text) {
      this.state.text = newText;
      this.render();
    }
  }

  private insertText(text: string) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
    
    this.handleInput();
  }

  private render() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    try {
      const blocks = parseMarkdown(this.state.text);
      const newElement = this.renderBlocks(blocks);
      
      // Use morphdom to efficiently update the DOM
      morphdom(this.container, newElement, {
        onBeforeElUpdated: (fromEl, toEl) => {
          // Preserve contentEditable
          if (fromEl === this.container) {
            (toEl as HTMLElement).contentEditable = 'true';
          }
          return true;
        }
      });
      
      // Restore cursor position
      this.setTextOffset(this.state.selection.start);
      
    } finally {
      this.isUpdating = false;
    }
  }

  private renderBlocks(blocks: ParsedBlock[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'writepad-editor lezer-editor';
    container.contentEditable = 'true';
    container.style.cssText = this.container.style.cssText;

    blocks.forEach(block => {
      const element = this.renderBlock(block);
      container.appendChild(element);
    });

    return container;
  }

  private renderBlock(block: ParsedBlock): HTMLElement {
    switch (block.type) {
      case 'heading':
        return this.renderHeading(block);
      case 'paragraph':
        return this.renderParagraph(block);
      case 'list':
        return this.renderList(block);
      case 'listItem':
        return this.renderListItem(block);
      case 'task':
        return this.renderTask(block);
      case 'blockquote':
        return this.renderBlockquote(block);
      case 'codeBlock':
        return this.renderCodeBlock(block);
      case 'hr':
        return this.renderHorizontalRule(block);
      case 'table':
        return this.renderTable(block);
      default:
        return this.renderParagraph(block);
    }
  }

  private renderHeading(block: ParsedBlock): HTMLElement {
    const level = block.level || 1;
    const tag = `h${Math.min(level, 6)}`;
    const heading = document.createElement(tag);
    heading.className = `writepad-heading writepad-h${level}`;
    
    // Extract heading text (remove the # markers)
    const text = block.content.replace(/^#+\s*/, '');
    const spans = getInlineSpans(text);
    
    heading.appendChild(this.renderInlineText(text, spans));
    
    return heading;
  }

  private renderParagraph(block: ParsedBlock): HTMLElement {
    const p = document.createElement('p');
    p.className = 'writepad-paragraph';
    
    const spans = getInlineSpans(block.content);
    p.appendChild(this.renderInlineText(block.content, spans));
    
    return p;
  }

  private renderList(block: ParsedBlock): HTMLElement {
    const tag = block.listType === 'ordered' ? 'ol' : 'ul';
    const list = document.createElement(tag);
    list.className = `writepad-${block.listType}-list`;
    
    if (block.children) {
      block.children.forEach(child => {
        const item = this.renderBlock(child);
        list.appendChild(item);
      });
    }
    
    return list;
  }

  private renderListItem(block: ParsedBlock): HTMLElement {
    const li = document.createElement('li');
    li.className = 'writepad-list-item';
    
    // Extract list item text (remove the bullet/number)
    const text = block.content.replace(/^(\s*)([-*+]|\d+\.)\s*/, '');
    const spans = getInlineSpans(text);
    
    li.appendChild(this.renderInlineText(text, spans));
    
    return li;
  }

  private renderTask(block: ParsedBlock): HTMLElement {
    const div = document.createElement('div');
    div.className = 'writepad-task';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = block.checked || false;
    checkbox.className = 'writepad-task-checkbox';
    
    // Extract task text (remove the checkbox syntax)
    const text = block.content.replace(/^(\s*)([-*+])\s*\[[ xX]\]\s*/, '');
    const spans = getInlineSpans(text);
    
    const label = document.createElement('label');
    label.className = 'writepad-task-label';
    label.appendChild(checkbox);
    label.appendChild(this.renderInlineText(text, spans));
    
    div.appendChild(label);
    
    return div;
  }

  private renderBlockquote(block: ParsedBlock): HTMLElement {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'writepad-blockquote';
    
    // Extract blockquote text (remove the > markers)
    const text = block.content.replace(/^>\s*/gm, '');
    const spans = getInlineSpans(text);
    
    blockquote.appendChild(this.renderInlineText(text, spans));
    
    return blockquote;
  }

  private renderCodeBlock(block: ParsedBlock): HTMLElement {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.className = 'writepad-code-block';
    
    // Extract code content (remove the ``` markers)
    let codeContent = block.content.replace(/^```.*\n?/, '').replace(/\n?```$/, '');
    code.textContent = codeContent;
    
    pre.appendChild(code);
    return pre;
  }

  private renderHorizontalRule(block: ParsedBlock): HTMLElement {
    const hr = document.createElement('hr');
    hr.className = 'writepad-hr';
    return hr;
  }

  private renderTable(block: ParsedBlock): HTMLElement {
    const table = document.createElement('table');
    table.className = 'writepad-table';
    // Basic table rendering - would need more work for proper table support
    table.innerHTML = '<tr><td>Table support coming soon</td></tr>';
    return table;
  }

  private renderInlineText(text: string, spans: InlineSpan[]): DocumentFragment {
    const fragment = document.createDocumentFragment();
    
    if (spans.length === 0) {
      fragment.appendChild(document.createTextNode(text));
      return fragment;
    }
    
    // Sort spans by start position
    spans.sort((a, b) => a.start - b.start);
    
    let lastEnd = 0;
    
    spans.forEach(span => {
      // Add text before the span
      if (span.start > lastEnd) {
        fragment.appendChild(document.createTextNode(text.slice(lastEnd, span.start)));
      }
      
      // Create the span element
      const element = this.createInlineElement(span, text);
      fragment.appendChild(element);
      
      lastEnd = span.end;
    });
    
    // Add remaining text
    if (lastEnd < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastEnd)));
    }
    
    return fragment;
  }

  private createInlineElement(span: InlineSpan, text: string): HTMLElement {
    const content = text.slice(span.start, span.end);
    
    switch (span.type) {
      case 'strong':
        const strong = document.createElement('strong');
        strong.textContent = content.slice(2, -2); // Remove ** markers
        return strong;
        
      case 'em':
        const em = document.createElement('em');
        em.textContent = content.slice(1, -1); // Remove * markers
        return em;
        
      case 'code':
        const code = document.createElement('code');
        code.className = 'writepad-code-span';
        code.textContent = content.slice(1, -1); // Remove ` markers
        return code;
        
      case 'strikethrough':
        const del = document.createElement('del');
        del.textContent = content.slice(2, -2); // Remove ~~ markers
        return del;
        
      case 'link':
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = content;
        return a;
        
      default:
        const span_el = document.createElement('span');
        span_el.textContent = content;
        return span_el;
    }
  }

  // Public API
  setValue(text: string) {
    this.state.text = text;
    this.state.selection = { start: 0, end: 0 };
    this.render();
  }

  getValue(): string {
    return this.state.text;
  }

  focus() {
    this.container.focus();
  }

  destroy() {
    // Clean up event listeners if needed
  }
} 