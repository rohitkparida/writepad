<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let visible = false;
  
  const dispatch = createEventDispatcher<{
    command: {
      type: 'bold' | 'italic' | 'strikethrough' | 'code' | 'heading' | 'list' | 'task-list' | 'table' | 'link' | 'hr';
      value?: any;
    };
  }>();

  function handleCommand(type: string, value?: any) {
    dispatch('command', { type: type as any, value });
  }

  function handleHeadingSelect(event: Event) {
    const target = event.target as HTMLSelectElement;
    const level = parseInt(target.value);
    if (level > 0) {
      handleCommand('heading', level);
      target.value = '0'; // Reset to default
    }
  }
</script>

{#if visible}
  <div class="toolbar">
    <div class="toolbar-group">
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('bold')}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('italic')}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <em>I</em>
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('strikethrough')}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <span style="text-decoration: line-through;">S</span>
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('code')}
        title="Inline Code"
        aria-label="Inline Code"
      >
        <code>&lt;/&gt;</code>
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <select 
        class="toolbar-select" 
        on:change={handleHeadingSelect}
        title="Heading Level"
        aria-label="Heading Level"
      >
        <option value="0">Heading</option>
        <option value="1">H1</option>
        <option value="2">H2</option>
        <option value="3">H3</option>
        <option value="4">H4</option>
        <option value="5">H5</option>
        <option value="6">H6</option>
      </select>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('list')}
        title="Bullet List"
        aria-label="Bullet List"
      >
        ☰
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('task-list')}
        title="Task List"
        aria-label="Task List"
      >
        ☑
      </button>
    </div>

    <div class="toolbar-separator"></div>

    <div class="toolbar-group">
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('link')}
        title="Link (Ctrl+K)"
        aria-label="Link"
      >
        🔗
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('table')}
        title="Table"
        aria-label="Table"
      >
        ⊞
      </button>
      
      <button 
        class="toolbar-button" 
        on:click={() => handleCommand('hr')}
        title="Horizontal Rule"
        aria-label="Horizontal Rule"
      >
        ―
      </button>
    </div>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f6f8fa;
    border-bottom: 1px solid #e1e5e9;
    border-radius: 8px 8px 0 0;
    font-size: 14px;
    flex-wrap: wrap;
  }

  .toolbar-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: white;
    border: 1px solid #d1d9e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: #24292f;
  }

  .toolbar-button:hover {
    background: #e1e5e9;
    border-color: #c1c9d0;
  }

  .toolbar-button:active {
    background: #d1d9e0;
    transform: translateY(1px);
  }

  .toolbar-select {
    height: 32px;
    padding: 4px 8px;
    background: white;
    border: 1px solid #d1d9e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    color: #24292f;
    min-width: 80px;
  }

  .toolbar-select:hover {
    border-color: #c1c9d0;
  }

  .toolbar-select:focus {
    outline: 2px solid #0969da;
    outline-offset: 2px;
    border-color: #0969da;
  }

  .toolbar-separator {
    width: 1px;
    height: 24px;
    background: #d1d9e0;
    margin: 0 4px;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .toolbar {
      background: #21262d;
      border-bottom-color: #30363d;
    }

    .toolbar-button {
      background: #161b22;
      border-color: #30363d;
      color: #e6edf3;
    }

    .toolbar-button:hover {
      background: #30363d;
      border-color: #484f58;
    }

    .toolbar-button:active {
      background: #21262d;
    }

    .toolbar-select {
      background: #161b22;
      border-color: #30363d;
      color: #e6edf3;
    }

    .toolbar-select:hover {
      border-color: #484f58;
    }

    .toolbar-select:focus {
      outline-color: #1f6feb;
      border-color: #1f6feb;
    }

    .toolbar-separator {
      background: #30363d;
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .toolbar {
      padding: 6px 12px;
      gap: 6px;
    }

    .toolbar-button {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }

    .toolbar-select {
      height: 28px;
      font-size: 12px;
      min-width: 70px;
    }

    .toolbar-separator {
      height: 20px;
      margin: 0 2px;
    }
  }
</style> 