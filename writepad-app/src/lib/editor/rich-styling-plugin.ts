import { Decoration, ViewPlugin, type PluginValue } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view';
import type { Range } from '@codemirror/state';

// Elements that should be styled as rich text
const richElements = [
  'InlineCode',
  'Emphasis', 
  'StrongEmphasis',
  'FencedCode',
  'Link',
  'ATXHeading1',
  'ATXHeading2', 
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
  'Strikethrough',
  'HorizontalRule',
  'Blockquote'
];

// Markup that should be hidden when not at cursor
const hiddenMarkup = [
  'HardBreak',
  'LinkMark',
  'EmphasisMark', 
  'CodeMark',
  'HeaderMark',
  'URL',
  'QuoteMark',
  'TaskMarker',
  'TableDelimiter'
];

// Create decorations
const decorationHidden = Decoration.mark({ class: 'wp-markup-hidden' });
const decorationBullet = Decoration.mark({ class: 'wp-list-bullet' });
const decorationCode = Decoration.mark({ class: 'wp-code-block' });
const decorationHeading = Decoration.mark({ class: 'wp-heading' });
const decorationEmphasis = Decoration.mark({ class: 'wp-emphasis' });
const decorationStrong = Decoration.mark({ class: 'wp-strong' });
const decorationInlineCode = Decoration.mark({ class: 'wp-inline-code' });
const decorationLink = Decoration.mark({ class: 'wp-link' });
const decorationStrikethrough = Decoration.mark({ class: 'wp-strikethrough' });
const decorationBlockquote = Decoration.mark({ class: 'wp-blockquote' });
const decorationHorizontalRule = Decoration.mark({ class: 'wp-horizontal-rule' });

class RichStylingPlugin implements PluginValue {
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
        from,
        to,
        enter(node) {
          const cursorInNode = cursor.from >= node.from && cursor.to <= node.to;
          
          // Handle different node types
          switch (node.name) {
            case 'FencedCode':
              widgets.push(decorationCode.range(node.from, node.to));
              break;
              
            case 'ATXHeading1':
            case 'ATXHeading2':
            case 'ATXHeading3':
            case 'ATXHeading4':
            case 'ATXHeading5':
            case 'ATXHeading6':
              if (!cursorInNode) {
                widgets.push(decorationHeading.range(node.from, node.to));
              }
              break;
              
            case 'Emphasis':
              if (!cursorInNode) {
                widgets.push(decorationEmphasis.range(node.from, node.to));
              }
              break;
              
            case 'StrongEmphasis':
              if (!cursorInNode) {
                widgets.push(decorationStrong.range(node.from, node.to));
              }
              break;
              
            case 'InlineCode':
              if (!cursorInNode) {
                widgets.push(decorationInlineCode.range(node.from, node.to));
              }
              break;
              
            case 'Link':
            case 'Autolink':
              if (!cursorInNode) {
                widgets.push(decorationLink.range(node.from, node.to));
              }
              break;
              
            case 'Strikethrough':
              if (!cursorInNode) {
                widgets.push(decorationStrikethrough.range(node.from, node.to));
              }
              break;
              
            case 'Blockquote':
              if (!cursorInNode) {
                widgets.push(decorationBlockquote.range(node.from, node.to));
              }
              break;
              
            case 'HorizontalRule':
              widgets.push(decorationHorizontalRule.range(node.from, node.to));
              break;
              
            case 'ListMark':
              // Hide list markers and replace with bullets
              if (node.matchContext(['BulletList', 'ListItem']) &&
                  cursor.from !== node.from && cursor.from !== node.from + 1) {
                widgets.push(decorationBullet.range(node.from, node.to));
              }
              break;
              
            case 'HeaderMark':
              // Hide header marks (###) when not at cursor
              if (!cursorInNode) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
              
            case 'EmphasisMark':
            case 'CodeMark': 
            case 'LinkMark':
            case 'QuoteMark':
            case 'TaskMarker':
            case 'TableDelimiter':
              // Hide markup when not at cursor
              if (!cursorInNode) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
              
            case 'URL':
              // Hide URLs in links when not at cursor
              if (!cursorInNode) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
          }

          // Skip processing children if this is a rich element and cursor is inside
          if (richElements.includes(node.name) && cursorInNode) {
            return false;
          }
        }
      });
    }

    return Decoration.set(widgets);
  }
}

export const richStylingPlugin = ViewPlugin.fromClass(RichStylingPlugin, {
  decorations: v => v.decorations
}); 