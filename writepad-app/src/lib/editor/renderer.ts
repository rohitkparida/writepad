// Complete renderer ported from cub-editor with all features
import type { StateNode } from './shared';

interface RendererFunction {
  (props: { content: (StateNode | string)[] }): HTMLElement;
}

interface Renderer {
  [key: string]: RendererFunction;
}

function createElement(tag: string, className?: string): HTMLElement {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
}

function renderContent(content: (StateNode | string)[], renderer: Renderer): (Node | string)[] {
  return content.map(item => {
    if (typeof item === 'string') {
      return item;
    }
    return toDOM(renderer, item);
  });
}

export function toDOM(renderer: Renderer, node: StateNode | string): HTMLElement | Text {
  if (typeof node === 'string') {
    return document.createTextNode(node);
  }

  const renderFn = renderer[node.type];
  if (!renderFn) {
    // Fallback to paragraph
    return renderer.paragraph({ content: node.content });
  }

  return renderFn({ content: node.content });
}

// Event handlers ported from cub-editor
function onTodoClick(event: Event): void {
  const target = event.target as HTMLButtonElement;
  const text = target.dataset.text;
  if (!text) return;
  
  const newText = text === '- [x]' ? '- [ ]' : '- [x]';
  target.dataset.text = newText;
  target.setAttribute('aria-checked', (newText === '- [x]').toString());
  
  // Update visual state
  const span = target.parentElement?.querySelector('span:last-child') as HTMLElement;
  if (span) {
    if (newText === '- [x]') {
      span.classList.add('writepad-todo-done');
    } else {
      span.classList.remove('writepad-todo-done');
    }
  }
}

function preventDefault(event: Event): void {
  event.preventDefault();
}

function onTagClick(event: Event): void {
  console.log('Tag clicked:', event);
}

function onHeadingClick(event: Event): void {
  console.log('Heading clicked:', event);
}

function onLinkClick(): void {
  // Let default behavior handle the link
}

function onLinkButtonClick(event: Event): void {
  event.preventDefault();
  const target = event.target as HTMLButtonElement;
  const link = target.dataset.text;
  if (link) {
    window.open(link, '_blank');
  }
}

function selectElement(event: Event): void {
  event.preventDefault();
  console.log('Element selected:', event);
}

function getFileURL(id: string): string {
  // Placeholder for file URL generation
  return `#file-${id}`;
}

function last<T>(array: T[]): T {
  return array[array.length - 1];
}

