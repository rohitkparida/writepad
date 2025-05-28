<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FileSystemDirectoryHandle, FileSystemFileHandle } from '$lib/types/filesystem';

  const dispatch = createEventDispatcher<{
    directoryOpened: FileSystemDirectoryHandle;
    fileOpened: { handle: FileSystemFileHandle; content: string; path: string };
    fileSaved: { handle: FileSystemFileHandle; path: string };
    error: string;
  }>();

  export let currentFile: FileSystemFileHandle | null = null;
  export let currentContent: string = '';
  export let isDirty: boolean = false;

  let isSupported = false;
  let isSaving = false;

  // Check if File System Access API is supported
  if (typeof window !== 'undefined') {
    isSupported = 'showDirectoryPicker' in window;
  }

  async function openDirectory() {
    if (!isSupported || !window.showDirectoryPicker) {
      dispatch('error', 'File System Access API is not supported in this browser');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      dispatch('directoryOpened', dirHandle);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch('error', `Failed to open directory: ${error.message}`);
      }
    }
  }

  async function openFile(fileHandle: FileSystemFileHandle, path: string) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      dispatch('fileOpened', { handle: fileHandle, content, path });
    } catch (error) {
      dispatch('error', `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function saveFile() {
    if (!currentFile || !isSupported) {
      dispatch('error', 'No file selected or File System Access API not supported');
      return;
    }

    isSaving = true;
    try {
      const writable = await currentFile.createWritable();
      await writable.write(currentContent);
      await writable.close();
      
      dispatch('fileSaved', { handle: currentFile, path: currentFile.name });
    } catch (error) {
      dispatch('error', `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isSaving = false;
    }
  }

  async function saveAsNewFile() {
    if (!isSupported || !window.showSaveFilePicker) {
      dispatch('error', 'File System Access API is not supported in this browser');
      return;
    }

    isSaving = true;
    try {
      const fileHandle = await window.showSaveFilePicker({
        types: [{
          description: 'Markdown files',
          accept: {
            'text/markdown': ['.md']
          }
        }],
        suggestedName: 'untitled.md'
      });

      const writable = await fileHandle.createWritable();
      await writable.write(currentContent);
      await writable.close();

      dispatch('fileSaved', { handle: fileHandle, path: fileHandle.name });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        dispatch('error', `Failed to save file: ${error.message}`);
      }
    } finally {
      isSaving = false;
    }
  }

  // Export functions for parent component
  export { openFile, saveFile, saveAsNewFile };
</script>

<div class="file-manager">
  <div class="toolbar">
    <button 
      class="btn btn-primary" 
      on:click={openDirectory}
      disabled={!isSupported}
      title={isSupported ? 'Open folder' : 'File System Access API not supported'}
    >
      📁 Open Folder
    </button>

    <div class="file-actions">
      <button 
        class="btn btn-secondary" 
        on:click={saveFile}
        disabled={!currentFile || !isDirty || isSaving || !isSupported}
        title={currentFile ? 'Save current file' : 'No file selected'}
      >
        {isSaving ? '💾 Saving...' : '💾 Save'}
      </button>

      <button 
        class="btn btn-secondary" 
        on:click={saveAsNewFile}
        disabled={isSaving || !isSupported}
        title="Save as new file"
      >
        📄 Save As...
      </button>
    </div>
  </div>

  {#if !isSupported}
    <div class="warning">
      <p>⚠️ File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser for full functionality.</p>
    </div>
  {/if}
</div>

<style>
  .file-manager {
    border-bottom: 1px solid #e1e5e9;
    background: white;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }

  .file-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: white;
    color: #24292f;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-decoration: none;
  }

  .btn:hover:not(:disabled) {
    background: #f3f4f6;
    border-color: #b7bdc3;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }

  .warning {
    padding: 12px 16px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    border-radius: 6px;
    margin: 0 16px 12px;
  }

  .warning p {
    margin: 0;
    font-size: 13px;
    color: #92400e;
  }
</style> 