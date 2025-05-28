// Simplified editor for minimal implementation
import { getText, getOffset, setOffset, getNewState, findBlockIndex, getChangeIndexes } from './shared';
import parseBlock from './parser';
import { parseMarkdownWasm } from './wasm-parser';
import { toDOM } from './renderer';
import type { StateNode } from './shared';

// Import the full renderer from renderer.ts
import './renderer'; // This will make the defaultRenderer available

// Create a comprehensive renderer that handles all markdown elements
const defaultRenderer = {
  paragraph: ({ content }: { content: (StateNode | string)[] }) => {
    const p = document.createElement('p');
    p.className = 'writepad-paragraph';
    content.forEach(item => {
      if (typeof item === 'string') {
        p.appendChild(document.createTextNode(item));
      } else {
        // For nested elements, create inline spans instead of nested paragraphs
        const nestedElement = toDOM(defaultRenderer, item);
        p.appendChild(nestedElement);
      }
    });
    return p;
  },
  
  heading: ({ content }: { content: (StateNode | string)[] }) => {
    // Parser structure: ['#', ...textContent] or ['##', ...textContent] (no space in matches)
    const hashes = content[0] as string;
    const level = hashes.length;
    const tag = `h${Math.min(level, 6)}`;
    
    const heading = document.createElement(tag);
    heading.className = `writepad-heading writepad-h${level}`;
    
    // Add the hash button
    const button = document.createElement('button');
    button.className = 'writepad-heading-button';
    button.contentEditable = 'false';
    button.type = 'button';
    button.dataset.text = hashes;
    
    const buttonDiv = document.createElement('div');
    buttonDiv.textContent = `h${level}`;
    button.appendChild(buttonDiv);
    
    heading.appendChild(button);
    
    // Add the text content (skip the hashes - start from index 1)
    const textContent = content.slice(1);
    textContent.forEach(item => {
      if (typeof item === 'string') {
        heading.appendChild(document.createTextNode(item));
      } else {
        const nestedElement = toDOM(defaultRenderer, item);
        heading.appendChild(nestedElement);
      }
    });
    
    return heading;
  },

  strong: ({ content }: { content: (StateNode | string)[] }) => {
    const strong = document.createElement('strong');
    // Skip the opening and closing markers, render the middle content
    const innerContent = content.slice(1, -1); // Remove first and last items (the ** markers)
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        strong.appendChild(document.createTextNode(item));
      } else {
        strong.appendChild(toDOM(defaultRenderer, item));
      }
    });
    return strong;
  },

  em: ({ content }: { content: (StateNode | string)[] }) => {
    const em = document.createElement('em');
    // Skip the opening and closing markers, render the middle content
    const innerContent = content.slice(1, -1); // Remove first and last items (the * markers)
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        em.appendChild(document.createTextNode(item));
      } else {
        em.appendChild(toDOM(defaultRenderer, item));
      }
    });
    return em;
  },

  code: ({ content }: { content: (StateNode | string)[] }) => {
    const code = document.createElement('code');
    code.className = 'writepad-code-span';
    // Skip the opening and closing backticks, render the middle content
    const innerContent = content.slice(1, -1);
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        code.appendChild(document.createTextNode(item));
      }
    });
    return code;
  },

  code_block: ({ content }: { content: (StateNode | string)[] }) => {
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.className = 'writepad-code-block';
    
    let codeContent = '';
    let inCode = false;
    
    content.forEach(item => {
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
  },

  blockquote: ({ content }: { content: (StateNode | string)[] }) => {
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'writepad-blockquote';
    
    // Parser structure: ['>', ...textContent] (no space in matches)
    // Skip the first element (> marker)
    const textContent = content.slice(1);
    
    textContent.forEach(item => {
      if (typeof item === 'string') {
        blockquote.appendChild(document.createTextNode(item));
      } else {
        blockquote.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return blockquote;
  },

  horizontal_rule: ({ content }: { content: (StateNode | string)[] }) => {
    const hr = document.createElement('hr');
    hr.className = 'writepad-hr';
    return hr;
  },

  ordered_list_item: ({ content }: { content: (StateNode | string)[] }) => {
    const li = document.createElement('li');
    li.className = 'writepad-ordered-list-item';
    
    // Parser structure: ['', '1', '.', ...textContent] (no space in matches)
    // Skip the first 3 elements (whitespace, number, dot)
    const textContent = content.slice(3);
    
    textContent.forEach(item => {
      if (typeof item === 'string') {
        li.appendChild(document.createTextNode(item));
      } else {
        li.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return li;
  },

  unordered_list_item: ({ content }: { content: (StateNode | string)[] }) => {
    const li = document.createElement('li');
    li.className = 'writepad-unordered-list-item';
    
    // Parser structure: ['', '-', ...textContent] or ['', '*', ...textContent] (no space in matches)
    // Skip the first 2 elements (whitespace, marker)
    const textContent = content.slice(2);
    
    textContent.forEach(item => {
      if (typeof item === 'string') {
        li.appendChild(document.createTextNode(item));
      } else {
        li.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return li;
  },

  todo_item: ({ content }: { content: (StateNode | string)[] }) => {
    const div = document.createElement('div');
    div.className = 'writepad-todo-item';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'writepad-todo-checkbox';
    
    // Parser structure: ['', '- [x]', ...textContent] or ['', '- [ ]', ...textContent] (no space in matches)
    const todoMarker = content[1] as string;
    const isChecked = todoMarker.includes('[x]');
    checkbox.checked = isChecked;
    
    // Get text content (skip first 2 elements: whitespace, marker)
    const textContent = content.slice(2);
    let text = '';
    textContent.forEach(item => {
      if (typeof item === 'string') {
        text += item;
      }
    });
    
    const label = document.createElement('label');
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(text.trim()));
    
    if (isChecked) {
      label.classList.add('writepad-todo-done');
    }
    
    div.appendChild(label);
    return div;
  },

  link: ({ content }: { content: (StateNode | string)[] }) => {
    const a = document.createElement('a');
    a.className = 'writepad-link';
    
    // Parser structure: ['[', 'text', ']', '(', 'url', ')']
    let linkText = '';
    let url = '';
    
    // Extract text (index 1) and url (index 4)
    if (content.length >= 6) {
      linkText = content[1] as string;
      url = content[4] as string;
    }
    
    a.href = url || '#';
    a.textContent = linkText || 'link';
    return a;
  },

  tag: ({ content }: { content: (StateNode | string)[] }) => {
    const span = document.createElement('span');
    span.className = 'writepad-tag';
    
    content.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      }
    });
    
    return span;
  },

  reference: ({ content }: { content: (StateNode | string)[] }) => {
    const span = document.createElement('span');
    span.className = 'writepad-reference';
    
    // Skip the [[ and ]] markers, render the middle content
    const innerContent = content.slice(1, -1);
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      }
    });
    
    return span;
  },

  strikethrough: ({ content }: { content: (StateNode | string)[] }) => {
    const span = document.createElement('span');
    span.className = 'writepad-strikethrough';
    
    // Skip the ~~ markers, render the middle content
    const innerContent = content.slice(1, -1);
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      } else {
        span.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return span;
  },

  underline: ({ content }: { content: (StateNode | string)[] }) => {
    const span = document.createElement('span');
    span.className = 'writepad-underline';
    
    // Skip the ~ markers, render the middle content
    const innerContent = content.slice(1, -1);
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      } else {
        span.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return span;
  },

  mark: ({ content }: { content: (StateNode | string)[] }) => {
    const span = document.createElement('span');
    span.className = 'writepad-highlight';
    
    // Skip the :: markers, render the middle content
    const innerContent = content.slice(1, -1);
    
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      } else {
        span.appendChild(toDOM(defaultRenderer, item));
      }
    });
    
    return span;
  }
};

