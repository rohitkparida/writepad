import { parser as markdownParser } from '@lezer/markdown';
import { GFM, Table, TaskList, Strikethrough } from '@lezer/markdown';
import type { Tree, SyntaxNode } from '@lezer/common';

// Configure the parser with GFM extensions
export const parser = markdownParser.configure([
  GFM,
  Table,
  TaskList,
  Strikethrough
]);

export interface ParsedBlock {
  type: string;
  content: string;
  start: number;
  end: number;
  children?: ParsedBlock[];
  level?: number;
  listType?: 'bullet' | 'ordered';
  checked?: boolean;
}

export function parseMarkdown(text: string): ParsedBlock[] {
  const tree = parser.parse(text);
  const blocks: ParsedBlock[] = [];
  
  const cursor = tree.cursor();
  
  function visitNode(node: SyntaxNode): ParsedBlock | null {
    const content = text.slice(node.from, node.to);
    const type = node.type.name;
    
    const block: ParsedBlock = {
      type,
      content,
      start: node.from,
      end: node.to
    };
    
    // Handle specific node types
    switch (type) {
      case 'ATXHeading1':
      case 'ATXHeading2':
      case 'ATXHeading3':
      case 'ATXHeading4':
      case 'ATXHeading5':
      case 'ATXHeading6':
        block.type = 'heading';
        block.level = parseInt(type.slice(-1));
        break;
        
      case 'BulletList':
        block.type = 'list';
        block.listType = 'bullet';
        break;
        
      case 'OrderedList':
        block.type = 'list';
        block.listType = 'ordered';
        break;
        
      case 'ListItem':
        block.type = 'listItem';
        break;
        
      case 'Task':
        block.type = 'task';
        // Check if the task is completed by looking for TaskMarker
        const taskMarker = node.getChild('TaskMarker');
        if (taskMarker) {
          const markerText = text.slice(taskMarker.from, taskMarker.to);
          block.checked = markerText.includes('x') || markerText.includes('X');
        }
        break;
        
      case 'Blockquote':
        block.type = 'blockquote';
        break;
        
      case 'CodeBlock':
      case 'FencedCode':
        block.type = 'codeBlock';
        break;
        
      case 'HorizontalRule':
        block.type = 'hr';
        break;
        
      case 'Table':
        block.type = 'table';
        break;
        
      case 'Paragraph':
        block.type = 'paragraph';
        break;
        
      default:
        // For inline elements, we might not create separate blocks
        if (node.parent?.type.name === 'Document') {
          block.type = 'paragraph'; // Fallback for top-level content
        } else {
          return null; // Skip inline elements in block structure
        }
    }
    
    // Get children for composite blocks
    const children: ParsedBlock[] = [];
    let child = node.firstChild;
    while (child) {
      const childBlock = visitNode(child);
      if (childBlock) {
        children.push(childBlock);
      }
      child = child.nextSibling;
    }
    
    if (children.length > 0) {
      block.children = children;
    }
    
    return block;
  }
  
  // Process all top-level nodes
  let child = tree.topNode.firstChild;
  while (child) {
    const block = visitNode(child);
    if (block) {
      blocks.push(block);
    }
    child = child.nextSibling;
  }
  
  return blocks;
}

// Helper function to extract plain text content from inline markup
export function extractTextContent(text: string, node: SyntaxNode): string {
  let result = '';
  
  function extractFromNode(n: SyntaxNode) {
    if (n.type.name === 'Text') {
      result += text.slice(n.from, n.to);
    } else {
      let child = n.firstChild;
      while (child) {
        extractFromNode(child);
        child = child.nextSibling;
      }
    }
  }
  
  extractFromNode(node);
  return result;
}

// Function to get inline formatting spans for syntax highlighting
export interface InlineSpan {
  type: string;
  start: number;
  end: number;
  markupStart?: number;
  markupEnd?: number;
}

export function getInlineSpans(text: string): InlineSpan[] {
  const tree = parser.parse(text);
  const spans: InlineSpan[] = [];
  
  function visitNode(node: SyntaxNode) {
    switch (node.type.name) {
      case 'Emphasis':
        spans.push({
          type: 'em',
          start: node.from,
          end: node.to,
          markupStart: node.from,
          markupEnd: node.from + 1
        });
        break;
        
      case 'StrongEmphasis':
        spans.push({
          type: 'strong',
          start: node.from,
          end: node.to,
          markupStart: node.from,
          markupEnd: node.from + 2
        });
        break;
        
      case 'InlineCode':
        spans.push({
          type: 'code',
          start: node.from,
          end: node.to,
          markupStart: node.from,
          markupEnd: node.from + 1
        });
        break;
        
      case 'Link':
      case 'Autolink':
        spans.push({
          type: 'link',
          start: node.from,
          end: node.to
        });
        break;
        
      case 'Strikethrough':
        spans.push({
          type: 'strikethrough',
          start: node.from,
          end: node.to,
          markupStart: node.from,
          markupEnd: node.from + 2
        });
        break;
    }
    
    let child = node.firstChild;
    while (child) {
      visitNode(child);
      child = child.nextSibling;
    }
  }
  
  visitNode(tree.topNode);
  return spans;
} 