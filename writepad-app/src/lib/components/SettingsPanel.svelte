<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher<{
    close: void;
    settingsChanged: {
      theme: 'light' | 'dark' | 'system';
      fontFamily: string;
      fontSize: number;
      lineHeight: number;
      showLineNumbers: boolean;
      autoSave: boolean;
      autoSaveInterval: number;
      wysiwygMode: boolean;
    };
  }>();

  // Settings state
  let theme: 'light' | 'dark' | 'system' = 'system';
  let fontFamily = 'JetBrains Mono, Consolas, Monaco, monospace';
  let fontSize = 14;
  let lineHeight = 1.5;
  let showLineNumbers = true;
  let autoSave = true;
  let autoSaveInterval = 30; // seconds
  let wysiwygMode = false;

  // Font options
  const fontOptions = [
    { value: 'JetBrains Mono, Consolas, Monaco, monospace', label: 'JetBrains Mono' },
    { value: 'Fira Code, Consolas, Monaco, monospace', label: 'Fira Code' },
    { value: 'Source Code Pro, Consolas, Monaco, monospace', label: 'Source Code Pro' },
    { value: 'Consolas, Monaco, monospace', label: 'Consolas' },
    { value: 'Monaco, Consolas, monospace', label: 'Monaco' },
    { value: 'SF Mono, Consolas, Monaco, monospace', label: 'SF Mono' },
    { value: 'Cascadia Code, Consolas, Monaco, monospace', label: 'Cascadia Code' },
  ];

  // Auto-save interval options (in seconds)
  const autoSaveIntervals = [
    { value: 10, label: '10 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 120, label: '2 minutes' },
    { value: 300, label: '5 minutes' },
  ];

  onMount(() => {
    loadSettings();
  });

  function loadSettings() {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('writepad-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        theme = settings.theme || 'system';
        fontFamily = settings.fontFamily || 'JetBrains Mono, Consolas, Monaco, monospace';
        fontSize = settings.fontSize || 14;
        lineHeight = settings.lineHeight || 1.5;
        showLineNumbers = settings.showLineNumbers ?? true;
        autoSave = settings.autoSave ?? true;
        autoSaveInterval = settings.autoSaveInterval || 30;
        wysiwygMode = settings.wysiwygMode ?? false;
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    }
  }

  function saveSettings() {
    const settings = {
      theme,
      fontFamily,
      fontSize,
      lineHeight,
      showLineNumbers,
      autoSave,
      autoSaveInterval,
      wysiwygMode,
    };
    
    localStorage.setItem('writepad-settings', JSON.stringify(settings));
    
    // Dispatch settings change event
    dispatch('settingsChanged', settings);
  }

  function handleClose() {
    saveSettings();
    dispatch('close');
  }

  function resetToDefaults() {
    theme = 'system';
    fontFamily = 'JetBrains Mono, Consolas, Monaco, monospace';
    fontSize = 14;
    lineHeight = 1.5;
    showLineNumbers = true;
    autoSave = true;
    autoSaveInterval = 30;
    wysiwygMode = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  // Apply theme detection
  function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }

  $: effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div class="settings-overlay" on:click={handleClose}>
    <div class="settings-panel" on:click|stopPropagation>
      <header class="settings-header">
        <h2>⚙️ Settings</h2>
        <button class="close-button" on:click={handleClose} aria-label="Close settings">
          ✕
        </button>
      </header>

      <div class="settings-content">
        <!-- Theme Settings -->
        <section class="settings-section">
          <h3>🎨 Appearance</h3>
          
          <div class="setting-item">
            <label for="theme-select">Theme</label>
            <select id="theme-select" bind:value={theme}>
              <option value="system">System (Auto)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p class="setting-description">
              Current: {effectiveTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </p>
          </div>

          <div class="setting-item">
            <label for="font-family-select">Font Family</label>
            <select id="font-family-select" bind:value={fontFamily}>
              {#each fontOptions as font}
                <option value={font.value}>{font.label}</option>
              {/each}
            </select>
          </div>

          <div class="setting-item">
            <label for="font-size-range">Font Size: {fontSize}px</label>
            <input 
              id="font-size-range"
              type="range" 
              min="10" 
              max="24" 
              step="1"
              bind:value={fontSize}
            />
          </div>

          <div class="setting-item">
            <label for="line-height-range">Line Height: {lineHeight}</label>
            <input 
              id="line-height-range"
              type="range" 
              min="1.0" 
              max="2.0" 
              step="0.1"
              bind:value={lineHeight}
            />
          </div>
        </section>

        <!-- Editor Settings -->
        <section class="settings-section">
          <h3>📝 Editor</h3>
          
          <div class="setting-item">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={showLineNumbers}
              />
              <span class="checkmark"></span>
              Show Line Numbers
            </label>
            <p class="setting-description">Display line numbers in the editor gutter</p>
          </div>

          <div class="setting-item">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={wysiwygMode}
              />
              <span class="checkmark"></span>
              WYSIWYG Mode
            </label>
            <p class="setting-description">Enable WYSIWYG mode for editing</p>
          </div>
        </section>

        <!-- Auto-save Settings -->
        <section class="settings-section">
          <h3>💾 Auto-save</h3>
          
          <div class="setting-item">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={autoSave}
              />
              <span class="checkmark"></span>
              Enable Auto-save
            </label>
            <p class="setting-description">Automatically save changes while typing</p>
          </div>

          {#if autoSave}
            <div class="setting-item">
              <label for="autosave-interval">Auto-save Interval</label>
              <select id="autosave-interval" bind:value={autoSaveInterval}>
                {#each autoSaveIntervals as interval}
                  <option value={interval.value}>{interval.label}</option>
                {/each}
              </select>
            </div>
          {/if}
        </section>

        <!-- Preview Section -->
        <section class="settings-section">
          <h3>👀 Preview</h3>
          <div class="font-preview" style="font-family: {fontFamily}; font-size: {fontSize}px; line-height: {lineHeight};">
            <div class="preview-line">
              {#if showLineNumbers}<span class="line-number">1</span>{/if}
              # Sample Markdown Heading
            </div>
            <div class="preview-line">
              {#if showLineNumbers}<span class="line-number">2</span>{/if}
              This is how your text will look with current settings.
            </div>
            <div class="preview-line">
              {#if showLineNumbers}<span class="line-number">3</span>{/if}
              **Bold text** and *italic text* example.
            </div>
          </div>
        </section>
      </div>

      <footer class="settings-footer">
        <button class="reset-button" on:click={resetToDefaults}>
          🔄 Reset to Defaults
        </button>
        <div class="footer-buttons">
          <button class="cancel-button" on:click={handleClose}>
            Cancel
          </button>
          <button class="save-button" on:click={handleClose}>
            Save & Close
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .settings-panel {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e1e5e9;
    background: #f6f8fa;
  }

  .settings-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #24292f;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 18px;
    color: #656d76;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .close-button:hover {
    background: #e1e5e9;
    color: #24292f;
  }

  .settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  .settings-section {
    margin-bottom: 32px;
  }

  .settings-section:last-child {
    margin-bottom: 0;
  }

  .settings-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #24292f;
    border-bottom: 1px solid #e1e5e9;
    padding-bottom: 8px;
  }

  .setting-item {
    margin-bottom: 20px;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-item label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #24292f;
    font-size: 14px;
  }

  .setting-item select,
  .setting-item input[type="range"] {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d9e0;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    transition: border-color 0.2s ease;
  }

  .setting-item select:focus,
  .setting-item input[type="range"]:focus {
    outline: none;
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
  }

  .setting-item input[type="range"] {
    height: 6px;
    background: #e1e5e9;
    border: none;
    border-radius: 3px;
    padding: 0;
  }

  .setting-item input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    background: #0969da;
    border-radius: 50%;
    cursor: pointer;
  }

  .setting-item input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    background: #0969da;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .checkbox-label {
    display: flex !important;
    align-items: center;
    cursor: pointer;
    margin-bottom: 0 !important;
  }

  .checkbox-label input[type="checkbox"] {
    margin-right: 12px;
    width: 18px;
    height: 18px;
    accent-color: #0969da;
  }

  .setting-description {
    margin: 6px 0 0 0;
    font-size: 12px;
    color: #656d76;
    line-height: 1.4;
  }

  .font-preview {
    background: #f6f8fa;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    padding: 16px;
    margin-top: 12px;
  }

  .preview-line {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .preview-line:last-child {
    margin-bottom: 0;
  }

  .line-number {
    color: #656d76;
    font-size: 12px;
    width: 24px;
    text-align: right;
    margin-right: 12px;
    user-select: none;
  }

  .settings-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-top: 1px solid #e1e5e9;
    background: #f6f8fa;
  }

  .reset-button {
    background: none;
    border: 1px solid #d1d9e0;
    color: #656d76;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .reset-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .footer-buttons {
    display: flex;
    gap: 12px;
  }

  .cancel-button,
  .save-button {
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-button {
    background: none;
    border: 1px solid #d1d9e0;
    color: #656d76;
  }

  .cancel-button:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  .save-button {
    background: #0969da;
    border: 1px solid #0969da;
    color: white;
  }

  .save-button:hover {
    background: #0860ca;
    border-color: #0860ca;
  }

  /* Dark theme styles */
  @media (prefers-color-scheme: dark) {
    .settings-panel {
      background: #21262d;
      color: #e6edf3;
    }

    .settings-header {
      background: #161b22;
      border-bottom-color: #30363d;
    }

    .settings-header h2 {
      color: #e6edf3;
    }

    .close-button {
      color: #7d8590;
    }

    .close-button:hover {
      background: #30363d;
      color: #e6edf3;
    }

    .settings-section h3 {
      color: #e6edf3;
      border-bottom-color: #30363d;
    }

    .setting-item label {
      color: #e6edf3;
    }

    .setting-item select {
      background: #21262d;
      border-color: #30363d;
      color: #e6edf3;
    }

    .setting-item select:focus {
      border-color: #1f6feb;
      box-shadow: 0 0 0 3px rgba(31, 111, 235, 0.1);
    }

    .setting-item input[type="range"] {
      background: #30363d;
    }

    .setting-item input[type="range"]::-webkit-slider-thumb {
      background: #1f6feb;
    }

    .setting-item input[type="range"]::-moz-range-thumb {
      background: #1f6feb;
    }

    .setting-description {
      color: #7d8590;
    }

    .font-preview {
      background: #161b22;
      border-color: #30363d;
    }

    .line-number {
      color: #7d8590;
    }

    .settings-footer {
      background: #161b22;
      border-top-color: #30363d;
    }

    .reset-button {
      border-color: #30363d;
      color: #7d8590;
    }

    .reset-button:hover {
      background: #30363d;
      border-color: #484f58;
    }

    .cancel-button {
      border-color: #30363d;
      color: #7d8590;
    }

    .cancel-button:hover {
      background: #30363d;
      border-color: #484f58;
    }

    .save-button {
      background: #1f6feb;
      border-color: #1f6feb;
    }

    .save-button:hover {
      background: #1a5feb;
      border-color: #1a5feb;
    }
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .settings-panel {
      width: 95%;
      margin: 20px;
    }

    .settings-header,
    .settings-content,
    .settings-footer {
      padding: 16px;
    }

    .footer-buttons {
      flex-direction: column;
      width: 100%;
    }

    .cancel-button,
    .save-button {
      width: 100%;
      justify-content: center;
    }
  }
</style> 