const defaultRenderer: Renderer = {
  paragraph({ content }) {
    const p = createElement('p', 'writepad-paragraph');
    const renderedContent = renderContent(content, defaultRenderer);
    
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        p.appendChild(document.createTextNode(item));
      } else {
        p.appendChild(item);
      }
    });
    
    return p;
  },

  heading({ content }) {
    const [hashes, space, ...textContent] = content;
    const level = typeof hashes === 'string' ? hashes.length : 1;
    const tag = `h${Math.min(level, 6)}`;
    
    const heading = createElement(tag, `writepad-heading writepad-h${level}`);
    
    // Add the hash button
    const button = createElement('button', 'writepad-heading-button') as HTMLButtonElement;
    button.contentEditable = 'false';
    button.type = 'button';
    button.dataset.text = hashes as string;
    button.addEventListener('click', onHeadingClick);
    
    const buttonDiv = createElement('div');
    buttonDiv.textContent = `h${level}`;
    button.appendChild(buttonDiv);
    
    heading.appendChild(button);
    
    // Add the text content
    const renderedContent = renderContent(textContent, defaultRenderer);
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        heading.appendChild(document.createTextNode(item));
      } else {
        heading.appendChild(item);
      }
    });
    
    return heading;
  },

  ordered_list_item({ content }) {
    const [indentation, level, markup, ...textContent] = content;
    const li = createElement('li', 'writepad-ordered-list-item');
    
    // Add indentation
    if (typeof indentation === 'string' && indentation) {
      li.appendChild(document.createTextNode(indentation));
    }
    
    // Add number
    const numberSpan = createElement('span', 'writepad-ordered-list-number');
    numberSpan.textContent = level as string;
    li.appendChild(numberSpan);
    
    // Add dot
    const dotSpan = createElement('span', 'writepad-ordered-list-dot');
    dotSpan.textContent = markup as string;
    li.appendChild(dotSpan);
    
    // Add content
    const renderedContent = renderContent(textContent, defaultRenderer);
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        li.appendChild(document.createTextNode(item));
      } else {
        li.appendChild(item);
      }
    });
    
    return li;
  },

  unordered_list_item({ content }) {
    const [indentation, markup, ...textContent] = content;
    const li = createElement('li', 'writepad-unordered-list-item');
    
    // Add indentation
    if (typeof indentation === 'string' && indentation) {
      li.appendChild(document.createTextNode(indentation));
    }
    
    // Add bullet
    const bulletSpan = createElement('span', 'writepad-unordered-list-dot');
    bulletSpan.textContent = markup as string;
    li.appendChild(bulletSpan);
    
    // Add content
    const renderedContent = renderContent(textContent, defaultRenderer);
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        li.appendChild(document.createTextNode(item));
      } else {
        li.appendChild(item);
      }
    });
    
    return li;
  },

  todo_item({ content }) {
    const [indentation, text, space, ...textContent] = content;
    const checked = text === '- [x]';
    const li = createElement('li', 'writepad-todo-item');
    
    // Add indentation
    if (typeof indentation === 'string' && indentation) {
      li.appendChild(document.createTextNode(indentation));
    }
    
    // Add checkbox button
    const button = createElement('button', 'writepad-checkbox') as HTMLButtonElement;
    button.contentEditable = 'false';
    button.type = 'button';
    button.setAttribute('role', 'checkbox');
    button.setAttribute('aria-checked', checked.toString());
    button.dataset.text = text as string;
    button.addEventListener('click', onTodoClick);
    button.addEventListener('mousedown', preventDefault);
    
    // Checkbox wrapper
    const checkboxDiv = createElement('div', 'writepad-checkbox-svg');
    checkboxDiv.textContent = String.fromCharCode(8203); // Zero-width space
    
    // SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '17');
    svg.setAttribute('height', '17');
    svg.setAttribute('viewBox', '0 0 16 16');
    
    const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bgPath.setAttribute('d', 'M.5 12.853A2.647 2.647 0 003.147 15.5h9.706a2.647 2.647 0 002.647-2.647V3.147A2.647 2.647 0 0012.853.5H3.147A2.647 2.647 0 00.5 3.147v9.706z');
    bgPath.setAttribute('class', 'writepad-checkbox-background');
    svg.appendChild(bgPath);
    
    if (checked) {
      const checkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      checkPath.setAttribute('d', 'M12.526 4.615L6.636 9.58l-2.482-.836a.48.48 0 00-.518.15.377.377 0 00.026.495l2.722 2.91c.086.09.21.144.34.144h.046a.474.474 0 00.307-.156l6.1-7.125a.38.38 0 00-.046-.548.49.49 0 00-.604 0z');
      checkPath.setAttribute('class', 'writepad-icon');
      svg.appendChild(checkPath);
    }
    
    checkboxDiv.appendChild(svg);
    button.appendChild(checkboxDiv);
    li.appendChild(button);
    
    // Add space
    if (typeof space === 'string') {
      li.appendChild(document.createTextNode(space));
    }
    
    // Add content with conditional styling
    const contentSpan = createElement('span', checked ? 'writepad-todo-done' : '');
    const renderedContent = renderContent(textContent, defaultRenderer);
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        contentSpan.appendChild(document.createTextNode(item));
      } else {
        contentSpan.appendChild(item);
      }
    });
    li.appendChild(contentSpan);
    
    return li;
  },

  blockquote({ content }) {
    const [markup, ...textContent] = content;
    const blockquote = createElement('blockquote', 'writepad-blockquote');
    
    // Add markup
    const markupSpan = createElement('span', 'writepad-blockquote-markup');
    markupSpan.textContent = markup as string;
    blockquote.appendChild(markupSpan);
    
    // Add content
    const renderedContent = renderContent(textContent, defaultRenderer);
    renderedContent.forEach(item => {
      if (typeof item === 'string') {
        blockquote.appendChild(document.createTextNode(item));
      } else {
        blockquote.appendChild(item);
      }
    });
    
    return blockquote;
  },

  horizontal_rule({ content }) {
    const p = createElement('p', 'writepad-paragraph');
    const img = createElement('img', 'writepad-hr') as HTMLImageElement;
    img.setAttribute('role', 'presentation');
    img.dataset.text = (content as string[]).join('');
    p.appendChild(img);
    return p;
  },

  code_block({ content }) {
    const [openMarkup, language, newline, ...restContent] = content;
    const code = createElement('code', 'writepad-code-block') as HTMLElement;
    code.setAttribute('autocomplete', 'off');
    code.setAttribute('autocorrect', 'off');
    code.setAttribute('autocapitalize', 'off');
    code.setAttribute('spellcheck', 'false');
    
    // Opening markup
    const openSpan = createElement('span', 'writepad-inline-markup');
    openSpan.textContent = openMarkup as string;
    code.appendChild(openSpan);
    
    // Language
    const langSpan = createElement('span', 'writepad-code-language');
    langSpan.textContent = language as string;
    code.appendChild(langSpan);
    
    // Content (excluding closing markup)
    const codeContent = restContent.slice(0, -1);
    codeContent.forEach(item => {
      if (typeof item === 'string') {
        code.appendChild(document.createTextNode(item));
      }
    });
    
    // Closing markup
    const closeSpan = createElement('span', 'writepad-inline-markup writepad-code-close');
    closeSpan.textContent = last(restContent) as string;
    code.appendChild(closeSpan);
    
    return code;
  },

  strong({ content }) {
    const fragment = document.createDocumentFragment();
    
    // Add opening markup
    const openMarkup = createElement('span', 'writepad-markup');
    openMarkup.textContent = content[0] as string;
    fragment.appendChild(openMarkup);
    
    // Add bold content
    const strong = createElement('strong');
    const innerContent = renderContent(content.slice(1, -1), defaultRenderer);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        strong.appendChild(document.createTextNode(item));
      } else {
        strong.appendChild(item);
      }
    });
    fragment.appendChild(strong);
    
    // Add closing markup
    const closeMarkup = createElement('span', 'writepad-markup');
    closeMarkup.textContent = content[content.length - 1] as string;
    fragment.appendChild(closeMarkup);
    
    // Wrap in a span to return a single element
    const wrapper = createElement('span');
    wrapper.appendChild(fragment);
    return wrapper;
  },

  em({ content }) {
    const fragment = document.createDocumentFragment();
    
    // Add opening markup
    const openMarkup = createElement('span', 'writepad-markup');
    openMarkup.textContent = content[0] as string;
    fragment.appendChild(openMarkup);
    
    // Add italic content
    const em = createElement('em');
    const innerContent = renderContent(content.slice(1, -1), defaultRenderer);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        em.appendChild(document.createTextNode(item));
      } else {
        em.appendChild(item);
      }
    });
    fragment.appendChild(em);
    
    // Add closing markup
    const closeMarkup = createElement('span', 'writepad-markup');
    closeMarkup.textContent = content[content.length - 1] as string;
    fragment.appendChild(closeMarkup);
    
    // Wrap in a span to return a single element
    const wrapper = createElement('span');
    wrapper.appendChild(fragment);
    return wrapper;
  },

  link({ content }) {
    const [openBracket, text, closeBracket, openParen, url, closeParen] = content;
    const fragment = document.createDocumentFragment();
    
    // Opening bracket markup
    const openSpan = createElement('span', 'writepad-markup writepad-link-open');
    openSpan.textContent = openBracket as string;
    fragment.appendChild(openSpan);
    
    // Link
    const a = createElement('a', 'writepad-link') as HTMLAnchorElement;
    a.href = url as string;
    a.target = '_blank';
    a.textContent = text as string;
    a.addEventListener('click', onLinkClick);
    fragment.appendChild(a);
    
    // Closing bracket markup
    const closeSpan = createElement('span', 'writepad-markup writepad-link-close');
    closeSpan.textContent = closeBracket as string;
    fragment.appendChild(closeSpan);
    
    // URL section
    const urlWrapper = createElement('span', 'writepad-link-nowrap');
    
    // Opening paren
    const openParenSpan = createElement('span', 'writepad-markup');
    openParenSpan.textContent = openParen as string;
    urlWrapper.appendChild(openParenSpan);
    
    // Link button
    const button = createElement('button', 'writepad-link-button') as HTMLButtonElement;
    button.contentEditable = 'false';
    button.type = 'button';
    button.dataset.text = url as string;
    button.addEventListener('click', onLinkButtonClick);
    button.addEventListener('mousedown', preventDefault);
    
    // SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('viewBox', '0 0 14 14');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M10.593 1.17a2.305 2.305 0 00-1.667.691l-.003.002-.964.975c-.525.53-.864 1.096-1.006 1.557-.152.493-.038.684.014.73l-.806.89c-.575-.522-.555-1.324-.355-1.974.21-.682.67-1.41 1.3-2.047l.964-.974a3.505 3.505 0 014.923-.08l.002-.001.002.001.068.07.054.057-.003.003a3.62 3.62 0 01-.2 4.97l-.875.85c-.707.689-1.6 1.002-2.293 1.138a5.128 5.128 0 01-.91.098c-.12.001-.23-.003-.322-.014a1.176 1.176 0 01-.153-.026.635.635 0 01-.327-.186l.875-.822a.565.565 0 00-.261-.158c.03.003.09.007.175.006.171-.002.415-.021.692-.076.564-.11 1.207-.352 1.686-.819l.875-.85a2.42 2.42 0 00.097-3.363 2.306 2.306 0 00-1.582-.649z M10.848 4L4 10.848 3.151 10 10 3.151l.848.849z M3.968 5.84c.62-.217 1.42-.298 1.955.235l-.846.85c-.02-.02-.2-.132-.714.048-.467.163-1.04.519-1.58 1.05l-.872.854a2.28 2.28 0 00.793 3.772 2.37 2.37 0 002.58-.592l.732-.782c.459-.49.701-1.151.817-1.732.056-.285.08-.536.086-.713.003-.09.001-.154 0-.19l-.002-.016v.007a.436.436 0 00.043.13.586.586 0 00.116.163l.848-.848c.113.112.15.242.154.258v.001c.013.04.02.075.023.097.008.046.012.093.015.133.005.085.006.19.002.307a5.766 5.766 0 01-.109.905c-.138.697-.446 1.601-1.117 2.318l-.733.782a3.57 3.57 0 01-5.04.169 3.48 3.48 0 01-.046-5.028l.869-.852C2.58 6.539 3.3 6.072 3.968 5.84z');
    path.setAttribute('class', 'writepad-icon');
    svg.appendChild(path);
    button.appendChild(svg);
    urlWrapper.appendChild(button);
    
    // Closing paren
    const closeParenSpan = createElement('span', 'writepad-markup');
    closeParenSpan.textContent = closeParen as string;
    urlWrapper.appendChild(closeParenSpan);
    
    fragment.appendChild(urlWrapper);
    
    // Wrap in a span to return a single element
    const wrapper = createElement('span');
    wrapper.appendChild(fragment);
    return wrapper;
  },

  code({ content }) {
    const code = createElement('code', 'writepad-code-span') as HTMLElement;
    code.setAttribute('autocomplete', 'off');
    code.setAttribute('autocorrect', 'off');
    code.setAttribute('autocapitalize', 'off');
    code.setAttribute('spellcheck', 'false');
    
    const inner = createElement('span', 'writepad-code-span-inner');
    
    // Opening markup
    const openSpan = createElement('span', 'writepad-code-span-open');
    openSpan.textContent = content[0] as string;
    inner.appendChild(openSpan);
    
    // Content
    const codeContent = content.slice(1, -1);
    codeContent.forEach(item => {
      if (typeof item === 'string') {
        inner.appendChild(document.createTextNode(item));
      }
    });
    
    // Closing markup
    const closeSpan = createElement('span', 'writepad-code-span-close');
    closeSpan.textContent = last(content) as string;
    inner.appendChild(closeSpan);
    
    code.appendChild(inner);
    return code;
  },

  reference({ content }) {
    const fragment = document.createDocumentFragment();
    
    // Opening markup
    const openMarkup = createElement('span', 'writepad-markup');
    openMarkup.textContent = content[0] as string;
    fragment.appendChild(openMarkup);
    
    // Reference content
    const refSpan = createElement('span', 'writepad-reference');
    const innerContent = content.slice(1, -1);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        refSpan.appendChild(document.createTextNode(item));
      }
    });
    fragment.appendChild(refSpan);
    
    // Closing markup
    const closeMarkup = createElement('span', 'writepad-markup');
    closeMarkup.textContent = last(content) as string;
    fragment.appendChild(closeMarkup);
    
    // Wrap in a span to return a single element
    const wrapper = createElement('span');
    wrapper.appendChild(fragment);
    return wrapper;
  },

  mark({ content }) {
    const mark = createElement('mark', 'writepad-mark');
    
    // Opening markup
    const openMarkup = createElement('span', 'writepad-mark-markup');
    openMarkup.textContent = content[0] as string;
    mark.appendChild(openMarkup);
    
    // Content
    const innerContent = content.slice(1, -1);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        mark.appendChild(document.createTextNode(item));
      }
    });
    
    // Closing markup
    const closeMarkup = createElement('span', 'writepad-mark-markup');
    closeMarkup.textContent = last(content) as string;
    mark.appendChild(closeMarkup);
    
    return mark;
  },

  strikethrough({ content }) {
    const span = createElement('span', 'writepad-strikethrough');
    
    // Opening markup
    span.appendChild(document.createTextNode(content[0] as string));
    
    // Strikethrough content
    const s = createElement('s');
    const innerContent = content.slice(1, -1);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        s.appendChild(document.createTextNode(item));
      }
    });
    span.appendChild(s);
    
    // Closing markup
    span.appendChild(document.createTextNode(last(content) as string));
    
    return span;
  },

  underline({ content }) {
    const fragment = document.createDocumentFragment();
    
    // Opening markup
    const openMarkup = createElement('span', 'writepad-markup');
    openMarkup.textContent = content[0] as string;
    fragment.appendChild(openMarkup);
    
    // Underlined content
    const u = createElement('u', 'writepad-underline');
    const innerContent = content.slice(1, -1);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        u.appendChild(document.createTextNode(item));
      }
    });
    fragment.appendChild(u);
    
    // Closing markup
    const closeMarkup = createElement('span', 'writepad-markup');
    closeMarkup.textContent = last(content) as string;
    fragment.appendChild(closeMarkup);
    
    // Wrap in a span to return a single element
    const wrapper = createElement('span');
    wrapper.appendChild(fragment);
    return wrapper;
  },

  tag({ content }) {
    const span = createElement('span', 'writepad-tag');
    span.setAttribute('role', 'button');
    span.setAttribute('tabindex', '0');
    span.addEventListener('click', onTagClick);
    
    // Tag markup
    const markupSpan = createElement('span', 'writepad-tag-markup');
    markupSpan.textContent = content[0] as string;
    span.appendChild(markupSpan);
    
    // Tag content
    const innerContent = content.slice(1, -1);
    innerContent.forEach(item => {
      if (typeof item === 'string') {
        span.appendChild(document.createTextNode(item));
      }
    });
    
    // Closing markup
    const closeMarkupSpan = createElement('span', 'writepad-tag-markup');
    closeMarkupSpan.textContent = last(content) as string;
    span.appendChild(closeMarkupSpan);
    
    return span;
  },

  image({ content }) {
    const [prefix, path] = (content[1] as string).split('/');
    const img = createElement('img', 'writepad-image') as HTMLImageElement;
    img.src = getFileURL(prefix);
    img.alt = path || prefix;
    img.dataset.text = (content as string[]).join('');
    img.addEventListener('click', selectElement);
    return img;
  },

  file({ content }) {
    const [prefix, name] = (content[1] as string).split('/');
    const button = createElement('button', 'writepad-file') as HTMLButtonElement;
    button.contentEditable = 'false';
    button.type = 'button';
    button.dataset.text = (content as string[]).join('');
    button.dataset.name = name || prefix;
    button.dataset.id = prefix;
    button.dataset.date = '';
    button.addEventListener('mousedown', preventDefault);
    button.addEventListener('click', selectElement);
    
    // File icon wrapper
    const fileDiv = createElement('div', 'writepad-file-svg');
    
    // SVG icon
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '32');
    svg.setAttribute('height', '38');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0 0h20.693L32 10.279V38H0V0zm1 1v36h30V11H19V1H1zm19 0v9h10.207l-9.9-9H20z');
    svg.appendChild(path);
    
    fileDiv.appendChild(svg);
    button.appendChild(fileDiv);
    
    return button;
  }
};

export default defaultRenderer;