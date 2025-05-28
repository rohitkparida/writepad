// Complete parser ported from cub-editor with all features
import type { StateNode } from './shared';

interface ParseContext {
  parseInline: (text: string) => (StateNode | string)[];
  lines: string[];
  index: number;
}

// Inline parser with complete formatting support
function parseInline(text: string): (StateNode | string)[] {
  const state = {
    index: 0,
    string: text,
    tokens: [] as (StateNode | string)[],
    parse(start: number, end: number) {
      return parseInline(text.slice(start, end));
    }
  };

  while (state.index < text.length) {
    let parsed = false;
    
    // Try link first - [text](url)
    if (tryLink(state)) {
      parsed = true;
    }
    // Try strong (bold) - **text** or __text__
    else if (tryStrong(state)) {
      parsed = true;
    }
    // Try emphasis (italic) - *text* or _text_
    else if (tryEmphasis(state)) {
      parsed = true;
    }
    // Try strikethrough - ~~text~~
    else if (tryStrikethrough(state)) {
      parsed = true;
    }
    // Try underline - ~text~
    else if (tryUnderline(state)) {
      parsed = true;
    }
    // Try mark/highlight - ::text::
    else if (tryMark(state)) {
      parsed = true;
    }
    // Try reference - [[text]]
    else if (tryReference(state)) {
      parsed = true;
    }
    // Try code - `text`
    else if (tryCode(state)) {
      parsed = true;
    }
    // Try file - [file:path]
    else if (tryFile(state)) {
      parsed = true;
    }
    // Try image - [image:path]
    else if (tryImage(state)) {
      parsed = true;
    }
    // Try tag - #tag
    else if (tryTag(state)) {
      parsed = true;
    }
    // Default to text
    else {
      addText(state);
      parsed = true;
    }
  }

  return state.tokens;
}

const WHITESPACE = /\s/;

function findCloseIndex(state: any, match: string): number {
  for (let n = state.index + match.length; n < state.string.length; n++) {
    const char = state.string.substring(n, n + match.length);
    if (char === match && !WHITESPACE.test(state.string[n - 1])) {
      return n;
    }
  }
  return -1;
}

function findCloseIndexSimple(state: any, start: number, match: string): number {
  for (let n = start; n < state.string.length; n++) {
    if (state.string[n] === match) return n;
  }
  return -1;
}

function getChars(chars: string | { open: string; close: string }) {
  if (typeof chars === 'string') {
    return { open: chars, close: chars };
  }
  return chars;
}

function matchChars(CHARS: (string | { open: string; close: string })[], state: any, index: number) {
  for (const chars of CHARS) {
    const chars2 = getChars(chars);
    const slice = state.string.substring(index, index + chars2.open.length);
    if (slice === chars2.open) return chars2;
  }
}

function create(CHARS: (string | { open: string; close: string })[], type: string, richContent = true, contentRequired = false) {
  return function (state: any): boolean {
    const char = matchChars(CHARS, state, state.index);
    if (!char) return false;

    const nextChar = state.string[state.index + char.open.length];
    if (!nextChar || WHITESPACE.test(nextChar)) return false;

    const closeIndex = findCloseIndex(state, char.close);
    if (closeIndex === -1) return false;

    if (contentRequired && closeIndex === state.index + char.open.length) return false;

    const content = richContent ?
      state.parse(state.index + char.open.length, closeIndex) :
      [state.string.slice(state.index + char.open.length, closeIndex)];
    state.tokens.push({
      type,
      content: [
        char.open,
        ...content,
        char.close
      ]
    });
    state.index = closeIndex + char.close.length;

    return true;
  };
}

// Link parser - [text](url)
function tryLink(state: any): boolean {
  const OPEN_BRACKET = '[';
  const CLOSE_BRACKET = ']';
  const OPEN_PAR = '(';
  const CLOSE_PAR = ')';

  if (state.string[state.index] !== OPEN_BRACKET) return false;

  const closeBracketIndex = findCloseIndexSimple(state, state.index, CLOSE_BRACKET);
  if (closeBracketIndex === -1) return false;
  if (state.index === closeBracketIndex - 1) return false;

  const text = state.string.slice(state.index + 1, closeBracketIndex);
  if (text.includes(OPEN_BRACKET)) return false;

  if (state.string[closeBracketIndex + 1] !== OPEN_PAR) return false;

  const closeParIndex = findCloseIndexSimple(state, state.index, CLOSE_PAR);
  if (closeParIndex === -1) return false;

  const url = state.string.slice(closeBracketIndex + 2, closeParIndex);
  if (url.includes(OPEN_PAR)) return false;

  // No url
  if (closeBracketIndex === closeParIndex - 2) return false;

  state.tokens.push({
    type: 'link',
    content: [
      OPEN_BRACKET,
      text,
      CLOSE_BRACKET,
      OPEN_PAR,
      url,
      CLOSE_PAR
    ]
  });
  state.index = closeParIndex + 1;

  return true;
}

