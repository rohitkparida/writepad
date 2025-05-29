import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import type { KeyBinding } from '@codemirror/view';
import { wysiwygCommands } from './wysiwyg-commands.js';

// Create keyboard shortcuts for WYSIWYG mode
const wysiwygKeyBindings: KeyBinding[] = [
  {
    key: 'Mod-b',
    run: (view) => wysiwygCommands.bold.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-i',
    run: (view) => wysiwygCommands.italic.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-k',
    run: (view) => wysiwygCommands.link.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-Shift-c',
    run: (view) => wysiwygCommands.code.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-Shift-l',
    run: (view) => wysiwygCommands.list.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-Shift-t',
    run: (view) => wysiwygCommands.taskList.execute(view),
    preventDefault: true
  },
  {
    key: 'Mod-1',
    run: (view) => wysiwygCommands.heading.execute(view, 1),
    preventDefault: true
  },
  {
    key: 'Mod-2',
    run: (view) => wysiwygCommands.heading.execute(view, 2),
    preventDefault: true
  },
  {
    key: 'Mod-3',
    run: (view) => wysiwygCommands.heading.execute(view, 3),
    preventDefault: true
  },
  {
    key: 'Mod-4',
    run: (view) => wysiwygCommands.heading.execute(view, 4),
    preventDefault: true
  },
  {
    key: 'Mod-5',
    run: (view) => wysiwygCommands.heading.execute(view, 5),
    preventDefault: true
  },
  {
    key: 'Mod-6',
    run: (view) => wysiwygCommands.heading.execute(view, 6),
    preventDefault: true
  },
  {
    key: 'Mod-Shift-h',
    run: (view) => wysiwygCommands.horizontalRule.execute(view),
    preventDefault: true
  }
];

// Use high precedence to override CodeMirror's default keymap
// This ensures our Ctrl+I (italic) overrides the default selectLine command
export const wysiwygKeymap = Prec.high(keymap.of(wysiwygKeyBindings)); 