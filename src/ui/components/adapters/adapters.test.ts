/**
 * Document Renderer Adapters Tests (EPIC 5)
 *
 * Tests for UOW-0505 through UOW-0511
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  // Core types and registry
  AdapterRegistry,
  getKindFromPath,
  EXTENSION_TO_KIND,
  type DocumentKind,

  // Markdown adapter
  MarkdownAdapter,
  createMarkdownAdapter,

  // Code adapter
  CodeAdapter,
  createCodeAdapter,
  createTextAdapter,

  // PDF adapter
  PdfAdapter,
  createPdfAdapter,

  // Selection logic
  getAdapterForFile,
  renderContent,
  isExtensionSupported,
  createAdapterRegistry,
  resetDefaultRegistry,
} from './index.js';

describe('RendererAdapter (UOW-0505)', () => {
  describe('AdapterRegistry', () => {
    let registry: AdapterRegistry;

    beforeEach(() => {
      registry = new AdapterRegistry();
    });

    it('should register adapters by kind', () => {
      const adapter = new MarkdownAdapter();
      registry.register(adapter);

      expect(registry.hasAdapter('markdown')).toBe(true);
      expect(registry.getAdapter('markdown')).toBe(adapter);
    });

    it('should return null for unregistered kinds without default', () => {
      expect(registry.getAdapter('markdown')).toBeNull();
    });

    it('should return default adapter for unregistered kinds', () => {
      const defaultAdapter = new CodeAdapter();
      registry.setDefault(defaultAdapter);

      expect(registry.getAdapter('unknown')).toBe(defaultAdapter);
    });

    it('should list registered kinds', () => {
      registry.register(new MarkdownAdapter());
      registry.register(new CodeAdapter());

      const kinds = registry.getRegisteredKinds();
      expect(kinds).toContain('markdown');
      expect(kinds).toContain('code');
      expect(kinds).toContain('text');
    });

    it('should clear all adapters', () => {
      registry.register(new MarkdownAdapter());
      registry.setDefault(new CodeAdapter());
      registry.clear();

      expect(registry.hasAdapter('markdown')).toBe(false);
      expect(registry.getAdapter('unknown')).toBeNull();
    });
  });

  describe('getKindFromPath', () => {
    it('should identify markdown files', () => {
      expect(getKindFromPath('README.md')).toBe('markdown');
      expect(getKindFromPath('/path/to/file.markdown')).toBe('markdown');
      expect(getKindFromPath('docs.mdown')).toBe('markdown');
    });

    it('should identify code files', () => {
      expect(getKindFromPath('index.ts')).toBe('code');
      expect(getKindFromPath('app.tsx')).toBe('code');
      expect(getKindFromPath('script.js')).toBe('code');
      expect(getKindFromPath('main.py')).toBe('code');
      expect(getKindFromPath('config.json')).toBe('code');
      expect(getKindFromPath('styles.css')).toBe('code');
    });

    it('should identify text files', () => {
      expect(getKindFromPath('notes.txt')).toBe('text');
      expect(getKindFromPath('server.log')).toBe('text');
      expect(getKindFromPath('data.csv')).toBe('text');
    });

    it('should identify PDF files', () => {
      expect(getKindFromPath('document.pdf')).toBe('pdf');
      expect(getKindFromPath('/path/to/report.PDF')).toBe('pdf');
    });

    it('should return unknown for unsupported extensions', () => {
      expect(getKindFromPath('file.xyz')).toBe('unknown');
      expect(getKindFromPath('noextension')).toBe('unknown');
    });

    it('should handle case-insensitive extensions', () => {
      expect(getKindFromPath('FILE.MD')).toBe('markdown');
      expect(getKindFromPath('CODE.TS')).toBe('code');
    });
  });

  describe('EXTENSION_TO_KIND mapping', () => {
    it('should have expected markdown extensions', () => {
      expect(EXTENSION_TO_KIND['.md']).toBe('markdown');
      expect(EXTENSION_TO_KIND['.markdown']).toBe('markdown');
    });

    it('should have expected code extensions', () => {
      expect(EXTENSION_TO_KIND['.ts']).toBe('code');
      expect(EXTENSION_TO_KIND['.js']).toBe('code');
      expect(EXTENSION_TO_KIND['.py']).toBe('code');
    });
  });
});

describe('MarkdownAdapter (UOW-0506)', () => {
  let adapter: MarkdownAdapter;

  beforeEach(() => {
    adapter = new MarkdownAdapter({ useAnsi: false });
  });

  it('should support markdown kind', () => {
    expect(adapter.canHandle('markdown')).toBe(true);
    expect(adapter.canHandle('code')).toBe(false);
  });

  it('should render headings', () => {
    const lines = adapter.render('markdown', '# Hello World');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toContain('Hello World');
  });

  it('should render paragraphs', () => {
    const lines = adapter.render('markdown', 'This is a paragraph.');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toContain('This is a paragraph.');
  });

  it('should render code blocks', () => {
    const markdown = '```js\nconst x = 1;\n```';
    const lines = adapter.render('markdown', markdown);
    expect(lines.join('\n')).toContain('const x = 1');
  });

  it('should render lists', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const lines = adapter.render('markdown', markdown);
    expect(lines.join('\n')).toContain('Item 1');
    expect(lines.join('\n')).toContain('Item 2');
    expect(lines.join('\n')).toContain('Item 3');
  });

  it('should render blockquotes', () => {
    const markdown = '> This is a quote';
    const lines = adapter.render('markdown', markdown);
    expect(lines.join('\n')).toContain('This is a quote');
  });

  it('should handle complex documents', () => {
    const markdown = `# Title

This is a paragraph with **bold** text.

- List item 1
- List item 2

\`\`\`typescript
const x: number = 42;
\`\`\`
`;
    const lines = adapter.render('markdown', markdown);
    const output = lines.join('\n');

    expect(output).toContain('Title');
    expect(output).toContain('bold');
    expect(output).toContain('List item');
    expect(output).toContain('const x');
  });

  describe('with ANSI styling', () => {
    let styledAdapter: MarkdownAdapter;

    beforeEach(() => {
      styledAdapter = new MarkdownAdapter({ useAnsi: true });
    });

    it('should include ANSI codes when enabled', () => {
      const lines = styledAdapter.render('markdown', '# Heading');
      const output = lines.join('\n');
      // ANSI escape codes start with \x1b[
      expect(output).toMatch(/\x1b\[/);
    });
  });

  describe('createMarkdownAdapter helper', () => {
    it('should create adapter with options', () => {
      const adapter = createMarkdownAdapter({ maxWidth: 40 });
      expect(adapter).toBeInstanceOf(MarkdownAdapter);
    });
  });
});

describe('CodeAdapter (UOW-0507)', () => {
  let adapter: CodeAdapter;

  beforeEach(() => {
    adapter = new CodeAdapter({ useAnsi: false });
  });

  it('should support code and text kinds', () => {
    expect(adapter.canHandle('code')).toBe(true);
    expect(adapter.canHandle('text')).toBe(true);
    expect(adapter.canHandle('markdown')).toBe(false);
  });

  it('should render with line numbers by default', () => {
    const code = 'line 1\nline 2\nline 3';
    const lines = adapter.render('code', code);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('1');
    expect(lines[0]).toContain('line 1');
    expect(lines[1]).toContain('2');
    expect(lines[2]).toContain('3');
  });

  it('should render without line numbers when disabled', () => {
    const noLineNumAdapter = new CodeAdapter({
      useAnsi: false,
      showLineNumbers: false,
    });
    const lines = noLineNumAdapter.render('code', 'hello');

    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('hello');
  });

  it('should expand tabs', () => {
    const tabAdapter = new CodeAdapter({
      useAnsi: false,
      showLineNumbers: false,
      tabSize: 4,
    });
    const lines = tabAdapter.render('code', '\thello');

    expect(lines[0]).toBe('    hello');
  });

  it('should handle custom start line', () => {
    const customStartAdapter = new CodeAdapter({
      useAnsi: false,
      startLine: 10,
    });
    const lines = customStartAdapter.render('code', 'line');

    expect(lines[0]).toContain('10');
  });

  it('should render range of lines', () => {
    const code = 'line 1\nline 2\nline 3\nline 4\nline 5';
    const lines = adapter.renderRange(code, 2, 4);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('2');
    expect(lines[0]).toContain('line 2');
    expect(lines[2]).toContain('4');
  });

  describe('syntax highlighting stub', () => {
    it('should have syntaxHighlight option', () => {
      const highlightAdapter = new CodeAdapter({
        useAnsi: true,
        syntaxHighlight: true,
      });
      const lines = highlightAdapter.render('code', 'const x = 1;');
      // Stub should still return valid output
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe('createCodeAdapter helper', () => {
    it('should create adapter with options', () => {
      const adapter = createCodeAdapter({ tabSize: 8 });
      expect(adapter).toBeInstanceOf(CodeAdapter);
    });
  });

  describe('createTextAdapter helper', () => {
    it('should create adapter without line numbers', () => {
      const textAdapter = createTextAdapter();
      const lines = textAdapter.render('text', 'plain text');

      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('plain text');
    });
  });
});

describe('PdfAdapter (UOW-0509, UOW-0510, UOW-0511)', () => {
  let adapter: PdfAdapter;

  beforeEach(() => {
    adapter = new PdfAdapter({ useAnsi: false });
  });

  it('should support pdf kind', () => {
    expect(adapter.canHandle('pdf')).toBe(true);
    expect(adapter.canHandle('code')).toBe(false);
  });

  it('should check tool availability', () => {
    const status = adapter.checkToolAvailability();

    // Status should have expected properties
    expect(status).toHaveProperty('available');
    expect(status).toHaveProperty('toolPath');
    expect(status).toHaveProperty('version');
    expect(status).toHaveProperty('error');
  });

  it('should cache tool availability status', () => {
    const status1 = adapter.checkToolAvailability();
    const status2 = adapter.checkToolAvailability();

    expect(status1).toBe(status2); // Same object reference
  });

  it('should reset tool status', () => {
    adapter.checkToolAvailability();
    adapter.resetToolStatus();
    // After reset, next check should be fresh
    expect(adapter.checkToolAvailability()).toBeDefined();
  });

  it('should render unsupported message when tool is missing', () => {
    // Create adapter with non-existent tool path
    const unavailableAdapter = new PdfAdapter({
      useAnsi: false,
      pdftotextPath: '/definitely_nonexistent_path_xyz123/pdftotext',
    });

    // First verify the tool is actually not found
    const status = unavailableAdapter.checkToolAvailability();

    if (status.available) {
      // If somehow tool is "available" (unlikely), skip this test
      // This can happen in unusual environments
      console.log('Skipping test: pdftotext unexpectedly available');
      return;
    }

    const lines = unavailableAdapter.renderFromFile('/some/file.pdf');
    const output = lines.join('\n');

    expect(output).toContain('PDF Support Unavailable');
    expect(output).toContain('pdftotext');
    expect(output).toContain('installation');
  });

  it('should render error for non-existent file', () => {
    // Only test if pdftotext is available
    const status = adapter.checkToolAvailability();
    if (!status.available) {
      return; // Skip test if tool not available
    }

    const lines = adapter.renderFromFile('/nonexistent/file.pdf');
    const output = lines.join('\n');

    expect(output.toLowerCase()).toContain('not found');
  });

  it('should format pre-extracted text content', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const lines = adapter.render('pdf', text);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Line 1');
    expect(lines[1]).toBe('Line 2');
    expect(lines[2]).toBe('Line 3');
  });

  it('should wrap long lines', () => {
    const narrowAdapter = new PdfAdapter({
      useAnsi: false,
      maxWidth: 20,
    });
    const longText = 'This is a very long line that should be wrapped to fit within the maximum width.';
    const lines = narrowAdapter.render('pdf', longText);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(20);
    }
  });

  describe('createPdfAdapter helper', () => {
    it('should create adapter with options', () => {
      const adapter = createPdfAdapter({ timeout: 60000 });
      expect(adapter).toBeInstanceOf(PdfAdapter);
    });
  });
});

describe('Adapter Selection (index.ts)', () => {
  beforeEach(() => {
    resetDefaultRegistry();
  });

  describe('getAdapterForFile', () => {
    it('should return markdown adapter for .md files', () => {
      const adapter = getAdapterForFile('README.md');
      expect(adapter).toBeInstanceOf(MarkdownAdapter);
    });

    it('should return code adapter for .ts files', () => {
      const adapter = getAdapterForFile('index.ts');
      expect(adapter).toBeInstanceOf(CodeAdapter);
    });

    it('should return code adapter for .js files', () => {
      const adapter = getAdapterForFile('script.js');
      expect(adapter).toBeInstanceOf(CodeAdapter);
    });

    it('should return pdf adapter for .pdf files', () => {
      const adapter = getAdapterForFile('document.pdf');
      expect(adapter).toBeInstanceOf(PdfAdapter);
    });

    it('should return code adapter (default) for unknown files', () => {
      const adapter = getAdapterForFile('file.xyz');
      expect(adapter).toBeInstanceOf(CodeAdapter);
    });

    it('should accept kind directly', () => {
      const markdownAdapter = getAdapterForFile('markdown');
      expect(markdownAdapter).toBeInstanceOf(MarkdownAdapter);

      const codeAdapter = getAdapterForFile('code');
      expect(codeAdapter).toBeInstanceOf(CodeAdapter);
    });
  });

  describe('renderContent', () => {
    it('should render markdown content', () => {
      const lines = renderContent('file.md', '# Hello', { useAnsi: false });
      expect(lines.join('\n')).toContain('Hello');
    });

    it('should render code content', () => {
      const lines = renderContent('file.ts', 'const x = 1;', {
        useAnsi: false,
        showLineNumbers: false,
      });
      expect(lines.join('\n')).toContain('const x = 1');
    });

    it('should render text content', () => {
      const lines = renderContent('file.txt', 'plain text', {
        useAnsi: false,
        showLineNumbers: false,
      });
      expect(lines.join('\n')).toContain('plain text');
    });
  });

  describe('isExtensionSupported', () => {
    it('should return true for supported extensions', () => {
      expect(isExtensionSupported('.md')).toBe(true);
      expect(isExtensionSupported('.ts')).toBe(true);
      expect(isExtensionSupported('.pdf')).toBe(true);
      expect(isExtensionSupported('md')).toBe(true); // Without dot
    });

    it('should return false for unsupported extensions', () => {
      expect(isExtensionSupported('.xyz')).toBe(false);
      expect(isExtensionSupported('.unknown')).toBe(false);
    });
  });

  describe('createAdapterRegistry', () => {
    it('should create registry with all adapters', () => {
      const registry = createAdapterRegistry();

      expect(registry.hasAdapter('markdown')).toBe(true);
      expect(registry.hasAdapter('code')).toBe(true);
      expect(registry.hasAdapter('text')).toBe(true);
      expect(registry.hasAdapter('pdf')).toBe(true);
    });

    it('should apply options to adapters', () => {
      const registry = createAdapterRegistry({
        useAnsi: false,
        maxWidth: 40,
      });

      // Registry should be configured (verify by using it)
      expect(registry.getAdapter('markdown')).toBeDefined();
    });
  });
});
