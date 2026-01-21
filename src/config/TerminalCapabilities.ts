/**
 * Terminal Capabilities Detection (UOW-1121)
 *
 * Detects terminal capabilities including:
 * - Kitty graphics protocol
 * - iTerm2 inline images
 * - Sixel graphics
 * - True color (24-bit) support
 * - 256 color support
 * - Unicode support
 * - Mouse support
 * - Clipboard support (OSC 52)
 */

import { TerminalCapabilitiesConfig } from './ConfigSchema.js';

/**
 * Terminal capability flags
 */
export interface TerminalCapabilities {
  // Graphics protocols
  kittyGraphics: boolean;
  iTermImages: boolean;
  sixel: boolean;

  // Color support
  trueColor: boolean;
  color256: boolean;

  // Unicode support
  unicode: boolean;

  // Input/output capabilities
  mouse: boolean;
  clipboard: boolean;

  // Terminal info
  terminalName: string | null;
  terminalVersion: string | null;
  termType: string | null;
}

/**
 * Detection method for a capability
 */
export type CapabilitySource = 'auto' | 'enabled' | 'disabled';

/**
 * Options for capability detection
 */
export interface CapabilityDetectorOptions {
  /** Override configurations */
  config?: Partial<TerminalCapabilitiesConfig>;
  /** Enable async detection (may involve terminal queries) */
  enableAsyncDetection?: boolean;
}

/**
 * Known terminals that support Kitty graphics protocol
 */
const KITTY_GRAPHICS_TERMINALS = new Set([
  'kitty',
  'wezterm',
  'konsole',
]);

/**
 * Known terminals that support iTerm2 inline images
 */
const ITERM_IMAGE_TERMINALS = new Set([
  'iterm.app',
  'iterm2',
  'mintty',
  'wezterm',
  'hyper',
]);

/**
 * Known terminals that support Sixel graphics
 */
const SIXEL_TERMINALS = new Set([
  'xterm',
  'mlterm',
  'mintty',
  'foot',
  'contour',
  'wezterm',
  'yaft',
]);

/**
 * Terminal Capabilities Detector
 */
export class TerminalCapabilitiesDetector {
  private config: Partial<TerminalCapabilitiesConfig>;
  private cachedCapabilities: TerminalCapabilities | null = null;

  constructor(options: CapabilityDetectorOptions = {}) {
    this.config = options.config || {};
  }

  /**
   * Detect all terminal capabilities
   */
  detect(): TerminalCapabilities {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    this.cachedCapabilities = {
      kittyGraphics: this.detectKittyGraphics(),
      iTermImages: this.detectITermImages(),
      sixel: this.detectSixel(),
      trueColor: this.detectTrueColor(),
      color256: this.detect256Color(),
      unicode: this.detectUnicode(),
      mouse: this.detectMouse(),
      clipboard: this.detectClipboard(),
      terminalName: this.getTerminalName(),
      terminalVersion: this.getTerminalVersion(),
      termType: process.env['TERM'] || null,
    };

    return this.cachedCapabilities;
  }

  /**
   * Clear cached detection result
   */
  clearCache(): void {
    this.cachedCapabilities = null;
  }

  /**
   * Update configuration and clear cache
   */
  updateConfig(config: Partial<TerminalCapabilitiesConfig>): void {
    this.config = { ...this.config, ...config };
    this.clearCache();
  }

