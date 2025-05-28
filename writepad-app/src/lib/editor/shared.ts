// Ported from cub-editor/src/core/shared.js

export interface StateNode {
  type: string;
  content: (StateNode | string)[];
  length?: number;
}

export interface Editor {
  element: HTMLElement;
  state: StateNode[];
  selection: {
    anchorBlock: number;
    focusBlock: number;
    anchorOffset: number;
    focusOffset: number;
  };
  parser: (value: string | string[], typeOnly?: boolean) => Generator<StateNode>;
}

/**
 * Get the index of the top-level element that contains the node
 */
export function findBlockIndex(container: HTMLElement, node: Node, fallback = -1): number {
  if (node === container) return fallback;

  while (node.parentNode !== container) {
    node = node.parentNode!;
  }
  return Array.from(container.children).indexOf(node as Element);
}

export function getChangeIndexes(editor: Editor, event: Event) {
  // Element fired input event
  if (event.target !== editor.element) {
    const blockIndex = findBlockIndex(editor.element, event.target as Node);

    return {
      firstBlockIndex: blockIndex,
      lastBlockIndex: blockIndex
    };
  }

  const { anchorBlock, focusBlock } = editor.selection;
  const firstBlockIndex = Math.min(anchorBlock, focusBlock);
  const lastBlockIndex = Math.max(anchorBlock, focusBlock);

  return { firstBlockIndex, lastBlockIndex };
}

/**
 * Replace non-breaking space with regular
 */
const NON_BREAKING_SPACE = new RegExp(String.fromCharCode(160), 'g');

function normalizeText(text: string): string {
  return text.replace(NON_BREAKING_SPACE, ' ');
}

/**
 * Create an Generator for all text nodes and elements with `data-text` attribute
 */
function* iterateNodes(parent: HTMLElement): Generator<{ node: Node; text: string }> {
  const treeWalker = document.createTreeWalker(
    parent,
    NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node: Node) {
        const accept = node.nodeType === Node.TEXT_NODE || 
          (node as HTMLElement).dataset?.text !== undefined;
        return accept ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  let node = treeWalker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const text = (node as HTMLElement).dataset.text || '';
      yield { node, text };
      node = treeWalker.nextSibling();
    } else {
      const text = normalizeText((node as Text).data);
      yield { node, text };
      node = treeWalker.nextNode();
    }
  }
}

/**
 * Get text of a block
 */
export function getText(node: HTMLElement): string {
  let text = '';

  for (const val of iterateNodes(node)) {
    text += val.text;
  }

  return text;
}

/**
 * Get caret position in a block
 */
export function getOffset(parent: HTMLElement, target: Node, offset: number): number {
  // Start of line
  if (target === parent && offset === 0) return 0;

  if (target.nodeType !== Node.TEXT_NODE) {
    if (target === parent) {
      target = parent.childNodes[offset - 1];
      if ((target as Element).tagName === 'BR') return 0;

      if (target.nodeType === Node.TEXT_NODE) {
        offset = (target as Text).data.length;
      } else if ((target as HTMLElement).dataset && 'text' in (target as HTMLElement).dataset) {
        offset = (target as HTMLElement).dataset.text!.length;
      } else {
        const nodes = Array.from(iterateNodes(target as HTMLElement));
        target = nodes[nodes.length - 1].node;
        offset = nodes[nodes.length - 1].text.length;
      }
    } else {
      // Find nearest preceding node with text
      let current: Node = parent;
      for (const { node } of iterateNodes(parent)) {
        if (
          node.compareDocumentPosition(target) ===
            Node.DOCUMENT_POSITION_PRECEDING
        ) break;
        current = node;
      }
      target = current;
      if (target === parent && offset === 0) return 0;
      offset = (target as HTMLElement).dataset ? 
        (target as HTMLElement).dataset.text!.length : 
        (target as Text).data.length;
    }
  }

  let pos = 0;

  for (const { node, text } of iterateNodes(parent)) {
    if (target === node) {
      return pos + offset;
    }

    pos += text.length;
  }

  return pos;
}

/**
 * Set cursor position in editor
 */
