/**
 * Theme Detector (UOW-1111)
 *
 * Detects terminal background color to determine if dark or light theme
 * should be used. Uses multiple detection strategies with fallbacks.
 *
 * Detection order:
 * 1. Explicit configuration override
 * 2. COLORFGBG environment variable
 * 3. TERM_BACKGROUND environment variable
 * 4. Terminal emulator-specific variables
 * 5. OSC query (if supported)
 * 6. Fallback heuristics based on TERM/terminal type
 */

import { ThemeMode } from './ConfigSchema.js';

/**
 * Detected theme result
 */
export interface ThemeDetectionResult {
  /** Whether the terminal has a dark background */
  isDark: boolean;
  /** The detection method that was used */
  method: ThemeDetectionMethod;
  /** Confidence level of the detection (0-1) */
  confidence: number;
  /** Additional details about the detection */
  details?: string;
}

/**
 * Methods used for theme detection
 */
export type ThemeDetectionMethod =
  | 'explicit'
  | 'colorfgbg'
  | 'term_background'
  | 'terminal_specific'
  | 'osc_query'
  | 'heuristic'
  | 'default';

/**
 * Options for theme detection
 */
export interface ThemeDetectorOptions {
  /** Forced theme mode (bypasses detection) */
  forceMode?: 'dark' | 'light';
  /** Enable OSC query (may cause issues in some terminals) */
  enableOscQuery?: boolean;
  /** Timeout for OSC query in milliseconds */
  oscQueryTimeout?: number;
}

/**
 * Known dark terminal profiles/programs
 */
const DARK_TERMINALS = new Set([
  'hyper',
  'terminus',
  'alacritty',
  'kitty',
  'wezterm',
  'contour',
]);

/**
 * Known light terminal profiles
 */
const LIGHT_TERMINALS = new Set([
  'apple_terminal_light',
  'terminal_light',
]);

/**
 * Theme Detector class
 */
export class ThemeDetector {
  private options: ThemeDetectorOptions;
  private cachedResult: ThemeDetectionResult | null = null;

  constructor(options: ThemeDetectorOptions = {}) {
    this.options = {
      enableOscQuery: false,
      oscQueryTimeout: 100,
      ...options,
    };
  }

  /**
   * Detect the terminal theme (dark or light)
   */
  detect(): ThemeDetectionResult {
    // Return cached result if available
    if (this.cachedResult) {
      return this.cachedResult;
    }

    // Check for explicit force mode
    if (this.options.forceMode) {
      this.cachedResult = {
        isDark: this.options.forceMode === 'dark',
        method: 'explicit',
        confidence: 1.0,
        details: `Forced to ${this.options.forceMode} mode`,
      };
      return this.cachedResult;
    }

    // Try detection methods in order
    const result =
      this.detectFromColorFgBg() ||
      this.detectFromTermBackground() ||
      this.detectFromTerminalSpecific() ||
      this.detectFromHeuristics() ||
      this.getDefault();

    this.cachedResult = result;
    return result;
  }

  /**
   * Clear cached detection result
   */
  clearCache(): void {
    this.cachedResult = null;
  }

  /**
   * Check if the terminal has a dark background
   */
  isDark(): boolean {
    return this.detect().isDark;
  }

  /**
   * Check if the terminal has a light background
   */
  isLight(): boolean {
    return !this.detect().isDark;
  }

  /**
   * Get the recommended theme mode based on detection
   */
  getThemeMode(): ThemeMode {
    return this.detect().isDark ? 'dark' : 'light';
  }