export class SimpleEditor {
  private container: HTMLElement;
  private originalMarkdown: string = '';
  private currentParser: 'regex' | 'wasm' = 'regex';
  private isUpdating = false;
  private lastParseTime = 0;
  private debounceTimer: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupEventListeners();
    this.container.setAttribute('contenteditable', 'true');
    this.container.style.outline = 'none';
    this.container.style.whiteSpace = 'pre-wrap';
  }

  private setupEventListeners() {
    // Handle input with debouncing for better performance
    this.container.addEventListener('input', (e) => {
      if (this.isUpdating) return;
      
      // Ignore input events from interactive elements like checkboxes
      const target = e.target as HTMLElement;
      if (target && (
        (target as HTMLInputElement).type === 'checkbox' || 
        target.contentEditable === 'false' ||
        target.closest('button') ||
        target.closest('input[type="checkbox"]')
      )) {
        console.log('Ignoring input from interactive element:', target);
        return;
      }
      
      // Clear existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      // Debounce the update
      this.debounceTimer = window.setTimeout(() => {
        this.handleInput(e);
      }, 100); // 100ms debounce
    });

    // Handle checkbox changes separately without triggering re-parse
    this.container.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'checkbox' && target.classList.contains('writepad-todo-checkbox')) {
        console.log('Todo checkbox changed:', target.checked);
        // Update the visual state but don't re-parse the entire document
        const label = target.closest('label');
        if (label) {
          if (target.checked) {
            label.classList.add('writepad-todo-done');
          } else {
            label.classList.remove('writepad-todo-done');
          }
        }
        // Prevent the input event from bubbling up
        e.stopPropagation();
      }
    });

    // Track selection changes for cursor position
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.container) {
        // Store current cursor position for debugging
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const offset = this.getSimpleOffset(range.startContainer, range.startOffset);
          console.log('Selection changed, cursor at:', offset);
        }
      }
    });

    // Prevent default behavior for some keys
    this.container.addEventListener('keydown', (e) => {
      // Allow normal text editing
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  '); // Insert 2 spaces
      }
      
      // Handle Enter key more carefully
      if (e.key === 'Enter') {
        console.log('Enter key pressed');
        // Let the default behavior happen, but we'll be more careful in input handler
      }
    });
  }

  private getSimpleOffset(node: Node, offset: number): number {
    let pos = 0;
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return pos + offset;
      }
      pos += currentNode.textContent?.length || 0;
    }
    return pos;
  }

  private setSimpleOffset(offset: number): void {
    const selection = window.getSelection();
    if (!selection) return;
    
    let currentOffset = 0;
    const walker = document.createTreeWalker(
      this.container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let node;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;
      
      if (currentOffset + nodeLength >= offset) {
        const range = document.createRange();
        range.setStart(node, Math.max(0, offset - currentOffset));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentOffset += nodeLength;
    }
  }

  private async handleInput(e: Event) {
    console.log('📝 Input event triggered');
    
    try {
      // Get current cursor position
      const selection = window.getSelection();
      let currentOffset = 0;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        currentOffset = this.getSimpleOffset(range.startContainer, range.startOffset);
      }
      console.log('Current cursor position:', currentOffset);
      
      // Try to reconstruct markdown from DOM structure first
      let reconstructedMarkdown = '';
      try {
        reconstructedMarkdown = this.reconstructMarkdownFromDOM();
        console.log('Reconstructed markdown preview:', reconstructedMarkdown.substring(0, 100) + '...');
      } catch (error) {
        console.warn('Failed to reconstruct markdown from DOM:', error);
      }
      
      // Fallback to textContent if reconstruction fails
      const currentText = reconstructedMarkdown || this.container.textContent || '';
      
      // Check if this looks like corrupted content (no markdown structure)
      const hasMarkdownStructure = currentText.includes('#') || 
                                   currentText.includes('*') || 
                                   currentText.includes('[') ||
                                   currentText.includes('```') ||
                                   currentText.includes('- ') ||
                                   currentText.includes('> ');
      
      // Check if content got mangled (everything in one line without proper spacing)
      const looksCorrupted = currentText.length > 100 && 
                            !currentText.includes('\n') && 
                            currentText.includes('h1') && 
                            currentText.includes('h2');
      
      if (hasMarkdownStructure && !looksCorrupted && reconstructedMarkdown) {
        // Content looks valid and was properly reconstructed, update SSOT
        this.originalMarkdown = currentText;
        
        // Re-parse and render
        await this.updateContent();
        
        // Restore cursor position
        this.setSimpleOffset(currentOffset);
        console.log('Cursor restored to:', currentOffset);
      } else if (currentText.length < this.originalMarkdown.length * 0.5) {
        // Content seems too short, might be corruption, restore from SSOT
        console.log('Content appears to be truncated, restoring from SSOT');
        await this.restoreContent();
      } else {
        // Try to use the current text as-is (user might be typing new content)
        console.log('Using current text content as fallback');
        this.originalMarkdown = this.container.textContent || this.originalMarkdown;
        
        // Re-parse and render
        await this.updateContent();
        
        // Restore cursor position
        this.setSimpleOffset(currentOffset);
      }
      
    } catch (error) {
      console.error('Error handling input:', error);
      // If there's an error, try to restore content
      await this.restoreContent();
    }
  }

  async setValue(value: string) {
    this.originalMarkdown = value;
    await this.updateContent();
  }

  getValue(): string {
    return this.originalMarkdown;
  }

  // Method to restore content if it gets corrupted
  async restoreContent() {
    console.log('Restoring content from original markdown');
    await this.updateContent();
  }

  // Method to reconstruct markdown from DOM structure
  private reconstructMarkdownFromDOM(): string {
    const lines: string[] = [];
    
    for (const child of this.container.children) {
      const element = child as HTMLElement;
      
      if (element.classList.contains('writepad-heading')) {
        // Reconstruct heading
        const button = element.querySelector('.writepad-heading-button') as HTMLElement;
        const hashes = button?.dataset.text || '#';
        const text = element.textContent?.replace(/^h\d/, '').trim() || '';
        lines.push(`${hashes} ${text}`);
      } else if (element.classList.contains('writepad-paragraph')) {
        // Reconstruct paragraph
        const text = element.textContent?.trim() || '';
        if (text) {
          lines.push(text);
        } else {
          lines.push(''); // Empty line
        }
      } else if (element.classList.contains('writepad-code-block')) {
        // Reconstruct code block
        const code = element.querySelector('code');
        const codeText = code?.textContent || '';
        const firstLine = codeText.split('\n')[0];
        const isLanguage = firstLine && firstLine.length < 20 && !firstLine.includes(' ');
        
        if (isLanguage) {
          lines.push(`\`\`\`${firstLine}`);
          lines.push(codeText.substring(firstLine.length + 1));
          lines.push('```');
        } else {
          lines.push('```');
          lines.push(codeText);
          lines.push('```');
        }
      } else if (element.classList.contains('writepad-ordered-list')) {
        // Reconstruct ordered list
        const items = element.querySelectorAll('li');
        items.forEach((item, index) => {
          const text = item.textContent?.trim() || '';
          lines.push(`${index + 1}. ${text}`);
        });
      } else if (element.classList.contains('writepad-unordered-list')) {
        // Reconstruct unordered list
        const items = element.querySelectorAll('li');
        items.forEach(item => {
          const text = item.textContent?.trim() || '';
          lines.push(`- ${text}`);
        });
      } else if (element.classList.contains('writepad-todo-item')) {
        // Reconstruct todo item
        const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        const label = element.querySelector('label');
        const text = label?.textContent?.trim() || '';
        const checked = checkbox?.checked ? 'x' : ' ';
        lines.push(`- [${checked}] ${text}`);
      } else if (element.classList.contains('writepad-blockquote')) {
        // Reconstruct blockquote
        const text = element.textContent?.trim() || '';
        lines.push(`> ${text}`);
      } else if (element.classList.contains('writepad-hr')) {
        // Reconstruct horizontal rule
        lines.push('---');
      }
    }
    
    return lines.join('\n');
  }

  async setParser(parser: 'regex' | 'wasm') {
    if (this.currentParser !== parser) {
      console.log(`🔄 Switching parser from ${this.currentParser} to ${parser}`);
      this.currentParser = parser;
      await this.updateParser();
    }
  }

  getParser(): 'regex' | 'wasm' {
    return this.currentParser;
  }

  getLastParseTime(): number {
    return this.lastParseTime;
  }

  private async updateParser() {
    // Re-parse with new parser using the original markdown
    await this.updateContent();
  }

  private async updateContent() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    try {
      const startTime = performance.now();
      
      // Parse the original markdown
      const blocks: StateNode[] = [];
      
      if (this.currentParser === 'wasm') {
        // Use WASM parser
        for await (const block of parseMarkdownWasm(this.originalMarkdown)) {
          blocks.push(block);
        }
      } else {
        // Use regex parser
        for (const block of parseBlock(this.originalMarkdown)) {
          blocks.push(block);
        }
      }
      
      const endTime = performance.now();
      this.lastParseTime = endTime - startTime;
      
      console.log(`⚡ ${this.currentParser} parsing took ${this.lastParseTime.toFixed(2)}ms`);
      console.log('Parsed blocks:', blocks); // Debug: log all parsed blocks
      
      // Render to DOM
      this.renderBlocks(blocks);
      
    } catch (error) {
      console.error('Error updating content:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  private renderBlocks(blocks: StateNode[]) {
    // Clear container
    this.container.innerHTML = '';
    
    // Group consecutive list items into proper lists
    const groupedBlocks = this.groupListItems(blocks);
    
    // Render each block or group
    for (const item of groupedBlocks) {
      if (item.type === 'list_group') {
        const listElement = item.ordered ? document.createElement('ol') : document.createElement('ul');
        listElement.className = item.ordered ? 'writepad-ordered-list' : 'writepad-unordered-list';
        
        for (const listItem of item.items) {
          const element = toDOM(defaultRenderer, listItem);
          listElement.appendChild(element);
        }
        
        this.container.appendChild(listElement);
      } else {
        const element = toDOM(defaultRenderer, item);
        this.container.appendChild(element);
      }
    }
  }

  private groupListItems(blocks: StateNode[]): any[] {
    const grouped = [];
    let currentList: any = null;
    
    for (const block of blocks) {
      if (block.type === 'ordered_list_item') {
        if (!currentList || !currentList.ordered) {
          if (currentList) grouped.push(currentList);
          currentList = { type: 'list_group', ordered: true, items: [] };
        }
        currentList.items.push(block);
      } else if (block.type === 'unordered_list_item') {
        if (!currentList || currentList.ordered) {
          if (currentList) grouped.push(currentList);
          currentList = { type: 'list_group', ordered: false, items: [] };
        }
        currentList.items.push(block);
      } else {
        if (currentList) {
          grouped.push(currentList);
          currentList = null;
        }
        grouped.push(block);
      }
    }
    
    if (currentList) {
      grouped.push(currentList);
    }
    
    return grouped;
  }

  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.container.contentEditable = 'false';
  }
} 