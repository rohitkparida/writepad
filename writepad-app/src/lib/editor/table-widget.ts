import { Decoration, WidgetType, EditorView } from '@codemirror/view';
import { RangeSet, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

import type { DecorationSet } from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';

class TableWidget extends WidgetType {
  rendered: string;

  constructor(public source: string) {
    super();
    this.rendered = this.parseAndRenderTable(source);
  }

  eq(widget: TableWidget): boolean {
    return widget.source === this.source;
  }

  toDOM(): HTMLElement {
    const content = document.createElement('div');
    content.setAttribute('contenteditable', 'false');
    content.className = 'cm-writepad-renderBlock';
    content.innerHTML = this.rendered;
    return content;
  }

  ignoreEvent(): boolean {
    return false;
  }

  private parseAndRenderTable(source: string): string {
    // Parse the markdown table and convert to HTML
    const lines = source.trim().split('\n');
    if (lines.length < 2) return source;

    const headerLine = lines[0];
    const separatorLine = lines[1];
    const dataLines = lines.slice(2);

    // Parse header
    const headers = this.parseTableRow(headerLine);
    if (headers.length === 0) return source;

    // Parse alignment from separator line
    const alignments = this.parseAlignments(separatorLine, headers.length);

    // Parse data rows
    const rows = dataLines.map(line => this.parseTableRow(line)).filter(row => row.length > 0);

    // Generate HTML
    let html = '<table class="writepad-table">';
    
    // Header
    html += '<thead><tr>';
    headers.forEach((header, index) => {
      const align = alignments[index];
      const alignAttr = align !== 'default' ? ` style="text-align: ${align}"` : '';
      html += `<th${alignAttr}>${this.escapeHtml(header.trim())}</th>`;
    });
    html += '</tr></thead>';

    // Body
    if (rows.length > 0) {
      html += '<tbody>';
      rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, index) => {
          const align = alignments[index];
          const alignAttr = align !== 'default' ? ` style="text-align: ${align}"` : '';
          html += `<td${alignAttr}>${this.escapeHtml(cell.trim())}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody>';
    }

    html += '</table>';
    return html;
  }

  private parseTableRow(line: string): string[] {
    // Remove leading/trailing pipes and split by pipes
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      return [];
    }
    
    const content = trimmed.slice(1, -1); // Remove outer pipes
    return content.split('|');
  }

  private parseAlignments(separatorLine: string, columnCount: number): string[] {
    const cells = this.parseTableRow(separatorLine);
    const alignments: string[] = [];

    for (let i = 0; i < columnCount; i++) {
      const cell = cells[i] || '';
      const trimmed = cell.trim();
      
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) {
        alignments.push('center');
      } else if (trimmed.endsWith(':')) {
        alignments.push('right');
      } else if (trimmed.startsWith(':')) {
        alignments.push('left');
      } else {
        alignments.push('default');
      }
    }

    return alignments;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

function replaceTableBlocks(state: EditorState, from?: number, to?: number) {
  const decorations: Range<Decoration>[] = [];
  const [cursor] = state.selection.ranges;

  syntaxTree(state).iterate({
    from, to,
    enter(node) {
      if (node.name !== 'Table') return;

      // Don't replace table when cursor is inside it
      if (cursor.from >= node.from && cursor.to <= node.to) {
        return false;
      }

      const text = state.doc.sliceString(node.from, node.to);
      const decoration = Decoration.replace({
        widget: new TableWidget(text),
        block: true,
      });

      decorations.push(decoration.range(node.from, node.to));
    }
  });

  return decorations;
}

export const tableWidgetField = StateField.define<DecorationSet>({
  create(state) {
    return RangeSet.of(replaceTableBlocks(state), true);
  },

  update(decorations, transaction) {
    return RangeSet.of(replaceTableBlocks(transaction.state), true);
  },

  provide(field) {
    return EditorView.decorations.from(field);
  },
});

// Event handler for clicking in rendered tables
export const tableEventHandler = {
  mousedown(event: MouseEvent, view: EditorView) {
    const target = event.target as Element;
    if (target && target.closest('.cm-writepad-renderBlock table')) {
      // Find the position in the document corresponding to the clicked element
      const pos = view.posAtDOM(target);
      if (pos !== null) {
        view.dispatch({ selection: { anchor: pos } });
      }
    }
    return false;
  }
}; 