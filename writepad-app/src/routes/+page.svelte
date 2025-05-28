<script lang="ts">
  import { onMount } from 'svelte';
  import { CodeMirrorEditor } from '$lib/editor/codemirror-editor.js';
  import FileManager from '$lib/components/FileManager.svelte';
  import FileTree from '$lib/components/FileTree.svelte';
  import type { FileSystemDirectoryHandle, FileSystemFileHandle } from '$lib/types/filesystem';
  import { EditorView } from '@codemirror/view';
  import { StateEffect } from '@codemirror/state';

  let editorContainer: HTMLElement;
  let editor: CodeMirrorEditor;
  let fileManager: FileManager;
  
  // File system state
  let rootDirectory: FileSystemDirectoryHandle | null = null;
  let currentFile: FileSystemFileHandle | null = null;
  let currentFilePath: string = '';
  let editorContent: string = `# Welcome to Writepad

This is a modern markdown editor with rich preview features.

## Features

### Basic Formatting
- **Bold text**
- *Italic text*
- ~~Strikethrough text~~

### Lists
- Regular bullet list
- [ ] Task list item (unchecked)
- [x] Task list item (checked)
  - [ ] Nested task
  - [x] Another nested task

### Tables
| Feature | Status | Notes |
|---------|--------|-------|
| File System Access | ✅ | Native file operations |
| Rich Markdown | ✅ | Interactive tables & tasks |
| Syntax Highlighting | ✅ | CodeMirror powered |

### Code
\`\`\`javascript
function hello() {
  console.log("Hello from Writepad!");
}
\`\`\`

---

Click "Open Folder" to start working with your files!`;

  let isDirty: boolean = false;
  let originalContent: string = editorContent;
  let errorMessage: string = '';

  onMount(() => {
    if (editorContainer) {
      editor = new CodeMirrorEditor(editorContainer, editorContent);
      
      // Listen for content changes using the correct CodeMirror API
      const view = editor.getView();
      const updateExtension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          editorContent = editor.getValue();
          isDirty = editorContent !== originalContent;
        }
      });
      
      // Add the update listener to the editor
      view.dispatch({
        effects: StateEffect.appendConfig.of(updateExtension)
      });
    }

    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  });

  function handleDirectoryOpened(event: CustomEvent<FileSystemDirectoryHandle>) {
    rootDirectory = event.detail;
    errorMessage = '';
  }

  function handleFileSelected(event: CustomEvent<{ file: FileSystemFileHandle; path: string }>) {
    const { file, path } = event.detail;
    if (fileManager) {
      fileManager.openFile(file, path);
    }
  }

  function handleFileOpened(event: CustomEvent<{ handle: FileSystemFileHandle; content: string; path: string }>) {
    const { handle, content, path } = event.detail;
    
    currentFile = handle;
    currentFilePath = path;
    editorContent = content;
    originalContent = content;
    isDirty = false;
    
    if (editor) {
      editor.setValue(content);
    }
    
    errorMessage = '';
  }

  function handleFileSaved(event: CustomEvent<{ handle: FileSystemFileHandle; path: string }>) {
    const { handle, path } = event.detail;
    
    currentFile = handle;
    currentFilePath = path;
    originalContent = editorContent;
    isDirty = false;
    
    errorMessage = '';
  }

  function handleError(event: CustomEvent<string>) {
    errorMessage = event.detail;
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (currentFile && isDirty && fileManager) {
        fileManager.saveFile();
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="app">
  <header class="app-header">
    <h1>Writepad</h1>
    <div class="header-info">
      {#if currentFilePath}
        <span class="current-file">
          📄 {currentFilePath}
          {#if isDirty}<span class="dirty-indicator">●</span>{/if}
        </span>
      {:else}
        <span class="no-file">No file open</span>
      {/if}
    </div>
  </header>

  <main class="app-main">
    <aside class="sidebar">
      <FileManager 
        bind:this={fileManager}
        bind:currentFile
        bind:currentContent={editorContent}
        bind:isDirty
        on:directoryOpened={handleDirectoryOpened}
        on:fileOpened={handleFileOpened}
        on:fileSaved={handleFileSaved}
        on:error={handleError}
      />
      
      {#if rootDirectory}
        <FileTree 
          {rootDirectory}
          on:fileSelected={handleFileSelected}
        />
      {:else}
        <div class="empty-state">
          <p>📁 Open a folder to see your files</p>
        </div>
      {/if}
    </aside>

    <section class="editor-section">
      {#if errorMessage}
        <div class="error-banner">
          <span>❌ {errorMessage}</span>
          <button on:click={() => errorMessage = ''}>×</button>
        </div>
      {/if}
      
      <div class="editor-container" bind:this={editorContainer}></div>
    </section>
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f6f8fa;
  }

  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: white;
    border-bottom: 1px solid #e1e5e9;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .app-header h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #24292f;
  }

  .header-info {
    font-size: 14px;
    color: #656d76;
  }

  .current-file {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dirty-indicator {
    color: #d73a49;
    font-size: 16px;
    line-height: 1;
  }

  .no-file {
    opacity: 0.6;
  }

  .app-main {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 300px;
    background: white;
    border-right: 1px solid #e1e5e9;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .empty-state p {
    margin: 0;
    color: #656d76;
    font-size: 14px;
  }

  .editor-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .error-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    font-size: 14px;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #dc2626;
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .sidebar {
      width: 250px;
    }
    
    .app-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>