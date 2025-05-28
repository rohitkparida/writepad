// Proper AST interface for Writepad
// Based on mdast (Markdown Abstract Syntax Tree) specification

export interface Position {
  start: Point;
  end: Point;
}

export interface Point {
  line: number;
  column: number;
  offset: number;
}

export interface ASTNode {
  type: string;
  position?: Position;
  data?: Record<string, any>;
}

// Root node
export interface Root extends ASTNode {
  type: 'root';
  children: BlockContent[];
}

// Block content types
export type BlockContent = 
  | Heading 
  | Paragraph 
  | CodeBlock 
  | Blockquote 
  | List 
  | ThematicBreak
  | Table;

// Inline content types  
export type InlineContent = 
  | Text 
  | Strong 
  | Emphasis 
  | Code 
  | Link 
  | Image
  | Break;

// Block nodes
export interface Heading extends ASTNode {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineContent[];
}

export interface Paragraph extends ASTNode {
  type: 'paragraph';
  children: InlineContent[];
}

export interface CodeBlock extends ASTNode {
  type: 'code';
  lang?: string;
  meta?: string;
  value: string;
}

export interface Blockquote extends ASTNode {
  type: 'blockquote';
  children: BlockContent[];
}

export interface List extends ASTNode {
  type: 'list';
  ordered: boolean;
  start?: number;
  spread?: boolean;
  children: ListItem[];
}

export interface ListItem extends ASTNode {
  type: 'listItem';
  checked?: boolean | null;
  spread?: boolean;
  children: BlockContent[];
}

export interface ThematicBreak extends ASTNode {
  type: 'thematicBreak';
}

export interface Table extends ASTNode {
  type: 'table';
  align?: ('left' | 'right' | 'center' | null)[];
  children: TableRow[];
}

export interface TableRow extends ASTNode {
  type: 'tableRow';
  children: TableCell[];
}

export interface TableCell extends ASTNode {
  type: 'tableCell';
  children: InlineContent[];
}

// Inline nodes
export interface Text extends ASTNode {
  type: 'text';
  value: string;
}

export interface Strong extends ASTNode {
  type: 'strong';
  children: InlineContent[];
}

export interface Emphasis extends ASTNode {
  type: 'emphasis';
  children: InlineContent[];
}

export interface Code extends ASTNode {
  type: 'inlineCode';
  value: string;
}

export interface Link extends ASTNode {
  type: 'link';
  url: string;
  title?: string;
  children: InlineContent[];
}

export interface Image extends ASTNode {
  type: 'image';
  url: string;
  title?: string;
  alt?: string;
}

export interface Break extends ASTNode {
  type: 'break';
}

// AST utilities
export class ASTWalker {
  static walk(node: ASTNode, visitor: (node: ASTNode, parent?: ASTNode) => void, parent?: ASTNode) {
    visitor(node, parent);
    
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        this.walk(child, visitor, node);
      }
    }
  }
  
  static find(node: ASTNode, predicate: (node: ASTNode) => boolean): ASTNode | null {
    if (predicate(node)) return node;
    
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        const found = this.find(child, predicate);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  static findAll(node: ASTNode, predicate: (node: ASTNode) => boolean): ASTNode[] {
    const results: ASTNode[] = [];
    
    this.walk(node, (current) => {
      if (predicate(current)) {
        results.push(current);
      }
    });
    
    return results;
  }
}

// AST transformers
export class ASTTransformer {
  static toMarkdown(node: ASTNode): string {
    switch (node.type) {
      case 'root':
        return (node as Root).children.map(child => this.toMarkdown(child)).join('\n\n');
      
      case 'heading':
        const heading = node as Heading;
        const hashes = '#'.repeat(heading.depth);
        const text = heading.children.map(child => this.toMarkdown(child)).join('');
        return `${hashes} ${text}`;
      
      case 'paragraph':
        return (node as Paragraph).children.map(child => this.toMarkdown(child)).join('');
      
      case 'text':
        return (node as Text).value;
      
      case 'strong':
        const strongText = (node as Strong).children.map(child => this.toMarkdown(child)).join('');
        return `**${strongText}**`;
      
      case 'emphasis':
        const emphasisText = (node as Emphasis).children.map(child => this.toMarkdown(child)).join('');
        return `*${emphasisText}*`;
      
      case 'inlineCode':
        return `\`${(node as Code).value}\``;
      
      case 'link':
        const link = node as Link;
        const linkText = link.children.map(child => this.toMarkdown(child)).join('');
        return `[${linkText}](${link.url})`;
      
      case 'code':
        const codeBlock = node as CodeBlock;
        return `\`\`\`${codeBlock.lang || ''}\n${codeBlock.value}\n\`\`\``;
      
      case 'blockquote':
        const blockquoteText = (node as Blockquote).children.map(child => this.toMarkdown(child)).join('\n');
        return blockquoteText.split('\n').map(line => `> ${line}`).join('\n');
      
      case 'thematicBreak':
        return '---';
      
      default:
        return '';
    }
  }
  
  static getTextContent(node: ASTNode): string {
    if (node.type === 'text') {
      return (node as Text).value;
    }
    
    if ('children' in node && Array.isArray(node.children)) {
      return node.children.map(child => this.getTextContent(child)).join('');
    }
    
    if (node.type === 'code') {
      return (node as CodeBlock).value;
    }
    
    if (node.type === 'inlineCode') {
      return (node as Code).value;
    }
    
    return '';
  }
}

// Convert our simple StateNode to proper AST
export function stateNodeToAST(stateNode: any): ASTNode {
  // This would convert our current simple format to proper AST
  // Implementation depends on how we want to bridge the formats
  throw new Error('Not implemented yet');
}

// Convert proper AST to our simple StateNode format (for backward compatibility)
export function astToStateNode(astNode: ASTNode): any {
  // This would convert proper AST back to our simple format
  // Implementation depends on how we want to bridge the formats
  throw new Error('Not implemented yet');
} 