// Create all inline parsers using the factory function
const tryEmphasis = create(['*', '_'], 'em');
const tryStrong = create(['**', '__'], 'strong');
const tryUnderline = create(['~'], 'underline');
const tryStrikethrough = create(['~~'], 'strikethrough');
const tryMark = create(['::'], 'mark');
const tryReference = create([{ open: '[[', close: ']]'}], 'reference');
const tryCode = create(['`'], 'code', false);
const tryFile = create([{ open: '[file:', close: ']'}], 'file', false);
const tryImage = create([{ open: '[image:', close: ']'}], 'image', false);
const tryTag = create(['#'], 'tag', false, true);

function addText(state: any): void {
  if (typeof state.tokens[state.tokens.length - 1] !== 'string') {
    state.tokens.push('');
  }
  state.tokens[state.tokens.length - 1] += state.string[state.index];
  state.index++;
}

// Block parsers
const HEADING = /^(#{1,6}) /;
const HR = /^(-{3,}|\*{3,}|_{3,})$/;
const TODO_ITEM = /^(\s*)(- \[(?: |x)\])( )/;
const ORDERED_ITEM = /^(\s*)(\d+)(\.) /;
const UNORDERED_ITEM = /^(\s*)([*-]) /;
const BLOCKQUOTE = /^(>) /;

function matchLine(regex: RegExp, type: string) {
  return ({ lines, index, parseInline }: ParseContext): StateNode | null => {
    const line = lines[index];
    const match = regex.exec(line);
    if (!match) return null;

    const matches = match.slice(1);
    return {
      type,
      content: [
        ...matches,
        ...parseInline(line.slice(matches.join('').length))
      ],
      length: 1
    };
  };
}

// Code block parser
const OPEN = /^(`{3})(.*)$/;
const CLOSE = /^`{3,}.*$/;

function findClosingLine({ lines, index }: { lines: string[]; index: number }): number {
  for (let n = index + 1; n < lines.length; n++) {
    if (CLOSE.test(lines[n])) return n;
  }
  return -1;
}

function codeBlock({ lines, index }: ParseContext): StateNode | null {
  const line = lines[index];
  let match;
  if (!(match = OPEN.exec(line))) return null;

  const closingLineIndex = findClosingLine({ lines, index });
  if (closingLineIndex === -1) return null;

  const content = index + 1 === closingLineIndex ?
    [''] :
    [lines.slice(index + 1, closingLineIndex).join('\n'), '\n'];

  return {
    type: 'code_block',
    content: [
      match[1],
      match[2],
      '\n',
      ...content,
      lines[closingLineIndex]
    ],
    length: closingLineIndex - index + 1
  };
}

// All block parsers
const heading = matchLine(HEADING, 'heading');
const horizontalRule = matchLine(HR, 'horizontal_rule');
const todoItem = matchLine(TODO_ITEM, 'todo_item');
const orderedList = matchLine(ORDERED_ITEM, 'ordered_list_item');
const unorderedList = matchLine(UNORDERED_ITEM, 'unordered_list_item');
const blockquote = matchLine(BLOCKQUOTE, 'blockquote');

function paragraph({ parseInline, lines, index }: ParseContext): StateNode | null {
  const line = lines[index];
  if (!line.trim()) return null;
  
  return {
    type: 'paragraph',
    content: parseInline(line),
    length: 1
  };
}

const parsers = [
  codeBlock,
  heading,
  horizontalRule,
  todoItem,
  orderedList,
  unorderedList,
  blockquote,
  paragraph
];

export default function* parseBlock(value: string | string[], typeOnly = false): Generator<StateNode> {
  let index = 0;
  const lines = Array.isArray(value) ? value : value.split('\n');

  while (index < lines.length) {
    let parsed = false;
    
    for (const parser of parsers) {
      const result = parser({
        parseInline: typeOnly ? (string: string) => [string] : parseInline,
        lines, 
        index
      });
      
      if (result) {
        index += result.length || 1;
        yield result;
        parsed = true;
        break;
      }
    }
    
    if (!parsed) {
      // Fallback - create empty paragraph for empty lines
      yield {
        type: 'paragraph',
        content: [''],
        length: 1
      };
      index++;
    }
  }
} 