  /**
   * Detect Kitty graphics protocol support
   *
   * Kitty uses a custom escape sequence protocol for displaying images
   */
  private detectKittyGraphics(): boolean {
    const setting = this.config.kittyGraphics;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check TERM_PROGRAM
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();
    if (termProgram && KITTY_GRAPHICS_TERMINALS.has(termProgram)) {
      return true;
    }

    // Check for KITTY_WINDOW_ID (set by kitty terminal)
    if (process.env['KITTY_WINDOW_ID']) {
      return true;
    }

    // Check for kitty in TERM
    const term = process.env['TERM'];
    if (term?.includes('kitty')) {
      return true;
    }

    // Check WEZTERM_EXECUTABLE
    if (process.env['WEZTERM_EXECUTABLE']) {
      return true;
    }

    // Check KONSOLE_VERSION (Konsole 22.04+ supports kitty graphics)
    const konsoleVersion = process.env['KONSOLE_VERSION'];
    if (konsoleVersion) {
      const version = parseInt(konsoleVersion, 10);
      if (!isNaN(version) && version >= 220400) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect iTerm2 inline images support
   *
   * iTerm2 uses base64-encoded images with OSC sequences
   */
  private detectITermImages(): boolean {
    const setting = this.config.iTermImages;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check TERM_PROGRAM
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();
    if (termProgram && ITERM_IMAGE_TERMINALS.has(termProgram)) {
      return true;
    }

    // Check for iTerm.app specifically
    if (termProgram === 'iterm.app' || process.env['ITERM_SESSION_ID']) {
      return true;
    }

    // Check for WEZTERM (supports iTerm2 protocol)
    if (process.env['WEZTERM_EXECUTABLE']) {
      return true;
    }

    // Check for mintty (Windows terminal that supports iTerm2 images)
    const termProgramVersion = process.env['TERM_PROGRAM_VERSION'];
    if (termProgram === 'mintty' && termProgramVersion) {
      return true;
    }

    // Check LC_TERMINAL (some terminals set this)
    const lcTerminal = process.env['LC_TERMINAL']?.toLowerCase();
    if (lcTerminal && ITERM_IMAGE_TERMINALS.has(lcTerminal)) {
      return true;
    }

    return false;
  }

  /**
   * Detect Sixel graphics support
   *
   * Sixel is a DEC protocol for bitmap graphics in terminals
   */
  private detectSixel(): boolean {
    const setting = this.config.sixel;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check TERM_PROGRAM
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();
    if (termProgram && SIXEL_TERMINALS.has(termProgram)) {
      return true;
    }

    // Check TERM for known sixel-capable terminals
    const term = process.env['TERM'];
    if (term) {
      // mlterm sets TERM to mlterm
      if (term.includes('mlterm')) {
        return true;
      }
      // XTerm with sixel support
      if (term.includes('xterm') && process.env['XTERM_VERSION']) {
        return true;
      }
      // foot terminal
      if (term === 'foot' || term.startsWith('foot-')) {
        return true;
      }
    }

    // Check WEZTERM (supports sixel)
    if (process.env['WEZTERM_EXECUTABLE']) {
      return true;
    }

    // Check MINTTY_SHORTCUT (mintty on Windows supports sixel)
    if (process.env['MINTTY_SHORTCUT']) {
      return true;
    }

    return false;
  }

  /**
   * Detect true color (24-bit) support
   */
  private detectTrueColor(): boolean {
    const setting = this.config.trueColor;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check COLORTERM for truecolor support
    const colorterm = process.env['COLORTERM'];
    if (colorterm === 'truecolor' || colorterm === '24bit') {
      return true;
    }

    // Check TERM for direct color support
    const term = process.env['TERM'];
    if (term?.includes('direct') || term?.includes('truecolor')) {
      return true;
    }

    // Most modern terminals support true color
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();
    const modernTerminals = [
      'iterm.app',
      'apple_terminal',
      'hyper',
      'vscode',
      'terminus',
      'alacritty',
      'kitty',
      'wezterm',
      'contour',
    ];
    if (termProgram && modernTerminals.includes(termProgram)) {
      return true;
    }

    // Windows Terminal
    if (process.env['WT_SESSION']) {
      return true;
    }

    // ConEmu
    if (process.env['ConEmuANSI'] === 'ON') {
      return true;
    }

    // xterm-256color often supports true color
    if (term === 'xterm-256color' || term === 'screen-256color' || term === 'tmux-256color') {
      return true;
    }

    return false;
  }

  /**
   * Detect 256 color support
   */
  private detect256Color(): boolean {
    const setting = this.config.color256;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // If true color is supported, 256 color is also supported
    if (this.detectTrueColor()) {
      return true;
    }

    // Check TERM for 256color
    const term = process.env['TERM'];
    if (term?.includes('256color') || term?.includes('256')) {
      return true;
    }

    // Check COLORTERM
    const colorterm = process.env['COLORTERM'];
    if (colorterm === '256' || colorterm === '256color') {
      return true;
    }

    // Most terminal emulators support 256 colors
    const termProgram = process.env['TERM_PROGRAM'];
    if (termProgram) {
      return true;
    }

    return false;
  }

  /**
   * Detect Unicode support
   */
  private detectUnicode(): boolean {
    const setting = this.config.unicode;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check locale settings
    const lang = process.env['LANG'] || '';
    const lcAll = process.env['LC_ALL'] || '';
    const lcCtype = process.env['LC_CTYPE'] || '';

    if (
      lang.includes('UTF-8') ||
      lang.includes('utf8') ||
      lcAll.includes('UTF-8') ||
      lcAll.includes('utf8') ||
      lcCtype.includes('UTF-8') ||
      lcCtype.includes('utf8')
    ) {
      return true;
    }

    // Most modern terminals support Unicode
    const term = process.env['TERM'];
    if (term && !term.startsWith('vt') && term !== 'dumb' && term !== 'linux') {
      return true;
    }

    return false;
  }

  /**
   * Detect mouse support
   */
  private detectMouse(): boolean {
    const setting = this.config.mouse;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Dumb terminals don't support mouse
    const term = process.env['TERM'];
    if (term === 'dumb' || term === 'linux') {
      return false;
    }

    // Most modern terminals support mouse input
    // Check for xterm-compatible terminals
    if (term?.includes('xterm') || term?.includes('screen') || term?.includes('tmux')) {
      return true;
    }

    // Check for modern terminal emulators
    const termProgram = process.env['TERM_PROGRAM'];
    if (termProgram) {
      return true;
    }

    // Windows Terminal
    if (process.env['WT_SESSION']) {
      return true;
    }

    return true; // Default to assuming mouse support
  }

  /**
   * Detect clipboard support (OSC 52)
   */
  private detectClipboard(): boolean {
    const setting = this.config.clipboard;
    if (setting === 'enabled') return true;
    if (setting === 'disabled') return false;

    // Check for terminals known to support OSC 52
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();
    const osc52Terminals = [
      'iterm.app',
      'kitty',
      'alacritty',
      'wezterm',
      'mintty',
      'contour',
    ];
    if (termProgram && osc52Terminals.includes(termProgram)) {
      return true;
    }

    // Check for KITTY_WINDOW_ID
    if (process.env['KITTY_WINDOW_ID']) {
      return true;
    }

    // tmux can forward OSC 52
    const term = process.env['TERM'];
    if (term?.startsWith('tmux') || process.env['TMUX']) {
      return true;
    }

    // SSH sessions may not have clipboard access
    if (process.env['SSH_CLIENT'] || process.env['SSH_TTY']) {
      return false;
    }

    return false;
  }

  /**
   * Get the terminal program name
   */
  private getTerminalName(): string | null {
    return (
      process.env['TERM_PROGRAM'] ||
      process.env['LC_TERMINAL'] ||
      null
    );
  }

  /**
   * Get the terminal version
   */
  private getTerminalVersion(): string | null {
    return (
      process.env['TERM_PROGRAM_VERSION'] ||
      process.env['KONSOLE_VERSION'] ||
      process.env['XTERM_VERSION'] ||
      null
    );
  }

  /**
   * Check if any graphics protocol is supported
   */
  hasGraphicsSupport(): boolean {
    const caps = this.detect();
    return caps.kittyGraphics || caps.iTermImages || caps.sixel;
  }

  /**
   * Get the best available graphics protocol
   */
  getBestGraphicsProtocol(): 'kitty' | 'iterm' | 'sixel' | null {
    const caps = this.detect();
    // Prefer Kitty > iTerm > Sixel (based on capabilities)
    if (caps.kittyGraphics) return 'kitty';
    if (caps.iTermImages) return 'iterm';
    if (caps.sixel) return 'sixel';
    return null;
  }
}

/**
 * Global capabilities detector instance
 */
let globalDetector: TerminalCapabilitiesDetector | null = null;

/**
 * Get the global capabilities detector instance
 */
export function getCapabilitiesDetector(
  options?: CapabilityDetectorOptions
): TerminalCapabilitiesDetector {
  if (!globalDetector || options) {
    globalDetector = new TerminalCapabilitiesDetector(options);
  }
  return globalDetector;
}

/**
 * Detect terminal capabilities (convenience function)
 */
export function detectCapabilities(
  options?: CapabilityDetectorOptions
): TerminalCapabilities {
  return getCapabilitiesDetector(options).detect();
}

/**
 * Check if terminal supports any graphics protocol
 */
export function hasGraphicsSupport(options?: CapabilityDetectorOptions): boolean {
  return getCapabilitiesDetector(options).hasGraphicsSupport();
}

/**
 * Get the best available graphics protocol
 */
export function getBestGraphicsProtocol(
  options?: CapabilityDetectorOptions
): 'kitty' | 'iterm' | 'sixel' | null {
  return getCapabilitiesDetector(options).getBestGraphicsProtocol();
}

/**
 * Reset the global capabilities detector (useful for testing)
 */
export function resetCapabilitiesDetector(): void {
  globalDetector = null;
}

/**
 * Capability flags export for convenience
 */
export const Capabilities = {
  detect: detectCapabilities,
  hasGraphics: hasGraphicsSupport,
  getBestGraphics: getBestGraphicsProtocol,
  reset: resetCapabilitiesDetector,
};
