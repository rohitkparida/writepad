import { EditorView, keymap, lineNumbers, drawSelection, highlightSpecialChars } from '@codemirror/view';
import { EditorState, type Extension, StateField, StateEffect } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM, Table, TaskList, Strikethrough } from '@lezer/markdown';
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { createRichStylingPlugin } from './rich-styling-plugin.js';
import { tableWidgetField, tableEventHandler } from './table-widget.js';
import { taskLineDecorationField, taskLineEventHandler, taskLineTheme } from './task-line-decoration.js';
import { codeWidgetField, codeEventHandler } from './code-widget.js';
import { wysiwygKeymap } from './wysiwyg-keymap.js';
import { wysiwygCommands, type CommandType } from './wysiwyg-commands.js';
import './rich-styling.css';
import './table-widget.css';
import './code-widget.css';

// Create a custom highlight style for our markdown
const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, fontSize: '1.6em', fontWeight: 'bold' },
  { tag: tags.heading2, fontSize: '1.4em', fontWeight: 'bold' },
  { tag: tags.heading3, fontSize: '1.2em', fontWeight: 'bold' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#6b7280' },
  { tag: tags.link, color: '#0969da', textDecoration: 'underline' },
  { tag: tags.monospace, fontFamily: 'monospace', backgroundColor: '#f6f8fa', padding: '2px 4px', borderRadius: '3px' },
  { tag: tags.quote, color: '#656d76', fontStyle: 'italic' },
  { tag: tags.list, color: '#0969da' }
]);

// Create our own basic setup
const basicExtensions: Extension[] = [
  lineNumbers(),
  foldGutter(),
  drawSelection(),
  highlightSpecialChars(),
  history(),
  indentOnInput(),
  bracketMatching(),
  keymap.of([...defaultKeymap, ...historyKeymap])
];

export class CodeMirrorEditor {
  private view: EditorView;
  private container: HTMLElement;
  private wysiwygMode: boolean = false;

  constructor(container: HTMLElement, initialContent: string = '', wysiwygMode: boolean = false) {
    this.container = container;
    this.wysiwygMode = wysiwygMode;
    
    // Clear the container
    container.innerHTML = '';
    
    // Create the editor state
    const state = EditorState.create({
      doc: initialContent,
      extensions: this.createExtensions()
    });

    // Create the editor view
    this.view = new EditorView({
      state,
      parent: container
    });
  }

  private createExtensions(): Extension[] {
    const extensions = [
      ...basicExtensions,
      markdown({
        extensions: [GFM, Table, TaskList, Strikethrough]
      }),
      syntaxHighlighting(markdownHighlightStyle),
      createRichStylingPlugin(this.wysiwygMode),
      tableWidgetField,
      taskLineDecorationField,
      taskLineTheme,
      codeWidgetField,
      EditorView.domEventHandlers({
        mousedown: (event: MouseEvent, view: EditorView) => {
          // Try task line handler first
          const taskResult = taskLineEventHandler.mousedown(event, view);
          if (taskResult === true) {
            return true; // Stop processing if task handler says to prevent default
          }
          
          // Try table handler
          const tableResult = tableEventHandler.mousedown(event, view);
          if (tableResult !== false) {
            return tableResult;
          }
          
          // Try code handler
          const codeResult = codeEventHandler.mousedown(event, view);
          if (codeResult !== false) {
            return codeResult;
          }
          
          return false;
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: '16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          height: '100%'
        },
        '.cm-content': {
          padding: '20px',
          lineHeight: '1.6',
          minHeight: '400px'
        },
        '.cm-focused': {
          outline: 'none'
        },
        '.cm-editor': {
          borderRadius: this.wysiwygMode ? '0 0 8px 8px' : '8px',
          border: '1px solid #e1e5e9',
          height: '100%'
        },
        '.cm-scroller': {
          background: 'white',
          overflowY: 'auto',
          height: '100%'
        }
      })
    ];

    // Add WYSIWYG keymap if in WYSIWYG mode
    if (this.wysiwygMode) {
      extensions.push(wysiwygKeymap);
    }

    return extensions;
  }

  setValue(content: string) {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      }
    });
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  focus() {
    this.view.focus();
  }

  destroy() {
    this.view.destroy();
  }

  getView(): EditorView {
    return this.view;
  }

  // Execute WYSIWYG commands
  executeCommand(command: CommandType, value?: any): boolean {
    if (wysiwygCommands[command]) {
      return wysiwygCommands[command].execute(this.view, value);
    }
    return false;
  }

  // Update WYSIWYG mode
  setWysiwygMode(enabled: boolean) {
    this.wysiwygMode = enabled;
    
    // Recreate extensions with new WYSIWYG mode
    this.view.dispatch({
      effects: StateEffect.reconfigure.of(this.createExtensions())
    });
  }

  isWysiwygMode(): boolean {
    return this.wysiwygMode;
  }
} 