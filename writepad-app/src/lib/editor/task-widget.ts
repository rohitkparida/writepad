import { Decoration, WidgetType, EditorView } from '@codemirror/view';
import { RangeSet, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

import type { DecorationSet } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';

class TaskListWidget extends WidgetType {
  rendered: string;

  constructor(public source: string) {
    super();
    this.rendered = this.parseAndRenderTaskList(source);
  }

  eq(widget: TaskListWidget): boolean {
    return widget.source === this.source;
  }

  toDOM(): HTMLElement {
    const content = document.createElement('div');
    content.setAttribute('contenteditable', 'false');
    content.className = 'cm-writepad-renderBlock cm-writepad-tasklist';
    content.innerHTML = this.rendered;
    
    // Add event listeners for checkbox interactions
    content.addEventListener('click', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'checkbox') {
        // Prevent default checkbox behavior and stop propagation to prevent cursor movement
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        // Find the corresponding line in the source
        const taskItem = target.closest('.writepad-task');
        if (taskItem) {
          const taskIndex = Array.from(content.querySelectorAll('.writepad-task')).indexOf(taskItem);
          this.toggleTask(taskIndex);
        }
      }
    });

    // Also prevent mousedown events on checkboxes from reaching the editor
    content.addEventListener('mousedown', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'checkbox') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    });
    
    return content;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private parseAndRenderTaskList(source: string): string {
    const lines = source.trim().split('\n');
    let html = '<ul class="writepad-tasklist">';
    
    lines.forEach(line => {
      const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        const [, indent, checkState, text] = taskMatch;
        const isChecked = checkState.toLowerCase() === 'x';
        const indentLevel = Math.floor(indent.length / 2); // 2 spaces = 1 indent level
        
        const indentStyle = indentLevel > 0 ? ` style="margin-left: ${indentLevel * 20}px"` : '';
        const checkedAttr = isChecked ? ' checked' : '';
        const completedClass = isChecked ? ' completed' : '';
        
        html += `<li class="writepad-task${completedClass}"${indentStyle}>`;
        html += `<input type="checkbox"${checkedAttr}>`;
        html += `<span class="task-text">${this.escapeHtml(text.trim())}</span>`;
        html += '</li>';
      } else {
        // Handle regular list items or other content
        const listMatch = line.match(/^(\s*)-\s*(.*)$/);
        if (listMatch) {
          const [, indent, text] = listMatch;
          const indentLevel = Math.floor(indent.length / 2);
          const indentStyle = indentLevel > 0 ? ` style="margin-left: ${indentLevel * 20}px"` : '';
          
          html += `<li class="writepad-list-item"${indentStyle}>`;
          html += `<span class="list-bullet">•</span>`;
          html += `<span class="list-text">${this.escapeHtml(text.trim())}</span>`;
          html += '</li>';
        }
      }
    });
    
    html += '</ul>';
    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private toggleTask(taskIndex: number): void {
    // Parse the source to find the specific task line
    const lines = this.source.trim().split('\n');
    let currentTaskIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      
      if (taskMatch) {
        if (currentTaskIndex === taskIndex) {
          const [, indent, checkState, text] = taskMatch;
          const isChecked = checkState.toLowerCase() === 'x';
          const newCheckState = isChecked ? ' ' : 'x';
          lines[i] = `${indent}- [${newCheckState}] ${text}`;
          
          // Emit event with updated source
          const event = new CustomEvent('updateTaskSource', {
            detail: { 
              originalSource: this.source,
              updatedSource: lines.join('\n'),
              lineIndex: i
            }
          });
          document.dispatchEvent(event);
          break;
        }
        currentTaskIndex++;
      }
    }
  }
}

function replaceTaskListBlocks(state: EditorState, from?: number, to?: number) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;

  syntaxTree(state).iterate({
    from, to,
    enter(node) {
      // Look for BulletList that contains Task items
      if (node.name !== 'BulletList') return;

      // Check if this list contains any tasks by examining the source text
      const text = state.doc.sliceString(node.from, node.to);
      const hasTask = /^\s*-\s*\[([ xX])\]/m.test(text);

      if (!hasTask) return;

      // Don't replace task list when cursor is inside it
      if (cursor.from >= node.from && cursor.to <= node.to) {
        return false;
      }

      const decoration = Decoration.replace({
        widget: new TaskListWidget(text),
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));
    }
  });

  return decorations;
}

export const taskWidgetField = StateField.define<DecorationSet>({
  create(state) {
    return RangeSet.of(replaceTaskListBlocks(state), true);
  },

  update(decorations, transaction) {
    return RangeSet.of(replaceTaskListBlocks(transaction.state), true);
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});

// Event handler for clicking in rendered task lists
export const taskEventHandler = {
  mousedown(event: MouseEvent, view: EditorView) {
    const target = event.target as Element;
    
    // If clicking on a checkbox, don't move cursor
    if (target && (target as HTMLInputElement).type === 'checkbox') {
      return true; // Prevent default cursor positioning
    }
    
    if (target && target.closest('.cm-writepad-tasklist')) {
      // Find the position in the document corresponding to the clicked element
      const pos = view.posAtDOM(target);
      if (pos !== null) {
        view.dispatch({ selection: { anchor: pos } });
      }
    }
    return false;
  }
}; 