/**
 * Renderer Adapter Interface (UOW-0505)
 *
 * Defines the interface for document renderer adapters.
 * Each adapter handles rendering a specific document type to terminal-friendly output.
 */

/**
 * Supported document kinds/types
 */
export type DocumentKind = 'markdown' | 'code' | 'pdf' | 'text' | 'unknown';

/**
 * Renderer adapter interface
 * All document renderers must implement this interface.
 */
export interface RendererAdapter {
  /**
   * The kinds of documents this adapter can handle
   */
  readonly supportedKinds: DocumentKind[];

  /**
   * Render document content to terminal-friendly output
   * @param kind - The document kind/type
   * @param content - The raw document content
   * @returns Array of lines ready for terminal display
   */
  render(kind: DocumentKind, content: string): string[];

  /**
   * Check if this adapter can handle the given kind
   * @param kind - The document kind to check
   */
  canHandle(kind: DocumentKind): boolean;
}

/**
 * Base class for renderer adapters with common functionality
 */
export abstract class BaseRendererAdapter implements RendererAdapter {
  abstract readonly supportedKinds: DocumentKind[];

  abstract render(kind: DocumentKind, content: string): string[];

  canHandle(kind: DocumentKind): boolean {
    return this.supportedKinds.includes(kind);
  }
}

/**
 * Registry for renderer adapters by document kind
 */
export class AdapterRegistry {
  private adapters: Map<DocumentKind, RendererAdapter> = new Map();
  private defaultAdapter: RendererAdapter | null = null;

  /**
   * Register an adapter for specific document kinds
   * @param adapter - The adapter to register
   */
  register(adapter: RendererAdapter): void {
    for (const kind of adapter.supportedKinds) {
      this.adapters.set(kind, adapter);
    }
  }

  /**
   * Set the default adapter for unknown document types
   * @param adapter - The default adapter
   */
  setDefault(adapter: RendererAdapter): void {
    this.defaultAdapter = adapter;
  }

  /**
   * Get the adapter for a specific document kind
   * @param kind - The document kind
   * @returns The appropriate adapter or default adapter
   */
  getAdapter(kind: DocumentKind): RendererAdapter | null {
    return this.adapters.get(kind) || this.defaultAdapter;
  }

  /**
   * Check if an adapter is registered for the given kind
   * @param kind - The document kind
   */
  hasAdapter(kind: DocumentKind): boolean {
    return this.adapters.has(kind) || this.defaultAdapter !== null;
  }

  /**
   * Get all registered kinds
   */
  getRegisteredKinds(): DocumentKind[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Clear all registered adapters
   */
  clear(): void {
    this.adapters.clear();
    this.defaultAdapter = null;
  }
}

/**
 * Map file extensions to document kinds
 */
export const EXTENSION_TO_KIND: Record<string, DocumentKind> = {
  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
  '.mkd': 'markdown',

  // Code files
  '.ts': 'code',
  '.tsx': 'code',
  '.js': 'code',
  '.jsx': 'code',
  '.py': 'code',
  '.rb': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.java': 'code',
  '.c': 'code',
  '.cpp': 'code',
  '.h': 'code',
  '.hpp': 'code',
  '.cs': 'code',
  '.php': 'code',
  '.swift': 'code',
  '.kt': 'code',
  '.scala': 'code',
  '.sh': 'code',
  '.bash': 'code',
  '.zsh': 'code',
  '.fish': 'code',
  '.ps1': 'code',
  '.sql': 'code',
  '.json': 'code',
  '.yaml': 'code',
  '.yml': 'code',
  '.toml': 'code',
  '.xml': 'code',
  '.html': 'code',
  '.css': 'code',
  '.scss': 'code',
  '.sass': 'code',
  '.less': 'code',
  '.vue': 'code',
  '.svelte': 'code',

  // Plain text
  '.txt': 'text',
  '.log': 'text',
  '.csv': 'text',

  // PDF
  '.pdf': 'pdf',
};

/**
 * Get the document kind from a file path or extension
 * @param filePathOrExt - File path or extension (with or without dot)
 */
export function getKindFromPath(filePathOrExt: string): DocumentKind {
  // Extract extension from path
  const lastDot = filePathOrExt.lastIndexOf('.');
  if (lastDot === -1) {
    return 'unknown';
  }

  const extension = filePathOrExt.slice(lastDot).toLowerCase();
  return EXTENSION_TO_KIND[extension] || 'unknown';
}