  /**
   * Detect from COLORFGBG environment variable
   *
   * Format: "fg;bg" or "fg;bg;bg2"
   * Common values: "15;0" (white on black = dark), "0;15" (black on white = light)
   */
  private detectFromColorFgBg(): ThemeDetectionResult | null {
    const colorFgBg = process.env['COLORFGBG'];
    if (!colorFgBg) {
      return null;
    }

    const parts = colorFgBg.split(';');
    if (parts.length < 2) {
      return null;
    }

    const bg = parseInt(parts[1]!, 10);
    if (isNaN(bg)) {
      return null;
    }

    // Background color indices:
    // 0 = black (dark)
    // 7 = white (light)
    // 8 = bright black (dark gray, considered dark)
    // 15 = bright white (light)
    const isDark = bg < 7 || bg === 8;

    return {
      isDark,
      method: 'colorfgbg',
      confidence: 0.9,
      details: `COLORFGBG=${colorFgBg}, bg=${bg}`,
    };
  }

  /**
   * Detect from TERM_BACKGROUND environment variable
   *
   * Custom environment variable that some terminals or users set
   */
  private detectFromTermBackground(): ThemeDetectionResult | null {
    const termBg = process.env['TERM_BACKGROUND'];
    if (!termBg) {
      return null;
    }

    const normalized = termBg.toLowerCase().trim();

    if (normalized === 'dark' || normalized === 'black') {
      return {
        isDark: true,
        method: 'term_background',
        confidence: 1.0,
        details: `TERM_BACKGROUND=${termBg}`,
      };
    }

    if (normalized === 'light' || normalized === 'white') {
      return {
        isDark: false,
        method: 'term_background',
        confidence: 1.0,
        details: `TERM_BACKGROUND=${termBg}`,
      };
    }

    return null;
  }

  /**
   * Detect from terminal-specific environment variables
   */
  private detectFromTerminalSpecific(): ThemeDetectionResult | null {
    // iTerm2
    const itermProfile = process.env['ITERM_PROFILE'];
    if (itermProfile) {
      const lowerProfile = itermProfile.toLowerCase();
      if (lowerProfile.includes('light')) {
        return {
          isDark: false,
          method: 'terminal_specific',
          confidence: 0.8,
          details: `ITERM_PROFILE=${itermProfile} (contains 'light')`,
        };
      }
      if (lowerProfile.includes('dark')) {
        return {
          isDark: true,
          method: 'terminal_specific',
          confidence: 0.8,
          details: `ITERM_PROFILE=${itermProfile} (contains 'dark')`,
        };
      }
    }

    // macOS Terminal.app
    const termProgram = process.env['TERM_PROGRAM'];
    if (termProgram === 'Apple_Terminal') {
      // Apple Terminal defaults to light theme
      return {
        isDark: false,
        method: 'terminal_specific',
        confidence: 0.6,
        details: 'Apple Terminal detected (defaults to light)',
      };
    }

    // VS Code integrated terminal
    const vscodeTerminal = process.env['VSCODE_TERMINAL'];
    if (vscodeTerminal || process.env['TERM_PROGRAM'] === 'vscode') {
      // VS Code integrated terminal - check for color theme hints
      const vscodeTheme = process.env['VSCODE_THEME_KIND'];
      if (vscodeTheme) {
        const isDark = vscodeTheme.toLowerCase().includes('dark');
        return {
          isDark,
          method: 'terminal_specific',
          confidence: 0.9,
          details: `VS Code terminal with theme: ${vscodeTheme}`,
        };
      }
      // Default to dark for VS Code (most common)
      return {
        isDark: true,
        method: 'terminal_specific',
        confidence: 0.5,
        details: 'VS Code terminal (defaulting to dark)',
      };
    }

    // Windows Terminal
    const wtSession = process.env['WT_SESSION'];
    if (wtSession) {
      // Windows Terminal - assume dark (most common theme)
      return {
        isDark: true,
        method: 'terminal_specific',
        confidence: 0.5,
        details: 'Windows Terminal detected (defaulting to dark)',
      };
    }

    // Konsole
    const konsoleProfile = process.env['KONSOLE_PROFILE_NAME'];
    if (konsoleProfile) {
      const lowerProfile = konsoleProfile.toLowerCase();
      if (lowerProfile.includes('light')) {
        return {
          isDark: false,
          method: 'terminal_specific',
          confidence: 0.8,
          details: `Konsole profile: ${konsoleProfile}`,
        };
      }
      if (lowerProfile.includes('dark') || lowerProfile.includes('breeze')) {
        return {
          isDark: true,
          method: 'terminal_specific',
          confidence: 0.7,
          details: `Konsole profile: ${konsoleProfile}`,
        };
      }
    }

    // GNOME Terminal
    const gnomeTermProfile = process.env['GNOME_TERMINAL_SCREEN'];
    if (gnomeTermProfile) {
      // GNOME Terminal defaults to dark in modern versions
      return {
        isDark: true,
        method: 'terminal_specific',
        confidence: 0.5,
        details: 'GNOME Terminal detected (defaulting to dark)',
      };
    }

    return null;
  }

