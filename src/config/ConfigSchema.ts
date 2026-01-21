/**
 * Configuration Schema (UOW-1101, UOW-1102, UOW-1103, UOW-1111, UOW-1121)
 *
 * Defines the application configuration structure including
 * themes, keybindings, terminal capabilities, and general settings.
 */

import { z } from 'zod';

// Color schema
export const ColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.enum([
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'gray', 'grey', 'blackBright', 'redBright', 'greenBright', 'yellowBright',
  'blueBright', 'magentaBright', 'cyanBright', 'whiteBright',
]));

// Theme schema (UOW-1102)
export const ThemeSchema = z.object({
  name: z.string(),
  colors: z.object({
    // Primary colors
    primary: ColorSchema.optional(),
    secondary: ColorSchema.optional(),
    accent: ColorSchema.optional(),

    // Background/foreground
    background: ColorSchema.optional(),
    foreground: ColorSchema.optional(),

    // UI elements
    border: ColorSchema.optional(),
    borderFocused: ColorSchema.optional(),
    selection: ColorSchema.optional(),
    cursor: ColorSchema.optional(),

    // Status colors
    success: ColorSchema.optional(),
    warning: ColorSchema.optional(),
    error: ColorSchema.optional(),
    info: ColorSchema.optional(),

    // Text colors
    heading: ColorSchema.optional(),
    link: ColorSchema.optional(),
    code: ColorSchema.optional(),
    codeBackground: ColorSchema.optional(),
    comment: ColorSchema.optional(),

    // Component-specific
    headerBackground: ColorSchema.optional(),
    headerForeground: ColorSchema.optional(),
    sidebarBackground: ColorSchema.optional(),
    statusBarBackground: ColorSchema.optional(),
    statusBarForeground: ColorSchema.optional(),
  }).optional(),
  styles: z.object({
    borderStyle: z.enum(['none', 'single', 'double', 'round', 'bold', 'classic']).optional(),
    focusBorderStyle: z.enum(['single', 'double', 'bold']).optional(),
  }).optional(),
});

// Keybinding schema (UOW-1103)
export const KeybindingSchema = z.object({
  key: z.string(),
  ctrl: z.boolean().optional(),
  alt: z.boolean().optional(),
  shift: z.boolean().optional(),
  meta: z.boolean().optional(),
  action: z.string(),
  when: z.string().optional(), // Context expression
  args: z.unknown().optional(),
});

// Keybindings configuration
export const KeybindingsConfigSchema = z.object({
  bindings: z.array(KeybindingSchema),
  defaults: z.boolean().optional().default(true),
});

// Panel configuration
export const PanelConfigSchema = z.object({
  visible: z.boolean().optional(),
  width: z.number().optional(),
  widthPercent: z.number().min(10).max(50).optional(),
  position: z.enum(['left', 'right']).optional(),
  collapsible: z.boolean().optional(),
});

// Display configuration
export const DisplayConfigSchema = z.object({
  // Layout
  showHeader: z.boolean().optional().default(true),
  showStatusBar: z.boolean().optional().default(true),
  showTasksPanel: z.boolean().optional().default(true),
  showNotifications: z.boolean().optional().default(true),
  tasksPanel: PanelConfigSchema.optional(),

  // Rendering
  fps: z.number().min(1).max(120).optional().default(60),
  scrollSpeed: z.number().min(1).max(10).optional().default(3),
  animationsEnabled: z.boolean().optional().default(true),
  wordWrap: z.boolean().optional().default(true),

  // Markdown
  markdownEnabled: z.boolean().optional().default(true),
  syntaxHighlighting: z.boolean().optional().default(true),
  codeLineNumbers: z.boolean().optional().default(false),

  // Accessibility
  highContrast: z.boolean().optional().default(false),
  reducedMotion: z.boolean().optional().default(false),
});

// Behavior configuration
export const BehaviorConfigSchema = z.object({
  // Input
  confirmQuit: z.boolean().optional().default(true),
  focusTrap: z.boolean().optional().default(true),

  // Events
  bufferSize: z.number().min(10).max(10000).optional().default(1000),
  dropPolicy: z.enum(['oldest', 'newest']).optional().default('oldest'),

  // Notifications
  notificationDuration: z.number().min(1000).max(30000).optional().default(5000),
  maxNotifications: z.number().min(1).max(20).optional().default(5),

  // Debug
  debug: z.boolean().optional().default(false),
  verbose: z.boolean().optional().default(false),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).optional().default('info'),
});

