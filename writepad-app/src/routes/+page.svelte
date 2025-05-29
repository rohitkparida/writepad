<script lang="ts">
  import { onMount } from 'svelte';
  import { CodeMirrorEditor } from '$lib/editor/codemirror-editor.js';
  import FileManager from '$lib/components/FileManager.svelte';
  import FileTree from '$lib/components/FileTree.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
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

  // Settings state
  let showSettingsPanel = false;
  let settings = {
    theme: 'system' as 'light' | 'dark' | 'system',
    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
    fontSize: 14,
    lineHeight: 1.5,
    showLineNumbers: true,
    autoSave: true,
    autoSaveInterval: 30,
    wysiwygMode: false,
  };

  // Auto-save timer
  let autoSaveTimer: number | null = null;

  onMount(() => {
    // Load settings first
    const savedSettings = localStorage.getItem('writepad-settings');
    if (savedSettings) {
      try {
        settings = { ...settings, ...JSON.parse(savedSettings) };
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }

    if (editorContainer) {
      editor = new CodeMirrorEditor(editorContainer, editorContent, settings.wysiwygMode);
      
      // Apply initial settings
      applySettings();
      
      // Start auto-save if enabled
      if (settings.autoSave) {
        startAutoSave();
      }
      
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
      stopAutoSave();
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

  function handleSettingsChanged(event: CustomEvent) {
    settings = { ...event.detail };
    applySettings();
    
    // Update WYSIWYG mode in editor
    if (editor) {
      editor.setWysiwygMode(settings.wysiwygMode);
    }
    
    // Restart auto-save timer if settings changed
    if (settings.autoSave) {
      startAutoSave();
    } else {
      stopAutoSave();
    }
  }

  function handleToolbarCommand(event: CustomEvent) {
    if (editor) {
      const { type, value } = event.detail;
      editor.executeCommand(type, value);
      editor.focus();
    }
  }

  function applySettings() {
    if (editor) {
      // Apply font settings to editor
      const editorElement = editor.getView().dom;
      editorElement.style.fontFamily = settings.fontFamily;
      editorElement.style.fontSize = `${settings.fontSize}px`;
      editorElement.style.lineHeight = settings.lineHeight.toString();
      
      // Apply line numbers setting
      // Note: This would require reconfiguring the editor with line numbers extension
      // For now, we'll just store the setting
    }

    // Apply theme to document
    applyTheme();
  }

  function applyTheme() {
    const root = document.documentElement;
    const effectiveTheme = settings.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;
    
    root.setAttribute('data-theme', effectiveTheme);
  }

  function startAutoSave() {
    stopAutoSave(); // Clear any existing timer
    
    if (settings.autoSave && settings.autoSaveInterval > 0) {
      autoSaveTimer = window.setInterval(() => {
        if (currentFile && isDirty && fileManager) {
          fileManager.saveFile();
        }
      }, settings.autoSaveInterval * 1000);
    }
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  function openSettings() {
    showSettingsPanel = true;
  }

  function closeSettings() {
    showSettingsPanel = false;
  }
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="app">
  <header class="app-header">
    <h1>Writepad</h1>
    <div class="header-controls">
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
      <button class="settings-button" on:click={openSettings} aria-label="Open settings">
        ⚙️
      </button>
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
      
      <!-- Toolbar for WYSIWYG mode -->
      <Toolbar 
        visible={settings.wysiwygMode}
        on:command={handleToolbarCommand}
      />
      
      <div class="editor-container" bind:this={editorContainer}></div>
    </section>
  </main>

  <!-- Settings Panel -->
  <SettingsPanel 
    bind:isOpen={showSettingsPanel}
    on:close={closeSettings}
    on:settingsChanged={handleSettingsChanged}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f6f8fa;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  /* Dark theme support */
  :global([data-theme="dark"]) {
    color-scheme: dark;
  }

  :global([data-theme="dark"] body) {
    background: #0d1117;
    color: #e6edf3;
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

  .header-controls {
    display: flex;
    align-items: center;
    gap: 12px;
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

  .settings-button {
    background: none;
    border: 1px solid #e1e5e9;
    color: #656d76;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 40px;
  }

  .settings-button:hover {
    background: #f6f8fa;
    border-color: #d1d9e0;
    color: #24292f;
  }

  .settings-button:active {
    background: #e1e5e9;
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
    overflow: auto;
    height: 100%;
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

  /* Dark theme styles */
  :global([data-theme="dark"]) .app {
    background: #0d1117;
    color: #e6edf3;
  }

  :global([data-theme="dark"]) .app-header {
    background: #161b22;
    border-bottom-color: #30363d;
  }

  :global([data-theme="dark"]) .app-header h1 {
    color: #e6edf3;
  }

  :global([data-theme="dark"]) .settings-button {
    border-color: #30363d;
    color: #7d8590;
  }

  :global([data-theme="dark"]) .settings-button:hover {
    background: #21262d;
    border-color: #484f58;
    color: #e6edf3;
  }

  :global([data-theme="dark"]) .settings-button:active {
    background: #30363d;
  }

  :global([data-theme="dark"]) .sidebar {
    background: #161b22;
    border-right-color: #30363d;
  }

  :global([data-theme="dark"]) .empty-state p {
    color: #7d8590;
  }

  :global([data-theme="dark"]) .error-banner {
    background: #2d1b1b;
    border-color: #6e2c2c;
    color: #f85149;
  }

  :global([data-theme="dark"]) .error-banner button {
    color: #f85149;
  }
</style>