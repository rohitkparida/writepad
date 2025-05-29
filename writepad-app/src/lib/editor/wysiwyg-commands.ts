import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

export interface WysiwygCommand {
  execute(view: EditorView, value?: any): boolean;
}

// Marker definitions
const MARKERS = {
  'bold': '**',
  'italic': '*',
  'code': '`',
  'strikethrough': '~~'
} as const;

type FormatType = keyof typeof MARKERS;

interface MarkerInfo {
  type: FormatType;
  marker: string;
  pos: number;
  start?: number;
  end?: number;
  openLength?: number;
  closeLength?: number;
}

// Enhanced word boundary detection using character classification
function isWordCharacter(char: string): boolean {
  if (!char) return false;
  
  // Unicode word character categories
  const codePoint = char.codePointAt(0);
  if (!codePoint) return false;
  
  // ASCII alphanumeric
  if ((codePoint >= 48 && codePoint <= 57) ||   // 0-9
      (codePoint >= 65 && codePoint <= 90) ||   // A-Z
      (codePoint >= 97 && codePoint <= 122)) {  // a-z
    return true;
  }
  
  // Underscore
  if (codePoint === 95) return true; // _
  
  // Unicode letters (basic multilingual plane)
  if ((codePoint >= 0x00C0 && codePoint <= 0x00D6) ||
      (codePoint >= 0x00D8 && codePoint <= 0x00F6) ||
      (codePoint >= 0x00F8 && codePoint <= 0x00FF) ||
      (codePoint >= 0x0100 && codePoint <= 0x017F) ||
      (codePoint >= 0x0180 && codePoint <= 0x024F)) {
    return true;
  }
  
  return false;
}

// Helper function to get current selection or word
function getSelectionOrWord(view: EditorView): { from: number; to: number; text: string } {
  const selection = view.state.selection.main;
  
  if (!selection.empty) {
    return {
      from: selection.from,
      to: selection.to,
      text: view.state.sliceDoc(selection.from, selection.to)
    };
  }
  
  // Find word boundaries using character classification
  const pos = selection.head;
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const relativePos = pos - line.from;
  
  // Find word boundaries using enhanced character classification
  let start = relativePos;
  let end = relativePos;
  
  while (start > 0 && isWordCharacter(lineText[start - 1])) {
    start--;
  }
  
  while (end < lineText.length && isWordCharacter(lineText[end])) {
    end++;
  }
  
  return {
    from: line.from + start,
    to: line.from + end,
    text: lineText.slice(start, end)
  };
}

// State machine to analyze formatting context
function analyzeFormatting(text: string, from: number, to: number): FormatType[] {
  const stack: MarkerInfo[] = [];
  const activeFormats: FormatType[] = [];
  
  let i = 0;
  while (i < text.length && i <= to) {
    let matched = false;
    
    // Check two-character markers first (**, ~~)
    for (const [type, marker] of Object.entries(MARKERS)) {
      if (marker.length === 2 && text.slice(i, i + 2) === marker) {
        const formatType = type as FormatType;
        const openIndex = stack.findIndex(s => s.type === formatType);
        
        if (openIndex !== -1) {
          // Closing marker - remove from stack
          stack.splice(openIndex, 1);
        } else {
          // Opening marker - add to stack
          stack.push({ type: formatType, marker, pos: i });
        }
        
        i += 2;
        matched = true;
        break;
      }
    }
    
    // Check single-character markers if no two-char match
    if (!matched) {
      for (const [type, marker] of Object.entries(MARKERS)) {
        if (marker.length === 1 && text[i] === marker) {
          const formatType = type as FormatType;
          const openIndex = stack.findIndex(s => s.type === formatType);
          
          if (openIndex !== -1) {
            stack.splice(openIndex, 1);
          } else {
            stack.push({ type: formatType, marker, pos: i });
          }
          
          i += 1;
          matched = true;
          break;
        }
      }
    }
    
    if (!matched) {
      i += 1;
    }
    
    // If we're within our target range, capture active formats
    if (i >= from && stack.length > 0) {
      const currentFormats = stack.map(s => s.type);
      for (const format of currentFormats) {
        if (!activeFormats.includes(format)) {
          activeFormats.push(format);
        }
      }
    }
  }
  
  return activeFormats;
}

// Find markers that contain the selection
function findMarkersContaining(text: string, from: number, to: number, markerType: FormatType): MarkerInfo[] {
  const markers: MarkerInfo[] = [];
  const stack: MarkerInfo[] = [];
  const targetMarker = MARKERS[markerType];
  
  let i = 0;
  while (i < text.length) {
    if (text.slice(i, i + targetMarker.length) === targetMarker) {
      const openIndex = stack.findIndex(s => s.type === markerType);
      
      if (openIndex !== -1) {
        // Closing marker
        const openMarker = stack[openIndex];
        const markerInfo: MarkerInfo = {
          type: markerType,
          marker: targetMarker,
          pos: openMarker.pos,
          start: openMarker.pos,
          end: i + targetMarker.length,
          openLength: targetMarker.length,
          closeLength: targetMarker.length
        };
        
        // Check if this marker contains our selection
        if (openMarker.pos < from && i + targetMarker.length > to) {
          markers.push(markerInfo);
        }
        
        stack.splice(openIndex, 1);
      } else {
        // Opening marker
        stack.push({ type: markerType, marker: targetMarker, pos: i });
      }
      
      i += targetMarker.length;
    } else {
      i += 1;
    }
  }
  
  return markers;
}

