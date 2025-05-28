<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import TreeItem from './TreeItem.svelte';
  import type { FileSystemDirectoryHandle, FileSystemFileHandle } from '$lib/types/filesystem';

  export let rootDirectory: FileSystemDirectoryHandle | null = null;

  const dispatch = createEventDispatcher<{
    fileSelected: { file: FileSystemFileHandle; path: string };
    folderSelected: { folder: FileSystemDirectoryHandle; path: string };
  }>();

  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    handle: FileSystemDirectoryHandle | FileSystemFileHandle;
    children?: TreeNode[];
    expanded?: boolean;
  }

  let treeData: TreeNode[] = [];
  let selectedPath: string = '';

  async function loadDirectory(dirHandle: FileSystemDirectoryHandle, path = ''): Promise<TreeNode[]> {
    const nodes: TreeNode[] = [];
    
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        const fullPath = path ? `${path}/${name}` : name;
        
        if (handle.kind === 'directory') {
          nodes.push({
            name,
            path: fullPath,
            type: 'folder',
            handle,
            children: [],
            expanded: false
          });
        } else if (handle.kind === 'file' && name.endsWith('.md')) {
          nodes.push({
            name,
            path: fullPath,
            type: 'file',
            handle
          });
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    // Sort: folders first, then files, both alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async function toggleFolder(node: TreeNode) {
    if (node.type !== 'folder') return;

    if (!node.expanded) {
      // Load children if not already loaded
      if (node.children?.length === 0) {
        node.children = await loadDirectory(node.handle as FileSystemDirectoryHandle, node.path);
      }
      node.expanded = true;
    } else {
      node.expanded = false;
    }
    
    // Trigger reactivity
    treeData = treeData;
    
    dispatch('folderSelected', { 
      folder: node.handle as FileSystemDirectoryHandle, 
      path: node.path 
    });
  }

  function selectFile(node: TreeNode) {
    if (node.type !== 'file') return;
    
    selectedPath = node.path;
    dispatch('fileSelected', { 
      file: node.handle as FileSystemFileHandle, 
      path: node.path 
    });
  }

  // Initialize tree when root directory changes
  $: if (rootDirectory) {
    loadDirectory(rootDirectory).then(nodes => {
      treeData = nodes;
    });
  }
</script>

<div class="file-tree">
  <div class="tree-header">
    <h3>Files</h3>
  </div>
  
  <div class="tree-content">
    {#each treeData as node}
      <TreeItem {node} {selectedPath} on:toggle={e => toggleFolder(e.detail)} on:select={e => selectFile(e.detail)} />
    {/each}
  </div>
</div>

<style>
  .file-tree {
    height: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #e1e5e9;
    background: #fafbfc;
  }

  .tree-header {
    padding: 16px;
    border-bottom: 1px solid #e1e5e9;
    background: white;
  }

  .tree-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #24292f;
  }

  .tree-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
</style> 