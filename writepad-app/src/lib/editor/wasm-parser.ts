// WASM-based parser using Rust/pulldown-cmark
import type { StateNode } from './shared';

let wasmModule: any = null;

async function loadWasm() {
  if (wasmModule) return wasmModule;
  
  try {
    // Load the WASM module using fetch and blob URL
    const wasmPath = '/markdown-parser/pkg/markdown_parser.js';
    const response = await fetch(wasmPath);
    const jsCode = await response.text();
    
    // Create a blob URL for the JS code
    const blob = new Blob([jsCode], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Import the module
    const module = await import(blobUrl);
    
    // Initialize the WASM module
    await module.default();
    
    wasmModule = module;
    console.log('✅ markdown-rs WASM module loaded successfully');
    return wasmModule;
  } catch (error) {
    console.error('❌ Failed to load markdown-rs WASM module:', error);
    throw error;
  }
}

export async function* parseMarkdownWasm(input: string): AsyncGenerator<StateNode, void, unknown> {
  try {
    const startTime = performance.now();
    
    const module = await loadWasm();
    const result = module.parse_markdown(input);
    
    const endTime = performance.now();
    console.log(`🦀 markdown-rs parsing took ${(endTime - startTime).toFixed(2)}ms`);
    
    if (result && Array.isArray(result)) {
      for (const block of result) {
        yield block as StateNode;
      }
    } else {
      console.warn('⚠️ markdown-rs returned invalid result, falling back to paragraph');
      yield {
        type: 'paragraph',
        content: [input],
        length: 1
      };
    }
  } catch (error) {
    console.error('❌ markdown-rs parsing error:', error);
    // Fallback to simple paragraph
    yield {
      type: 'paragraph',
      content: [input],
      length: 1
    };
  }
}

export async function parseMarkdownToHtml(input: string): Promise<string> {
  try {
    const module = await loadWasm();
    return module.parse_markdown_html(input);
  } catch (error) {
    console.error('❌ markdown-rs HTML conversion error:', error);
    return `<p>${input.replace(/[<>&"']/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[char] || char;
    })}</p>`;
  }
} 