// Remove innermost formatting of specified type
function removeInnerMostFormatting(view: EditorView, markerType: FormatType, from: number, to: number): boolean {
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  const relativeFrom = from - line.from;
  const relativeTo = to - line.from;
  
  const markers = findMarkersContaining(lineText, relativeFrom, relativeTo, markerType);
  
  if (markers.length > 0) {
    // Find innermost marker (last one found)
    const innerMost = markers[markers.length - 1];
    
    // Remove markers from right to left to avoid position shifts
    const changes = [
      {
        from: line.from + innerMost.end! - innerMost.closeLength!,
        to: line.from + innerMost.end!,
        insert: ""
      },
      {
        from: line.from + innerMost.start!,
        to: line.from + innerMost.start! + innerMost.openLength!,
        insert: ""
      }
    ];
    
    view.dispatch({
      changes,
      selection: {
        anchor: from - innerMost.openLength!,
        head: to - innerMost.openLength!
      }
    });
    
    return true;
  }
  
  return false;
}

// Add formatting with context awareness
function addFormattingSmartly(view: EditorView, markerType: FormatType, from: number, to: number, context: FormatType[]): boolean {
  const selectedText = view.state.sliceDoc(from, to);
  const marker = MARKERS[markerType];
  
  // Don't add non-code formatting inside code
  if (context.includes('code') && markerType !== 'code') {
    return false;
  }
  
  // Smart defaults for empty selections
  const defaultText = {
    'bold': 'bold text',
    'italic': 'italic text',
    'code': 'code',
    'strikethrough': 'strikethrough text'
  };
  
  const textToWrap = selectedText || defaultText[markerType];
  const wrapped = `${marker}${textToWrap}${marker}`;
  
  view.dispatch({
    changes: { from, to, insert: wrapped },
    selection: selectedText
      ? { anchor: from + marker.length, head: to + marker.length }
      : { anchor: from + marker.length, head: from + marker.length + textToWrap.length }
  });
  
  return true;
}

// Smart toggle function that handles all formatting types
function toggleFormattingAtPosition(view: EditorView, markerType: FormatType): boolean {
  const { from, to } = getSelectionOrWord(view);
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;
  const relativeFrom = from - line.from;
  const relativeTo = to - line.from;
  
  // Analyze current formatting context
  const context = analyzeFormatting(lineText, relativeFrom, relativeTo);
  const isActive = context.includes(markerType);
  
  if (isActive) {
    return removeInnerMostFormatting(view, markerType, from, to);
  } else {
    return addFormattingSmartly(view, markerType, from, to, context);
  }
}

// Helper function to toggle line prefix (for headings, lists, etc.)
function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const selection = view.state.selection.main;
  const line = view.state.doc.lineAt(selection.from);
  const lineText = line.text;
  
  if (lineText.startsWith(prefix)) {
    // Remove prefix
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length, insert: '' },
      selection: EditorSelection.cursor(Math.max(line.from, selection.from - prefix.length))
    });
  } else {
    // Add prefix
    view.dispatch({
      changes: { from: line.from, to: line.from, insert: prefix },
      selection: EditorSelection.cursor(selection.from + prefix.length)
    });
  }
  
  return true;
}

export const wysiwygCommands = {
  bold: {
    execute: (view: EditorView) => toggleFormattingAtPosition(view, 'bold')
  },
  
  italic: {
    execute: (view: EditorView) => toggleFormattingAtPosition(view, 'italic')
  },
  
  strikethrough: {
    execute: (view: EditorView) => toggleFormattingAtPosition(view, 'strikethrough')
  },
  
  code: {
    execute: (view: EditorView) => toggleFormattingAtPosition(view, 'code')
  },
  
  heading: {
    execute: (view: EditorView, level: number = 1) => {
      const prefix = '#'.repeat(Math.max(1, Math.min(6, level))) + ' ';
      return toggleLinePrefix(view, prefix);
    }
  },
  
  list: {
    execute: (view: EditorView) => toggleLinePrefix(view, '- ')
  },
  
  taskList: {
    execute: (view: EditorView) => toggleLinePrefix(view, '- [ ] ')
  },
  
  link: {
    execute: (view: EditorView) => {
      const { from, to, text } = getSelectionOrWord(view);
      const url = prompt('Enter URL:');
      
      if (url) {
        const linkText = text || 'Link';
        const markdown = `[${linkText}](${url})`;
        
        view.dispatch({
          changes: { from, to, insert: markdown },
          selection: EditorSelection.range(from + 1, from + 1 + linkText.length)
        });
      }
      
      return true;
    }
  },
  
  table: {
    execute: (view: EditorView) => {
      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.from);
      
      const table = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

`;
      
      const insertPos = line.to + 1;
      
      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: table },
        selection: EditorSelection.cursor(insertPos + 2)
      });
      
      return true;
    }
  },
  
  horizontalRule: {
    execute: (view: EditorView) => {
      const selection = view.state.selection.main;
      const line = view.state.doc.lineAt(selection.from);
      
      const hr = '\n---\n\n';
      const insertPos = line.to;
      
      view.dispatch({
        changes: { from: insertPos, to: insertPos, insert: hr },
        selection: EditorSelection.cursor(insertPos + hr.length)
      });
      
      return true;
    }
  }
};

export type CommandType = keyof typeof wysiwygCommands; 