export function setOffset(editor: Editor, caret: [number, number] | { anchor: [number, number], focus: [number, number] }) {
  const [anchorBlock, anchorOffset] = (caret as any).anchor || caret;
  const [focusBlock, focusOffset] = (caret as any).focus || caret;

  console.log('setOffset called:', { anchorBlock, anchorOffset, focusBlock, focusOffset });

  const startEl = editor.element.children[anchorBlock] as HTMLElement;
  const endEl = editor.element.children[focusBlock] as HTMLElement;

  if (!startEl || !endEl) {
    console.log('setOffset: missing elements', { startEl, endEl });
    return;
  }

  const selection = (editor.element.getRootNode() as Document).getSelection();
  if (!selection) {
    console.log('setOffset: no selection');
    return;
  }
  
  selection.removeAllRanges();
  const range = document.createRange();

  const anchorPosition = getOffsetPosition(startEl, anchorOffset);
  console.log('setOffset: anchorPosition', anchorPosition);
  
  try {
    range.setStart(anchorPosition.node, anchorPosition.offset);
    selection.addRange(range);

    if (anchorBlock !== focusBlock || anchorOffset !== focusOffset) {
      const focusPosition = getOffsetPosition(endEl, focusOffset);
      selection.extend(focusPosition.node, focusPosition.offset);
    }
    console.log('setOffset: success');
  } catch (error) {
    console.error('setOffset: error', error);
  }
}

/**
 * Find node and remaining offset for caret position
 */
export function getOffsetPosition(el: HTMLElement, offset: number): { node: Node; offset: number } {
  if (offset < 0) return { node: el, offset: 0 };

  for (let { node, text } of iterateNodes(el)) {
    if (text.length >= offset) {
      if ((node as HTMLElement).dataset && 'text' in (node as HTMLElement).dataset) {
        const prevOffset = offset;
        offset = Array.from(node.parentNode!.childNodes).indexOf(node as ChildNode);
        if (prevOffset >= text.length) offset++;
        node = node.parentNode!;
      }

      return { node, offset };
    }

    offset -= text.length;
  }

  if (offset > 0 && el.nextSibling) {
    // Continue to next block
    return getOffsetPosition(el.nextSibling as HTMLElement, offset - 1);
  }

  return { node: el, offset: 0 };
}

/**
 * Generate a new state array. Replace blocks between `from` and `to`(inclusive)
 * with parsed value of text. Keep unchanged blocks
 */
export function getNewState(editor: Editor, from: number, to: number, text: string): StateNode[] {
  const textBefore = editor.state.slice(0, from)
    .map(block => serializeState(block.content).split('\n')).flat();
  const textAfter = editor.state.slice(to + 1)
    .map(block => serializeState(block.content).split('\n')).flat();

  const newState: StateNode[] = [];
  const lines = text.split('\n');
  const newLines = [...textBefore, ...lines, ...textAfter];

  let lineIndex = 0;
  let oldLineIndex = 0;
  let preparser = editor.parser(newLines, true);
  let block = preparser.next().value;

  while (block) {
    if (
      lineIndex + (block.length || 1) - 1 >= textBefore.length &&
      lineIndex < (textBefore.length + lines.length)
    ) {
      // Parse the new text and move `oldLineIndex` to after the change
      let m = 0;
      for (const newBlock of editor.parser(newLines.slice(lineIndex))) {
        m += newBlock.length || 1;
        newState.push(newBlock);
        if (m >= lines.length) break;
      }
      lineIndex += m;
      oldLineIndex += editor.state.slice(from, to + 1)
        .reduce((acc, val) => acc + (val.length || 1), m - lines.length);
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
      continue;
    }

    let n = 0;
    const oldBlock = editor.state.find(oldBlock => {
      const match = n === oldLineIndex;
      n += oldBlock.length || 1;
      return match;
    });

    if (oldBlock && oldBlock.type === block.type) {
      // Reuse old block
      newState.push(oldBlock);
      lineIndex += block.length || 1;
      oldLineIndex += block.length || 1;
      block = preparser.next().value;
    } else {
      // Type changed
      const newBlock = editor.parser(newLines.slice(lineIndex)).next().value;
      newState.push(newBlock);
      lineIndex += newBlock.length || 1;
      oldLineIndex += newBlock.length || 1;
      preparser = editor.parser(newLines.slice(lineIndex), true);
      block = preparser.next().value;
    }
  }

  return newState;
}

export function serializeState(list: (StateNode | string)[], block = false): string {
  if (typeof list === 'string') return list;
  
  return list.map(item => {
    if (typeof item === 'string') return item;
    return serializeState(item.content, block);
  }).join(block ? '\n' : '');
} 