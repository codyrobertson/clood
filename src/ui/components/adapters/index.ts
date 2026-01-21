/**
 * Document Renderer Adapters Index (EPIC 5)
 *
 * Exports adapter selection logic and all adapters.
 */

// Core types and registry
export {
  type DocumentKind,
  type RendererAdapter,
  BaseRendererAdapter,
  AdapterRegistry,
  EXTENSION_TO_KIND,
  getKindFromPath,
} from './RendererAdapter.js';

// Markdown adapter
export {
  MarkdownAdapter,
  createMarkdownAdapter,
  type MarkdownAdapterOptions,
} from './MarkdownAdapter.js';

// Code adapter
export {
  CodeAdapter,
  createCodeAdapter,
  createTextAdapter,
  type CodeAdapterOptions,
} from './CodeAdapter.js';

// PDF adapter
export {
  PdfAdapter,
  createPdfAdapter,
  isPdfSupported,
  type PdfAdapterOptions,
  type PdfToolStatus,
} from './PdfAdapter.js';

import { type DocumentKind, type RendererAdapter, AdapterRegistry, getKindFromPath } from './RendererAdapter.js';
import { MarkdownAdapter, type MarkdownAdapterOptions } from './MarkdownAdapter.js';
import { CodeAdapter, type CodeAdapterOptions } from './CodeAdapter.js';
import { PdfAdapter, type PdfAdapterOptions } from './PdfAdapter.js';

/**
 * Options for adapter selection
 */
export interface AdapterSelectionOptions {
  /** Use ANSI styling in output */
  useAnsi?: boolean;
  /** Maximum line width */
  maxWidth?: number;
  /** Show line numbers for code */
  showLineNumbers?: boolean;
  /** Custom adapter options by kind */
  adapterOptions?: {
    markdown?: MarkdownAdapterOptions;
    code?: CodeAdapterOptions;
    pdf?: PdfAdapterOptions;
  };
}

/**
 * Pre-configured default adapters
 */
let defaultRegistry: AdapterRegistry | null = null;

/**
 * Get or create the default adapter registry
 */
export function getDefaultRegistry(options: AdapterSelectionOptions = {}): AdapterRegistry {
  if (defaultRegistry === null) {
    defaultRegistry = createAdapterRegistry(options);
  }
  return defaultRegistry;
}

/**
 * Create a new adapter registry with all adapters configured
 */
export function createAdapterRegistry(options: AdapterSelectionOptions = {}): AdapterRegistry {
  const registry = new AdapterRegistry();

  const baseOptions = {
    useAnsi: options.useAnsi ?? true,
    maxWidth: options.maxWidth ?? 80,
  };

  // Get custom adapter options (default to empty objects)
  const markdownOptions = options.adapterOptions?.markdown ?? {};
  const codeOptions = options.adapterOptions?.code ?? {};
  const pdfOptions = options.adapterOptions?.pdf ?? {};

  // Register markdown adapter
  const markdownAdapter = new MarkdownAdapter({
    ...baseOptions,
    ...markdownOptions,
  });
  registry.register(markdownAdapter);

  // Register code adapter
  const codeAdapter = new CodeAdapter({
    ...baseOptions,
    showLineNumbers: options.showLineNumbers ?? true,
    ...codeOptions,
  });
  registry.register(codeAdapter);

  // Register PDF adapter
  const pdfAdapter = new PdfAdapter({
    ...baseOptions,
    ...pdfOptions,
  });
  registry.register(pdfAdapter);

  // Use code adapter as default for unknown types
  registry.setDefault(codeAdapter);

  return registry;
}

/**
 * Reset the default registry (useful for testing)
 */
export function resetDefaultRegistry(): void {
  defaultRegistry = null;
}

/**
 * Get the appropriate adapter for a file path or kind
 *
 * @param filePathOrKind - File path (with extension) or document kind
 * @param options - Optional adapter selection options
 * @returns The appropriate renderer adapter
 */
export function getAdapterForFile(
  filePathOrKind: string,
  options: AdapterSelectionOptions = {}
): RendererAdapter {
  const registry = getDefaultRegistry(options);

  // Check if it's already a known kind
  const knownKinds: DocumentKind[] = ['markdown', 'code', 'pdf', 'text', 'unknown'];
  let kind: DocumentKind;

  if (knownKinds.includes(filePathOrKind as DocumentKind)) {
    kind = filePathOrKind as DocumentKind;
  } else {
    // Extract kind from file path
    kind = getKindFromPath(filePathOrKind);
  }

  const adapter = registry.getAdapter(kind);
  if (!adapter) {
    // This shouldn't happen since we set a default, but just in case
    return new CodeAdapter(options);
  }

  return adapter;
}

/**
 * Render content using the appropriate adapter
 *
 * @param filePathOrKind - File path or document kind
 * @param content - The content to render
 * @param options - Optional adapter selection options
 * @returns Array of rendered lines
 */
export function renderContent(
  filePathOrKind: string,
  content: string,
  options: AdapterSelectionOptions = {}
): string[] {
  const adapter = getAdapterForFile(filePathOrKind, options);
  const kind = getKindFromFile(filePathOrKind);
  return adapter.render(kind, content);
}

/**
 * Get document kind from file path or kind string
 */
function getKindFromFile(filePathOrKind: string): DocumentKind {
  const knownKinds: DocumentKind[] = ['markdown', 'code', 'pdf', 'text', 'unknown'];
  if (knownKinds.includes(filePathOrKind as DocumentKind)) {
    return filePathOrKind as DocumentKind;
  }
  return getKindFromPath(filePathOrKind);
}

/**
 * Utility: Check if a file extension is supported
 */
export function isExtensionSupported(extension: string): boolean {
  // Normalize extension
  const ext = extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  const kind = getKindFromPath(ext);
  return kind !== 'unknown';
}

/**
 * Utility: Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const { EXTENSION_TO_KIND } = require('./RendererAdapter.js');
  return Object.keys(EXTENSION_TO_KIND);
}
