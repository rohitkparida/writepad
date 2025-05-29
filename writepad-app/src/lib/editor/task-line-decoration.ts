import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';
import { StateField } from '@codemirror/state';
import { RangeSet } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { EditorState, Range } from '@codemirror/state';

// Line decoration for task list items
function createTaskLineDecorations(state: EditorState, from?: number, to?: number): Range<Decoration>[] {
  const decorations: Range<Decoration>[] = [];
  const doc = state.doc.toString();

  syntaxTree(state).iterate({
    from, to,
    enter(node) {
      if (node.name === 'Task') {
        // Find the start of the line containing this task
        const lineStart = doc.lastIndexOf('\n', node.from) + 1;
        const lineEnd = doc.indexOf('\n', node.to);
        const actualLineEnd = lineEnd === -1 ? doc.length : lineEnd;
        
        // Check if task is completed
        let isCompleted = false;
        node.node.cursor().iterate((child: any) => {
          if (child.name === 'TaskMarker') {
            const markerText = doc.slice(child.from, child.to);
            isCompleted = markerText.includes('x') || markerText.includes('X');
            return false; // Stop iteration
          }
        });

        // Create line decoration with appropriate CSS class
        const decoration = Decoration.line({
          class: isCompleted ? 'cm-task-line cm-task-completed' : 'cm-task-line cm-task-pending',
          attributes: {
            'data-task-state': isCompleted ? 'completed' : 'pending'
          }
        });

        decorations.push(decoration.range(lineStart));
      }
    }
  });

  return decorations;
}

// StateField for managing task line decorations
export const taskLineDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return RangeSet.of(createTaskLineDecorations(state), true);
  },

  update(decorations, transaction) {
    if (transaction.docChanged) {
      return RangeSet.of(createTaskLineDecorations(transaction.state), true);
    }
    return decorations.map(transaction.changes);
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});

// Task toggle functionality using position-based detection
export function toggleTaskAtPosition(view: EditorView, pos: number): boolean {
  const state = view.state;
  const doc = state.doc.toString();
  
  // Find the line containing the position
  const line = state.doc.lineAt(pos);
  const lineText = line.text;
  
  // Check if this line contains a task
  const taskMatch = lineText.match(/^(\s*-\s*)\[([ xX])\](.*)$/);
  if (!taskMatch) return false;
  
  const [, prefix, currentState, suffix] = taskMatch;
  const newState = currentState.toLowerCase() === 'x' ? ' ' : 'x';
  const newLineText = `${prefix}[${newState}]${suffix}`;
  
  // Update the line
  view.dispatch({
    changes: {
      from: line.from,
      to: line.to,
      insert: newLineText
    }
  });
  
  return true;
}

// Event handler for task interaction
export const taskLineEventHandler = {
  mousedown(event: MouseEvent, view: EditorView) {
    const target = event.target as Element;
    
    // Check if click is on a task line
    const taskLine = target.closest('.cm-task-line');
    if (!taskLine) return false;
    
    // Get click position in document
    const pos = view.posAtDOM(target);
    if (pos === null) return false;
    
    // Check if click is near the checkbox area (first 20 characters of line)
    const line = view.state.doc.lineAt(pos);
    const clickOffsetInLine = pos - line.from;
    
    if (clickOffsetInLine <= 20) { // Approximate checkbox click area
      return toggleTaskAtPosition(view, pos);
    }
    
    return false;
  }
};

// CSS theme for task line decorations
export const taskLineTheme = EditorView.baseTheme({
  '.cm-task-line': {
    position: 'relative',
    paddingLeft: '24px',
  },
  
  '.cm-task-line::before': {
    content: '""',
    position: 'absolute',
    left: '0',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    border: '2px solid #cbd5e1',
    borderRadius: '3px',
    cursor: 'pointer',
    backgroundColor: 'white',
  },
  
  '.cm-task-completed::before': {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
    backgroundImage: `url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='m13.854 3.646-7.5 7.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6 10.293l7.146-7.147a.5.5 0 0 1 .708.708z'/%3e%3c/svg%3e")`,
  },
  
  '.cm-task-completed': {
    opacity: '0.6',
    textDecoration: 'line-through',
    color: '#6b7280',
  },
  
  '.cm-task-pending::before': {
    backgroundColor: 'white',
    borderColor: '#cbd5e1',
  },
  
  '.cm-task-line:hover::before': {
    borderColor: '#10b981',
  },
  
  // Hide the original markdown checkbox syntax in WYSIWYG mode
  '.cm-task-line .cm-task-marker': {
    display: 'none',
  }
}); 