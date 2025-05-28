# 🖊️ Writepad

A modern, feature-rich markdown editor with Obsidian-like interface and native file system integration. Built with SvelteKit, TypeScript, and CodeMirror 6.

![Writepad Interface](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![SvelteKit](https://img.shields.io/badge/SvelteKit-Latest-orange)
![CodeMirror](https://img.shields.io/badge/CodeMirror-6-purple)

## ✨ Features

### 🎯 **Core Functionality**
- **Rich Markdown Editor** - Full GitHub Flavored Markdown (GFM) support
- **Three-Pane Layout** - Obsidian-style interface with file tree, editor, and preview
- **Native File System** - Direct folder/file access using File System Access API
- **Real-time Preview** - Live rendering of markdown with interactive elements

### 🔥 **Interactive Elements**
- **📋 Interactive Tables** - Click to edit, cursor-aware rendering
- **✅ Task Lists** - Clickable checkboxes that update markdown source
- **🎨 Rich Styling** - Bold, italic, strikethrough, code blocks, blockquotes
- **🔗 Auto-linking** - Automatic URL detection and linking
- **📝 Syntax Highlighting** - Full syntax highlighting for code blocks

### 🗂️ **File Management**
- **📁 Folder Tree Navigation** - Hierarchical file browser with expand/collapse
- **💾 Native Save Operations** - Direct file saving with Ctrl/Cmd+S support
- **📄 File Creation** - Create new markdown files with "Save As" functionality
- **🔄 Auto-sync** - Real-time file content synchronization
- **📊 Dirty State Tracking** - Visual indicators for unsaved changes

### 🎨 **User Experience**
- **🌙 Modern UI** - Clean, professional interface design
- **📱 Responsive Layout** - Adapts to different screen sizes
- **⚡ Performance Optimized** - Lazy loading and efficient rendering
- **🔧 Browser Compatible** - Works in Chrome, Edge, and other Chromium browsers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern Chromium-based browser (Chrome, Edge, Opera)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rohitkparida/writepad.git
   cd writepad
   ```

2. **Install dependencies**
   ```bash
   cd writepad-app
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📖 Usage Guide

### Getting Started
1. **Open Writepad** in your browser
2. **Click "Open Folder"** to select a directory containing markdown files
3. **Browse the file tree** - folders show with 📁/📂 icons, files with 📄
4. **Click any `.md` file** to open it in the editor
5. **Edit and save** using the Save button or `Ctrl/Cmd + S`

### Interactive Features

#### Tables
```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| Tables | ✅ | Click to edit |
| Tasks | ✅ | Interactive checkboxes |
```
- Click anywhere in a table to edit it
- Tables render beautifully when cursor is outside

#### Task Lists
```markdown
- [ ] Unchecked task
- [x] Completed task
  - [ ] Nested task
  - [x] Another completed task
```
- Click checkboxes to toggle completion
- Supports nested task lists
- Updates markdown source in real-time

#### Rich Text
```markdown
**Bold text** and *italic text*
~~Strikethrough~~ text
`Inline code` and code blocks
> Blockquotes for emphasis
```

### Keyboard Shortcuts
- `Ctrl/Cmd + S` - Save current file
- `Ctrl/Cmd + O` - Open folder (when supported)
- Standard text editing shortcuts work in the editor

## 🏗️ Architecture

### Tech Stack
- **Frontend**: SvelteKit + TypeScript
- **Editor**: CodeMirror 6 with Lezer parser
- **Styling**: Custom CSS with modern design principles
- **File System**: File System Access API for native operations

### Project Structure
```
writepad/
├── writepad-app/           # Main SvelteKit application
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # Svelte components
│   │   │   ├── editor/     # CodeMirror editor setup
│   │   │   └── types/      # TypeScript definitions
│   │   └── routes/         # SvelteKit routes
│   ├── static/             # Static assets
│   └── package.json        # Dependencies
├── markdown-parser/        # Rust WASM parser (future)
└── for_reference_only/     # Reference implementations
```

### Key Components
- **`FileManager.svelte`** - File operations and toolbar
- **`FileTree.svelte`** - Hierarchical folder navigation
- **`TreeItem.svelte`** - Individual tree nodes
- **`CodeMirrorEditor.ts`** - Editor configuration and setup
- **Widget System** - Table and task list interactive rendering

## 🔧 Development

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npm run check
```

### Linting
```bash
npm run lint
```

## 🌐 Browser Compatibility

### Full Support
- ✅ **Chrome 86+** - Full File System Access API support
- ✅ **Edge 86+** - Full File System Access API support  
- ✅ **Opera 72+** - Full File System Access API support

### Limited Support
- ⚠️ **Firefox** - Editor works, file system features disabled
- ⚠️ **Safari** - Editor works, file system features disabled

> **Note**: File System Access API is required for folder/file operations. The editor will show a warning and disable file system features in unsupported browsers.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CodeMirror** - Excellent editor foundation
- **Lezer** - Powerful parsing system
- **SvelteKit** - Amazing web framework
- **Obsidian** - UI/UX inspiration
- **GitHub** - Markdown specification and styling

## 🔮 Roadmap

- [ ] **Plugin System** - Extensible architecture for custom features
- [ ] **Themes** - Multiple color schemes and customization
- [ ] **Export Options** - PDF, HTML, and other format exports
- [ ] **Collaboration** - Real-time collaborative editing
- [ ] **Mobile App** - Native mobile applications
- [ ] **Cloud Sync** - Optional cloud storage integration
- [ ] **Advanced Search** - Full-text search across files
- [ ] **Graph View** - Visual representation of note connections

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/rohitkparida/writepad/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rohitkparida/writepad/discussions)
- **Email**: [Contact](mailto:rohitkparida@example.com)

---

**Made with ❤️ by [Rohit Kumar Parida](https://github.com/rohitkparida)** 