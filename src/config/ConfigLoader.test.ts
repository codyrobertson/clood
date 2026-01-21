/**
 * Configuration Loader Tests (UOW-1101, UOW-1102, UOW-1103)
 *
 * Tests for ConfigLoader, ThemeDetector, and TerminalCapabilities.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigLoader, loadConfig, getDefaultConfig } from './ConfigLoader.js';
import {
  defaultConfig,
  validateConfig,
  mergeConfig,
  ConfigSchema,
} from './ConfigSchema.js';
import {
  ThemeDetector,
  detectTheme,
  isDarkTerminal,
  resetThemeDetector,
} from './ThemeDetector.js';
import {
  TerminalCapabilitiesDetector,
  detectCapabilities,
  hasGraphicsSupport,
  getBestGraphicsProtocol,
  resetCapabilitiesDetector,
} from './TerminalCapabilities.js';

// Mock fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('ConfigLoader', () => {
  const mockFs = vi.mocked(fs);
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = path.join(os.tmpdir(), 'clood-config-test-' + Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a ConfigLoader with default options', () => {
      const loader = new ConfigLoader();
      expect(loader).toBeDefined();
    });

    it('should accept custom options', () => {
      const loader = new ConfigLoader({
        userConfigDir: '/custom/user/config',
        projectDir: '/custom/project',
      });
      expect(loader.getUserConfigDir()).toBe('/custom/user/config');
    });
  });

  describe('load', () => {
    it('should return default config when no config files exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader({
        skipUserConfig: false,
        skipProjectConfig: false,
      });
      const config = await loader.load();

      expect(config).toBeDefined();
      expect(config.version).toBe(defaultConfig.version);
    });

    it('should load and merge user config', async () => {
      const userConfig = {
        display: {
          fps: 30,
        },
      };

      mockFs.existsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // Need to return true for both the directory and the config file
        return pathStr.includes('.config/clood');
      });
      mockFs.readFileSync.mockReturnValue(JSON.stringify(userConfig));

      const loader = new ConfigLoader({
        skipProjectConfig: true,
      });
      const config = await loader.load();

      expect(config.display?.fps).toBe(30);
    });

    it('should skip user config when option is set', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader({
        skipUserConfig: true,
      });
      const config = await loader.load();

      expect(config).toEqual(defaultConfig);
    });

    it('should skip project config when option is set', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader({
        skipProjectConfig: true,
      });
      const config = await loader.load();

      expect(config).toEqual(defaultConfig);
    });
  });

  describe('loadFromPath', () => {
    it('should load config from a specific file path', async () => {
      const configData = {
        version: '2.0',
        display: {
          fps: 120,
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configData));

      const loader = new ConfigLoader();
      const result = await loader.loadFromPath('/path/to/config.json');

      expect(result.config).toBeDefined();
      expect(result.config?.version).toBe('2.0');
      expect(result.config?.display?.fps).toBe(120);
    });

    it('should return error for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader();
      const result = await loader.loadFromPath('/non/existent/config.json');

      expect(result.config).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not found');
    });

    it('should handle invalid JSON', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ isDirectory: () => false } as fs.Stats);
      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const loader = new ConfigLoader();
      const result = await loader.loadFromPath('/path/to/invalid.json');

      expect(result.config).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid JSON');
    });

    it('should search directory for config files', async () => {
      const configData = { version: '1.5' };

      mockFs.existsSync.mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr === '/config/dir' || pathStr === '/config/dir/config.json';
      });
      mockFs.statSync.mockReturnValue({ isDirectory: () => true } as fs.Stats);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(configData));

      const loader = new ConfigLoader();
      const result = await loader.loadFromPath('/config/dir');

      expect(result.config).toBeDefined();
      expect(result.config?.version).toBe('1.5');
    });
  });

  describe('hasUserConfig and hasProjectConfig', () => {
    it('should detect existing user config', () => {
      mockFs.existsSync.mockImplementation((p) => {
        return String(p).includes('config.json');
      });

      const loader = new ConfigLoader({
        userConfigDir: '/home/user/.config/clood',
      });

      expect(loader.hasUserConfig()).toBe(true);
    });

    it('should return false when no user config exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader();

      expect(loader.hasUserConfig()).toBe(false);
    });

    it('should detect existing project config', () => {
      mockFs.existsSync.mockImplementation((p) => {
        return String(p).includes('.clood/config.json');
      });

      const loader = new ConfigLoader({
        projectDir: '/project',
      });

      expect(loader.hasProjectConfig()).toBe(true);
    });
  });

  describe('writeUserConfig and writeProjectConfig', () => {
    it('should write user config', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader({
        userConfigDir: '/home/user/.config/clood',
      });

      await loader.writeUserConfig({ version: '2.0' });

      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should write project config', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const loader = new ConfigLoader({
        projectDir: '/project',
      });

      await loader.writeProjectConfig({ version: '2.0' });

      expect(mockFs.mkdirSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });
});

describe('ConfigSchema', () => {
  describe('validateConfig', () => {
    it('should validate a valid config', () => {
      const config = {
        version: '1.0',
        display: {
          fps: 60,
          showHeader: true,
        },
      };

      const result = validateConfig(config);
      expect(result).not.toBeNull();
    });

    it('should return null for invalid config', () => {
      const config = {
        display: {
          fps: 'not a number', // Invalid type
        },
      };

      const result = validateConfig(config);
      expect(result).toBeNull();
    });

    it('should validate color values', () => {
      const validColors = ['#ff0000', 'red', 'cyan', 'whiteBright'];

      for (const color of validColors) {
        const config = {
          theme: {
            name: 'test',
            colors: {
              primary: color,
            },
          },
        };

        const result = ConfigSchema.safeParse(config);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid color values', () => {
      const config = {
        theme: {
          name: 'test',
          colors: {
            primary: 'invalid-color',
          },
        },
      };

      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe('mergeConfig', () => {
    it('should merge partial config with defaults', () => {
      const partial = {
        display: {
          fps: 30,
        },
      };

      const merged = mergeConfig(partial);

      expect(merged.display?.fps).toBe(30);
      expect(merged.display?.showHeader).toBe(defaultConfig.display?.showHeader);
      expect(merged.behavior?.confirmQuit).toBe(defaultConfig.behavior?.confirmQuit);
    });

    it('should merge theme config', () => {
      const partial = {
        theme: {
          name: 'custom',
          colors: {
            primary: 'red',
          },
        },
      };

      const merged = mergeConfig(partial);

      expect(merged.theme?.name).toBe('custom');
      expect(merged.theme?.colors?.primary).toBe('red');
    });

    it('should append keybindings to defaults when defaults is true', () => {
      const partial = {
        keybindings: {
          bindings: [{ key: 'x', action: 'customAction' }],
          defaults: true,
        },
      };

      const merged = mergeConfig(partial);

      expect(merged.keybindings?.bindings.length).toBeGreaterThan(1);
      expect(merged.keybindings?.bindings.some((b) => b.action === 'customAction')).toBe(true);
    });

    it('should replace keybindings when defaults is false', () => {
      const partial = {
        keybindings: {
          bindings: [{ key: 'x', action: 'customAction' }],
          defaults: false,
        },
      };

      const merged = mergeConfig(partial);

      expect(merged.keybindings?.bindings.length).toBe(1);
      expect(merged.keybindings?.bindings[0]?.action).toBe('customAction');
    });
  });
});

describe('ThemeDetector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetThemeDetector();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectFromColorFgBg', () => {
    it('should detect dark theme from COLORFGBG=15;0', () => {
      process.env['COLORFGBG'] = '15;0';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(true);
      expect(result.method).toBe('colorfgbg');
    });

    it('should detect light theme from COLORFGBG=0;15', () => {
      process.env['COLORFGBG'] = '0;15';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(false);
      expect(result.method).toBe('colorfgbg');
    });
  });

  describe('detectFromTermBackground', () => {
    it('should detect dark theme from TERM_BACKGROUND=dark', () => {
      process.env['TERM_BACKGROUND'] = 'dark';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(true);
      expect(result.method).toBe('term_background');
    });

    it('should detect light theme from TERM_BACKGROUND=light', () => {
      process.env['TERM_BACKGROUND'] = 'light';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(false);
      expect(result.method).toBe('term_background');
    });
  });

  describe('detectFromTerminalSpecific', () => {
    it('should detect dark theme from iTerm dark profile', () => {
      process.env['ITERM_PROFILE'] = 'Dark Profile';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(true);
      expect(result.method).toBe('terminal_specific');
    });

    it('should detect light theme from Apple Terminal', () => {
      process.env['TERM_PROGRAM'] = 'Apple_Terminal';

      const detector = new ThemeDetector();
      const result = detector.detect();

      expect(result.isDark).toBe(false);
      expect(result.method).toBe('terminal_specific');
    });
  });

  describe('forceMode option', () => {
    it('should force dark mode when specified', () => {
      process.env['TERM_BACKGROUND'] = 'light'; // Would normally detect light

      const detector = new ThemeDetector({ forceMode: 'dark' });
      const result = detector.detect();

      expect(result.isDark).toBe(true);
      expect(result.method).toBe('explicit');
    });

    it('should force light mode when specified', () => {
      process.env['COLORFGBG'] = '15;0'; // Would normally detect dark

      const detector = new ThemeDetector({ forceMode: 'light' });
      const result = detector.detect();

      expect(result.isDark).toBe(false);
      expect(result.method).toBe('explicit');
    });
  });

  describe('convenience functions', () => {
    it('detectTheme should return detection result', () => {
      const result = detectTheme();
      expect(result).toHaveProperty('isDark');
      expect(result).toHaveProperty('method');
      expect(result).toHaveProperty('confidence');
    });

    it('isDarkTerminal should return boolean', () => {
      const result = isDarkTerminal();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('caching', () => {
    it('should cache detection result', () => {
      const detector = new ThemeDetector();

      const result1 = detector.detect();
      process.env['TERM_BACKGROUND'] = 'light'; // Change environment
      const result2 = detector.detect();

      // Should return cached result
      expect(result1).toBe(result2);
    });

    it('should clear cache when clearCache is called', () => {
      process.env['TERM_BACKGROUND'] = 'dark';
      const detector = new ThemeDetector();

      const result1 = detector.detect();
      expect(result1.isDark).toBe(true);

      detector.clearCache();
      process.env['TERM_BACKGROUND'] = 'light';
      const result2 = detector.detect();

      expect(result2.isDark).toBe(false);
    });
  });
});

describe('TerminalCapabilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetCapabilitiesDetector();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('detectKittyGraphics', () => {
    it('should detect Kitty graphics from KITTY_WINDOW_ID', () => {
      process.env['KITTY_WINDOW_ID'] = '123';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(true);
    });

    it('should detect Kitty graphics from TERM_PROGRAM', () => {
      process.env['TERM_PROGRAM'] = 'kitty';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(true);
    });

    it('should detect WezTerm graphics support', () => {
      process.env['WEZTERM_EXECUTABLE'] = '/usr/bin/wezterm';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(true);
      expect(caps.iTermImages).toBe(true);
      expect(caps.sixel).toBe(true);
    });
  });

  describe('detectITermImages', () => {
    it('should detect iTerm images from TERM_PROGRAM', () => {
      process.env['TERM_PROGRAM'] = 'iTerm.app';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.iTermImages).toBe(true);
    });

    it('should detect iTerm images from ITERM_SESSION_ID', () => {
      process.env['ITERM_SESSION_ID'] = 'w0t0p0:123';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.iTermImages).toBe(true);
    });
  });

  describe('detectTrueColor', () => {
    it('should detect true color from COLORTERM=truecolor', () => {
      process.env['COLORTERM'] = 'truecolor';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.trueColor).toBe(true);
    });

    it('should detect true color from Windows Terminal', () => {
      process.env['WT_SESSION'] = 'some-session-id';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.trueColor).toBe(true);
    });
  });

  describe('detectUnicode', () => {
    it('should detect Unicode from UTF-8 locale', () => {
      process.env['LANG'] = 'en_US.UTF-8';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.unicode).toBe(true);
    });

    it('should detect Unicode from LC_ALL', () => {
      process.env['LC_ALL'] = 'C.UTF-8';

      const detector = new TerminalCapabilitiesDetector();
      const caps = detector.detect();

      expect(caps.unicode).toBe(true);
    });
  });

  describe('config overrides', () => {
    it('should respect enabled config override', () => {
      const detector = new TerminalCapabilitiesDetector({
        config: {
          kittyGraphics: 'enabled',
          sixel: 'enabled',
        },
      });

      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(true);
      expect(caps.sixel).toBe(true);
    });

    it('should respect disabled config override', () => {
      process.env['KITTY_WINDOW_ID'] = '123'; // Would normally enable

      const detector = new TerminalCapabilitiesDetector({
        config: {
          kittyGraphics: 'disabled',
        },
      });

      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(false);
    });
  });

  describe('hasGraphicsSupport', () => {
    it('should return true when any graphics protocol is supported', () => {
      process.env['KITTY_WINDOW_ID'] = '123';

      const result = hasGraphicsSupport();

      expect(result).toBe(true);
    });

    it('should return false when no graphics protocol is supported', () => {
      // Clear all graphics-related env vars
      delete process.env['KITTY_WINDOW_ID'];
      delete process.env['TERM_PROGRAM'];
      delete process.env['WEZTERM_EXECUTABLE'];
      delete process.env['ITERM_SESSION_ID'];
      process.env['TERM'] = 'dumb';

      const result = hasGraphicsSupport();

      expect(result).toBe(false);
    });
  });

  describe('getBestGraphicsProtocol', () => {
    it('should return kitty when supported', () => {
      process.env['KITTY_WINDOW_ID'] = '123';
      process.env['ITERM_SESSION_ID'] = 'session';

      resetCapabilitiesDetector();
      const result = getBestGraphicsProtocol();

      expect(result).toBe('kitty');
    });

    it('should return iterm when kitty not supported', () => {
      delete process.env['KITTY_WINDOW_ID'];
      process.env['TERM_PROGRAM'] = 'iTerm.app';

      resetCapabilitiesDetector();
      const result = getBestGraphicsProtocol();

      expect(result).toBe('iterm');
    });

    it('should return null when no graphics supported', () => {
      delete process.env['KITTY_WINDOW_ID'];
      delete process.env['TERM_PROGRAM'];
      delete process.env['WEZTERM_EXECUTABLE'];
      delete process.env['ITERM_SESSION_ID'];
      process.env['TERM'] = 'dumb';

      resetCapabilitiesDetector();
      const result = getBestGraphicsProtocol();

      expect(result).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache capabilities', () => {
      const detector = new TerminalCapabilitiesDetector();

      const caps1 = detector.detect();
      process.env['KITTY_WINDOW_ID'] = '123'; // Change environment
      const caps2 = detector.detect();

      // Should return cached result
      expect(caps1).toBe(caps2);
    });

    it('should clear cache when clearCache is called', () => {
      const detector = new TerminalCapabilitiesDetector();

      detector.detect();
      detector.clearCache();

      process.env['KITTY_WINDOW_ID'] = '123';
      const caps = detector.detect();

      expect(caps.kittyGraphics).toBe(true);
    });
  });
});

describe('loadConfig convenience function', () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
  });

  it('should load default config', async () => {
    const config = await loadConfig();

    expect(config).toBeDefined();
    expect(config.version).toBe(defaultConfig.version);
  });

  it('should accept options', async () => {
    const config = await loadConfig({
      skipUserConfig: true,
      skipProjectConfig: true,
    });

    expect(config).toEqual(defaultConfig);
  });
});

describe('getDefaultConfig', () => {
  it('should return default config', () => {
    const config = getDefaultConfig();

    expect(config).toEqual(defaultConfig);
  });
});
