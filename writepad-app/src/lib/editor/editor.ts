// Minimal editor ported from cub-editor/src/core/editor.js
import { getOffset, serializeState, type StateNode, type Editor as EditorInterface } from './shared.js';
import { toDOM } from './renderer.js';
import morphdom from 'morphdom';

const EVENTS = [
  'beforeinput',
  'input',
  'keydown'
];

const DOCUMENT_EVENTS = [
  'selectionchange'
];

function changeHandlers(editor: Editor, cmd: 'add' | 'remove') {
  for (const name of EVENTS) {
    if (cmd === 'add') {
      editor.element.addEventListener(name, editor);
    } else {
      editor.element.removeEventListener(name, editor);
    }
  }
  for (const name of DOCUMENT_EVENTS) {
    if (cmd === 'add') {
      document.addEventListener(name, editor);
    } else {
      document.removeEventListener(name, editor);
    }
  }
}

export default class Editor implements EditorInterface {
  element: HTMLElement;
  selection: {
    anchorBlock: number;
    focusBlock: number;
    anchorOffset: number;
    focusOffset: number;
  };
  parser: (value: string | string[], typeOnly?: boolean) => Generator<StateNode>;
  renderer: any;
  private _elements: Element[] = [];
  private _state: StateNode[] = [];

  constructor({
    element,
    value = '',
    renderer,
    parser
  }: {
    element: HTMLElement;
    value?: string;
    renderer: any;
    parser: (value: string | string[], typeOnly?: boolean) => Generator<StateNode>;
  }) {
    this.element = element;
    this.renderer = renderer;
    this.parser = parser;

    const getTypeOffset = (type: 'anchor' | 'focus') => {
      const sel = (this.element.getRootNode() as Document).getSelection();
      if (!sel) return 0;
      
      const block = this.selection[type + 'Block' as keyof typeof this.selection] as number;
      if (sel[type + 'Node'] === this.element) return 0;
      if (!this.element.contains(sel[type + 'Node'])) return -1;

      return getOffset(
        this.element.children[block] as Element,
        sel[type + 'Node'],
        sel[type + 'Offset']
      );
    };

    this.selection = {
      anchorBlock: 0,
      focusBlock: 0,
      get anchorOffset() {
        return getTypeOffset('anchor');
      },
      get focusOffset() {
        return getTypeOffset('focus');
      }
    };

    this.element.contentEditable = 'true';
    changeHandlers(this, 'add');
    this.value = value;
  }

  handleEvent(event: Event) {
    if (event.type === 'input') {
      this.handleInput();
    }
  }

  private handleInput() {
    // Simple input handling - reparse the entire content
    const text = this.element.textContent || '';
    this.update(Array.from(this.parser(text)));
  }

  update(state: StateNode[]) {
    this.state = state;
  }

  set state(state: StateNode[]) {
    if (state === this._state) return;

    const prevState = this._state;
    this._state = state;

    state.forEach((node, index) => {
      const current = this.element.children[index];

      if (prevState.includes(node)) {
        // Avoid having to recreate nodes that haven't changed
        const prevIndex = prevState.indexOf(node);
        const el = this._elements[prevIndex];

        if (el === current) return;
        this.element.insertBefore(el, current);
      } else {
        const el = toDOM(this.renderer, node);

        // Improves caret behavior when contenteditable="false"
        if (!el.childNodes.length && el instanceof HTMLElement) {
          el.appendChild(document.createElement('br'));
        }

        const morph = !state.includes(prevState[index]);
        if (morph && this._elements[index]) {
          morphdom(this._elements[index], el);
        } else {
          this.element.insertBefore(el, current);
        }
      }
    });

    // Remove leftover elements
    while (this.element.childElementCount > state.length) {
      this.element.lastElementChild?.remove();
    }

    this._elements = Array.from(this.element.children);
  }

  get state(): StateNode[] {
    return this._state;
  }

  set value(value: string) {
    this.update(Array.from(this.parser(value)));
  }

  get value(): string {
    return serializeState(this.state, true);
  }

  destroy() {
    changeHandlers(this, 'remove');
  }
} 