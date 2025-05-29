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
  wysiwygMode: boolean;

  constructor(view: EditorView, wysiwygMode: boolean = false) {
    this.wysiwygMode = wysiwygMode;
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
    const wysiwygMode = this.wysiwygMode; // Capture for use in iterator

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          const cursorInNode = cursor.from >= node.from && cursor.to <= node.to;
          // In WYSIWYG mode, always hide syntax regardless of cursor position
          const shouldHideSyntax = wysiwygMode || !cursorInNode;
          
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
              if (shouldHideSyntax) {
                widgets.push(decorationHeading.range(node.from, node.to));
              }
              break;
              
            case 'Emphasis':
              if (shouldHideSyntax) {
                widgets.push(decorationEmphasis.range(node.from, node.to));
              }
              break;
              
            case 'StrongEmphasis':
              if (shouldHideSyntax) {
                widgets.push(decorationStrong.range(node.from, node.to));
              }
              break;
              
            case 'InlineCode':
              if (shouldHideSyntax) {
                widgets.push(decorationInlineCode.range(node.from, node.to));
              }
              break;
              
            case 'Link':
            case 'Autolink':
              if (shouldHideSyntax) {
                widgets.push(decorationLink.range(node.from, node.to));
              }
              break;
              
            case 'Strikethrough':
              if (shouldHideSyntax) {
                widgets.push(decorationStrikethrough.range(node.from, node.to));
              }
              break;
              
            case 'Blockquote':
              if (shouldHideSyntax) {
                widgets.push(decorationBlockquote.range(node.from, node.to));
              }
              break;
              
            case 'HorizontalRule':
              widgets.push(decorationHorizontalRule.range(node.from, node.to));
              break;
              
            case 'ListMark':
              // Hide list markers and replace with bullets
              if (node.matchContext(['BulletList', 'ListItem']) &&
                  (wysiwygMode || (cursor.from !== node.from && cursor.from !== node.from + 1))) {
                widgets.push(decorationBullet.range(node.from, node.to));
              }
              break;
              
            case 'HeaderMark':
              // Hide header marks (###) when not at cursor or in WYSIWYG mode
              if (shouldHideSyntax) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
              
            case 'EmphasisMark':
            case 'CodeMark': 
            case 'LinkMark':
            case 'QuoteMark':
            case 'TaskMarker':
            case 'TableDelimiter':
              // Hide markup when not at cursor or in WYSIWYG mode
              if (shouldHideSyntax) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
              
            case 'URL':
              // Hide URLs in links when not at cursor or in WYSIWYG mode
              if (shouldHideSyntax) {
                widgets.push(decorationHidden.range(node.from, node.to));
              }
              break;
          }

          // Skip processing children if this is a rich element and cursor is inside (unless WYSIWYG mode)
          if (richElements.includes(node.name) && cursorInNode && !wysiwygMode) {
            return false;
          }
        }
      });
    }

    return Decoration.set(widgets);
  }
}

// Export a factory function that accepts wysiwygMode
export function createRichStylingPlugin(wysiwygMode: boolean = false) {
  return ViewPlugin.fromClass(
    class extends RichStylingPlugin {
      constructor(view: EditorView) {
        super(view, wysiwygMode);
      }
    },
    {
      decorations: v => v.decorations
    }
  );
}

// Keep the original export for backward compatibility
export const richStylingPlugin = createRichStylingPlugin(false); 