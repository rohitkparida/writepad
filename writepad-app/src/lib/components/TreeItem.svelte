<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    handle: any;
    children?: TreeNode[];
    expanded?: boolean;
  }

  export let node: TreeNode;
  export let selectedPath: string = '';
  export let level: number = 0;

  const dispatch = createEventDispatcher<{
    toggle: TreeNode;
    select: TreeNode;
  }>();

  function handleClick() {
    if (node.type === 'folder') {
      dispatch('toggle', node);
    } else {
      dispatch('select', node);
    }
  }

  $: isSelected = selectedPath === node.path;
  $: indentStyle = `padding-left: ${level * 16 + 8}px`;
</script>

<div class="tree-item" class:selected={isSelected} style={indentStyle}>
  <div class="item-content" on:click={handleClick} role="button" tabindex="0">
    {#if node.type === 'folder'}
      <span class="folder-icon" class:expanded={node.expanded}>
        {node.expanded ? '📂' : '📁'}
      </span>
      <span class="expand-icon" class:rotated={node.expanded}>
        ▶
      </span>
    {:else}
      <span class="file-icon">📄</span>
    {/if}
    <span class="item-name">{node.name}</span>
  </div>
</div>

{#if node.type === 'folder' && node.expanded && node.children}
  {#each node.children as child}
    <svelte:self 
      node={child} 
      {selectedPath} 
      level={level + 1} 
      on:toggle 
      on:select 
    />
  {/each}
{/if}

<style>
  .tree-item {
    user-select: none;
  }

  .item-content {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 4px;
    margin: 1px 8px;
    transition: background-color 0.15s ease;
  }

  .item-content:hover {
    background-color: #f0f4f8;
  }

  .tree-item.selected .item-content {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .expand-icon {
    font-size: 10px;
    color: #6b7280;
    transition: transform 0.15s ease;
    width: 12px;
    display: flex;
    justify-content: center;
  }

  .expand-icon.rotated {
    transform: rotate(90deg);
  }

  .folder-icon,
  .file-icon {
    font-size: 14px;
    width: 16px;
    display: flex;
    justify-content: center;
  }

  .item-name {
    font-size: 13px;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tree-item.selected .item-name {
    color: #1e40af;
    font-weight: 500;
  }
</style> 