// File paths configuration
export const PathsConfigSchema = z.object({
  sessionLog: z.string().optional(),
  outputLog: z.string().optional(),
  configDir: z.string().optional(),
  cacheDir: z.string().optional(),
});

// Performance configuration (UOW-0307)
export const PerformanceConfigSchema = z.object({
  // Frame rate settings
  maxFrameRate: z.number().min(15).max(120).optional().default(60),
  minFrameRate: z.number().min(10).max(60).optional().default(30),

  // Rendering optimization
  incrementalRendering: z.boolean().optional().default(true),
  incrementalBatchSize: z.number().min(10).max(500).optional().default(100),

  // Adaptive performance
  adaptiveFrameRate: z.boolean().optional().default(true),
  loadThreshold: z.number().min(10).max(1000).optional().default(100),

  // Event batching
  eventBatchSize: z.number().min(10).max(10000).optional().default(1000),
  eventCoalescing: z.boolean().optional().default(true),

  // Memory management
  maxEventBufferSize: z.number().min(100).max(100000).optional().default(10000),
  gcInterval: z.number().min(1000).max(60000).optional().default(5000),
});

// Theme mode configuration (UOW-1111)
export const ThemeModeSchema = z.enum(['auto', 'dark', 'light']);

// Terminal capabilities configuration (UOW-1121)
export const TerminalCapabilitiesConfigSchema = z.object({
  // Graphics protocols
  kittyGraphics: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),
  iTermImages: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),
  sixel: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),

  // Color support
  trueColor: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),
  color256: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),

  // Unicode support
  unicode: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),

  // Mouse support
  mouse: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),

  // Clipboard support
  clipboard: z.enum(['auto', 'enabled', 'disabled']).optional().default('auto'),
});

// Theme detection configuration (UOW-1111)
export const ThemeDetectionConfigSchema = z.object({
  mode: ThemeModeSchema.optional().default('auto'),

  // Dark theme to use when dark mode is detected
  darkTheme: z.string().optional(),

  // Light theme to use when light mode is detected
  lightTheme: z.string().optional(),

  // Force specific background detection result
  forceBackground: z.enum(['dark', 'light']).optional(),
});

// Main configuration schema
export const ConfigSchema = z.object({
  version: z.string().optional(),
  theme: ThemeSchema.optional(),
  themeDetection: ThemeDetectionConfigSchema.optional(),
  keybindings: KeybindingsConfigSchema.optional(),
  display: DisplayConfigSchema.optional(),
  behavior: BehaviorConfigSchema.optional(),
  paths: PathsConfigSchema.optional(),
  terminal: TerminalCapabilitiesConfigSchema.optional(),
  performance: PerformanceConfigSchema.optional(),
});

// TypeScript types
export type Color = z.infer<typeof ColorSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type ThemeMode = z.infer<typeof ThemeModeSchema>;
export type Keybinding = z.infer<typeof KeybindingSchema>;
export type KeybindingsConfig = z.infer<typeof KeybindingsConfigSchema>;
export type PanelConfig = z.infer<typeof PanelConfigSchema>;
export type DisplayConfig = z.infer<typeof DisplayConfigSchema>;
export type BehaviorConfig = z.infer<typeof BehaviorConfigSchema>;
export type PathsConfig = z.infer<typeof PathsConfigSchema>;
export type TerminalCapabilitiesConfig = z.infer<typeof TerminalCapabilitiesConfigSchema>;
export type ThemeDetectionConfig = z.infer<typeof ThemeDetectionConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;

// Default theme
export const defaultTheme: Theme = {
  name: 'default',
  colors: {
    primary: 'cyan',
    secondary: 'blue',
    accent: 'magenta',
    border: 'gray',
    borderFocused: 'cyan',
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    heading: 'cyan',
    link: 'blue',
    code: 'yellow',
  },
  styles: {
    borderStyle: 'round',
    focusBorderStyle: 'bold',
  },
};

// Default keybindings
export const defaultKeybindings: Keybinding[] = [
  { key: 'q', ctrl: true, action: 'quit' },
  { key: '?', action: 'showHelp' },
  { key: 'escape', action: 'escape' },
  { key: 'tab', action: 'focusNext' },
  { key: 'tab', shift: true, action: 'focusPrev' },
  { key: 'j', action: 'scrollDown', when: 'inScrollablePanel' },
  { key: 'k', action: 'scrollUp', when: 'inScrollablePanel' },
  { key: 'g', action: 'scrollTop', when: 'inScrollablePanel' },
  { key: 'G', shift: true, action: 'scrollBottom', when: 'inScrollablePanel' },
  { key: 't', action: 'toggleTasksPanel' },
  { key: 'd', action: 'toggleDebug' },
  { key: 'enter', action: 'select', when: 'hasFocus' },
  { key: 'space', action: 'toggle', when: 'hasFocus' },
];