  /**
   * Detect using heuristics based on TERM and other indicators
   */
  private detectFromHeuristics(): ThemeDetectionResult | null {
    const term = process.env['TERM'];
    const termProgram = process.env['TERM_PROGRAM']?.toLowerCase();

    // Check for known dark terminals
    if (termProgram && DARK_TERMINALS.has(termProgram)) {
      return {
        isDark: true,
        method: 'heuristic',
        confidence: 0.6,
        details: `Known dark terminal: ${termProgram}`,
      };
    }

    // Check for known light terminals
    if (termProgram && LIGHT_TERMINALS.has(termProgram)) {
      return {
        isDark: false,
        method: 'heuristic',
        confidence: 0.6,
        details: `Known light terminal: ${termProgram}`,
      };
    }

    // xterm-256color typically used with dark themes
    if (term === 'xterm-256color' || term === 'screen-256color') {
      return {
        isDark: true,
        method: 'heuristic',
        confidence: 0.4,
        details: `TERM=${term} (typically dark)`,
      };
    }

    // linux console is typically black background
    if (term === 'linux') {
      return {
        isDark: true,
        method: 'heuristic',
        confidence: 0.7,
        details: 'Linux console (dark)',
      };
    }

    // Check COLORTERM for true color support (often dark themes)
    const colorterm = process.env['COLORTERM'];
    if (colorterm === 'truecolor' || colorterm === '24bit') {
      return {
        isDark: true,
        method: 'heuristic',
        confidence: 0.4,
        details: `COLORTERM=${colorterm} (modern terminal, likely dark)`,
      };
    }

    return null;
  }

  /**
   * Get default detection result
   */
  private getDefault(): ThemeDetectionResult {
    // Default to dark theme as it's more common in modern terminals
    return {
      isDark: true,
      method: 'default',
      confidence: 0.3,
      details: 'No detection method succeeded, defaulting to dark',
    };
  }
}

/**
 * Global theme detector instance
 */
let globalDetector: ThemeDetector | null = null;

/**
 * Get the global theme detector instance
 */
export function getThemeDetector(options?: ThemeDetectorOptions): ThemeDetector {
  if (!globalDetector || options) {
    globalDetector = new ThemeDetector(options);
  }
  return globalDetector;
}

/**
 * Detect terminal theme (convenience function)
 */
export function detectTheme(options?: ThemeDetectorOptions): ThemeDetectionResult {
  return getThemeDetector(options).detect();
}

/**
 * Check if terminal has dark background (convenience function)
 */
export function isDarkTerminal(options?: ThemeDetectorOptions): boolean {
  return getThemeDetector(options).isDark();
}

/**
 * Check if terminal has light background (convenience function)
 */
export function isLightTerminal(options?: ThemeDetectorOptions): boolean {
  return getThemeDetector(options).isLight();
}

/**
 * Get recommended theme mode (convenience function)
 */
export function getRecommendedThemeMode(options?: ThemeDetectorOptions): ThemeMode {
  return getThemeDetector(options).getThemeMode();
}

/**
 * Reset the global theme detector (useful for testing)
 */
export function resetThemeDetector(): void {
  globalDetector = null;
}
