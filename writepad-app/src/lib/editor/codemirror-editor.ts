import { EditorView, keymap, lineNumbers, drawSelection, highlightSpecialChars } from '@codemirror/view';
import { EditorState, type Extension } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM, Table, TaskList, Strikethrough } from '@lezer/markdown';
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldGutter } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { tags } from '@lezer/highlight';
import { richStylingPlugin } from './rich-styling-plugin.js';
import { tableWidgetField, tableEventHandler } from './table-widget.js';
import { taskWidgetField, taskEventHandler } from './task-widget.js';
import './rich-styling.css';
import './table-widget.css';
import './task-widget.css';

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
  private taskToggleListener: (event: Event) => void;

  constructor(container: HTMLElement, initialContent: string = '') {
    this.container = container;
    
    // Clear the container
    container.innerHTML = '';
    
    // Create the task toggle listener
    this.taskToggleListener = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { originalSource, updatedSource } = customEvent.detail;
      
      // Find the position of the original source in the document
      const doc = this.view.state.doc;
      const docText = doc.toString();
      const sourceIndex = docText.indexOf(originalSource);
      
      if (sourceIndex !== -1) {
        // Replace the original source with the updated source
        this.view.dispatch({
          changes: {
            from: sourceIndex,
            to: sourceIndex + originalSource.length,
            insert: updatedSource
          }
        });
      }
    };

    // Create the editor state
    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        ...basicExtensions,
        markdown({
          extensions: [GFM, Table, TaskList, Strikethrough]
        }),
        syntaxHighlighting(markdownHighlightStyle),
        richStylingPlugin,
        tableWidgetField,
        taskWidgetField,
        EditorView.domEventHandlers({
          mousedown: (event: MouseEvent, view: EditorView) => {
            // Try task handler first for checkboxes
            const taskResult = taskEventHandler.mousedown(event, view);
            if (taskResult === true) {
              return true; // Stop processing if task handler says to prevent default
            }
            
            // Try table handler
            const tableResult = tableEventHandler.mousedown(event, view);
            if (tableResult !== false) {
              return tableResult;
            }
            
            return false;
          }
        }),
        EditorView.theme({
          '&': {
            fontSize: '16px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
            borderRadius: '8px',
            border: '1px solid #e1e5e9'
          },
          '.cm-scroller': {
            background: 'white'
          }
        })
      ]
    });

    // Create the editor view
    this.view = new EditorView({
      state,
      parent: container
    });

    // Add event listener for task toggles
    this.setupTaskToggleListener();
  }

  private setupTaskToggleListener() {
    document.addEventListener('updateTaskSource', this.taskToggleListener);
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
    document.removeEventListener('updateTaskSource', this.taskToggleListener);
  }

  getView(): EditorView {
    return this.view;
  }
} 