// Default terminal capabilities
export const defaultTerminalCapabilities: TerminalCapabilitiesConfig = {
  kittyGraphics: 'auto',
  iTermImages: 'auto',
  sixel: 'auto',
  trueColor: 'auto',
  color256: 'auto',
  unicode: 'auto',
  mouse: 'auto',
  clipboard: 'auto',
};

// Default theme detection
export const defaultThemeDetection: ThemeDetectionConfig = {
  mode: 'auto',
};

// Default performance configuration (UOW-0307)
export const defaultPerformanceConfig: PerformanceConfig = {
  maxFrameRate: 60,
  minFrameRate: 30,
  incrementalRendering: true,
  incrementalBatchSize: 100,
  adaptiveFrameRate: true,
  loadThreshold: 100,
  eventBatchSize: 1000,
  eventCoalescing: true,
  maxEventBufferSize: 10000,
  gcInterval: 5000,
};

// Default configuration
export const defaultConfig: Config = {
  version: '1.0',
  theme: defaultTheme,
  themeDetection: defaultThemeDetection,
  keybindings: {
    bindings: defaultKeybindings,
    defaults: true,
  },
  display: {
    showHeader: true,
    showStatusBar: true,
    showTasksPanel: true,
    showNotifications: true,
    fps: 60,
    scrollSpeed: 3,
    animationsEnabled: true,
    wordWrap: true,
    markdownEnabled: true,
    syntaxHighlighting: true,
    codeLineNumbers: false,
    highContrast: false,
    reducedMotion: false,
  },
  behavior: {
    confirmQuit: true,
    focusTrap: true,
    bufferSize: 1000,
    dropPolicy: 'oldest',
    notificationDuration: 5000,
    maxNotifications: 5,
    debug: false,
    verbose: false,
    logLevel: 'info',
  },
  terminal: defaultTerminalCapabilities,
  performance: defaultPerformanceConfig,
};

/**
 * Validate configuration
 */
export function validateConfig(input: unknown): Config | null {
  const result = ConfigSchema.safeParse(input);
  return result.success ? result.data : null;
}

/**
 * Merge configuration with defaults
 */
export function mergeConfig(partial: Partial<Config>): Config {
  return {
    ...defaultConfig,
    ...partial,
    theme: partial.theme ? { ...defaultTheme, ...partial.theme } : defaultConfig.theme,
    themeDetection: partial.themeDetection
      ? { ...defaultThemeDetection, ...partial.themeDetection }
      : defaultConfig.themeDetection,
    display: partial.display ? { ...defaultConfig.display, ...partial.display } : defaultConfig.display,
    behavior: partial.behavior ? { ...defaultConfig.behavior, ...partial.behavior } : defaultConfig.behavior,
    keybindings: partial.keybindings
      ? {
          bindings: partial.keybindings.defaults !== false
            ? [...defaultKeybindings, ...(partial.keybindings.bindings || [])]
            : partial.keybindings.bindings || [],
          defaults: partial.keybindings.defaults,
        }
      : defaultConfig.keybindings,
    terminal: partial.terminal
      ? { ...defaultTerminalCapabilities, ...partial.terminal }
      : defaultConfig.terminal,
    performance: partial.performance
      ? { ...defaultPerformanceConfig, ...partial.performance }
      : defaultConfig.performance,
  };
}

/**
 * Get a keybinding for an action
 */
export function getKeybindingForAction(config: Config, action: string): Keybinding | undefined {
  return config.keybindings?.bindings.find((b) => b.action === action);
}

/**
 * Match a key event to a keybinding
 */
export function matchKeybinding(
  config: Config,
  key: string,
  modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean; meta?: boolean }
): Keybinding | undefined {
  return config.keybindings?.bindings.find(
    (b) =>
      b.key.toLowerCase() === key.toLowerCase() &&
      !!b.ctrl === !!modifiers.ctrl &&
      !!b.alt === !!modifiers.alt &&
      !!b.shift === !!modifiers.shift &&
      !!b.meta === !!modifiers.meta
  );
}
