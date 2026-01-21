/**
 * Configuration Loader (UOW-1101, UOW-1102, UOW-1103)
 *
 * Loads and merges configuration from multiple sources with precedence:
 * 1. User config (~/.config/clood/config.json)
 * 2. Project config (.clood/config.json)
 * 3. Local config (CLI arguments / environment)
 *
 * Later sources override earlier ones.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  Config,
  ConfigSchema,
  defaultConfig,
  mergeConfig,
} from './ConfigSchema.js';

/** Configuration file names to search for */
const CONFIG_FILE_NAMES = ['config.json', 'clood.json', '.cloodrc.json'];

/** User config directory name */
const USER_CONFIG_DIR = '.config/clood';

/** Project config directory name */
const PROJECT_CONFIG_DIR = '.clood';

/** Environment variable for config path override */
const CONFIG_PATH_ENV = 'CLOOD_CONFIG';

/** Environment variable for user config directory override */
const USER_CONFIG_DIR_ENV = 'CLOOD_USER_CONFIG_DIR';

/**
 * Result of loading a configuration file
 */
export interface ConfigLoadResult {
  /** The loaded configuration (or null if not found/invalid) */
  config: Partial<Config> | null;
  /** The path where the config was loaded from */
  path: string | null;
  /** Any error that occurred during loading */
  error?: Error;
}

/**
 * Options for the ConfigLoader
 */
export interface ConfigLoaderOptions {
  /** Override user config directory */
  userConfigDir?: string;
  /** Override project directory */
  projectDir?: string;
  /** Skip loading user config */
  skipUserConfig?: boolean;
  /** Skip loading project config */
  skipProjectConfig?: boolean;
  /** Configuration path override (bypasses search) */
  configPath?: string;
}

/**
 * Configuration Loader
 *
 * Handles loading, validating, and merging configuration files
 * from multiple sources.
 */
export class ConfigLoader {
  private userConfigDir: string;
  private projectDir: string;
  private options: ConfigLoaderOptions;

  constructor(options: ConfigLoaderOptions = {}) {
    this.options = options;
    this.userConfigDir =
      options.userConfigDir ||
      process.env[USER_CONFIG_DIR_ENV] ||
      path.join(os.homedir(), USER_CONFIG_DIR);
    this.projectDir = options.projectDir || process.cwd();
  }

  /**
   * Load and merge all configurations
   */
  async load(): Promise<Config> {
    const configs: Partial<Config>[] = [];

    // Check for explicit config path override
    const explicitPath = this.options.configPath || process.env[CONFIG_PATH_ENV];
    if (explicitPath) {
      const result = await this.loadFromPath(explicitPath);
      if (result.config) {
        return mergeConfig(result.config);
      }
      // If explicit path fails, still fall back to defaults
      console.warn(`Failed to load config from ${explicitPath}, using defaults`);
      return defaultConfig;
    }

    // Load user config (lowest precedence)
    if (!this.options.skipUserConfig) {
      const userResult = await this.loadUserConfig();
      if (userResult.config) {
        configs.push(userResult.config);
      }
    }

    // Load project config (middle precedence)
    if (!this.options.skipProjectConfig) {
      const projectResult = await this.loadProjectConfig();
      if (projectResult.config) {
        configs.push(projectResult.config);
      }
    }

    // Merge all configs with defaults
    return this.mergeAll(configs);
  }

  /**
   * Load user configuration from ~/.config/clood
   */
  async loadUserConfig(): Promise<ConfigLoadResult> {
    return this.findAndLoadConfig(this.userConfigDir);
  }

  /**
   * Load project configuration from .clood directory
   */
  async loadProjectConfig(): Promise<ConfigLoadResult> {
    const projectConfigDir = path.join(this.projectDir, PROJECT_CONFIG_DIR);
    return this.findAndLoadConfig(projectConfigDir);
  }

  /**
   * Load configuration from a specific path
   */
  async loadFromPath(configPath: string): Promise<ConfigLoadResult> {
    try {
      const absolutePath = path.resolve(configPath);

      // Check if path exists
      if (!fs.existsSync(absolutePath)) {
        return {
          config: null,
          path: absolutePath,
          error: new Error(`Configuration file not found: ${absolutePath}`),
        };
      }

      // Check if it's a directory
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        return this.findAndLoadConfig(absolutePath);
      }

      // Load the file
      return this.loadConfigFile(absolutePath);
    } catch (error) {
      return {
        config: null,
        path: configPath,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Find and load a config file from a directory
   */
  private async findAndLoadConfig(directory: string): Promise<ConfigLoadResult> {
    try {
      if (!fs.existsSync(directory)) {
        return { config: null, path: null };
      }

      // Search for config files in order of preference
      for (const fileName of CONFIG_FILE_NAMES) {
        const filePath = path.join(directory, fileName);
        if (fs.existsSync(filePath)) {
          return this.loadConfigFile(filePath);
        }
      }

      return { config: null, path: null };
    } catch (error) {
      return {
        config: null,
        path: directory,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Load and validate a configuration file
   */
  private async loadConfigFile(filePath: string): Promise<ConfigLoadResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate against schema
      const result = ConfigSchema.safeParse(parsed);

      if (result.success) {
        return {
          config: result.data,
          path: filePath,
        };
      }

      // Return partial config with validation error
      return {
        config: null,
        path: filePath,
        error: new Error(`Invalid configuration: ${formatZodErrors(result.error)}`),
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          config: null,
          path: filePath,
          error: new Error(`Invalid JSON in config file: ${error.message}`),
        };
      }
      return {
        config: null,
        path: filePath,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Merge multiple partial configs with defaults
   */
  private mergeAll(configs: Partial<Config>[]): Config {
    if (configs.length === 0) {
      return defaultConfig;
    }

    // Merge configs in order (later ones override earlier)
    let merged: Partial<Config> = {};
    for (const config of configs) {
      merged = deepMerge(merged, config);
    }

    return mergeConfig(merged);
  }

  /**
   * Get the user config directory path
   */
  getUserConfigDir(): string {
    return this.userConfigDir;
  }

  /**
   * Get the project config directory path
   */
  getProjectConfigDir(): string {
    return path.join(this.projectDir, PROJECT_CONFIG_DIR);
  }

  /**
   * Check if user config exists
   */
  hasUserConfig(): boolean {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(this.userConfigDir, fileName);
      if (fs.existsSync(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if project config exists
   */
  hasProjectConfig(): boolean {
    const projectConfigDir = path.join(this.projectDir, PROJECT_CONFIG_DIR);
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(projectConfigDir, fileName);
      if (fs.existsSync(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Write configuration to user config directory
   */
  async writeUserConfig(config: Partial<Config>): Promise<void> {
    const configDir = this.userConfigDir;
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, CONFIG_FILE_NAMES[0]!);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  /**
   * Write configuration to project config directory
   */
  async writeProjectConfig(config: Partial<Config>): Promise<void> {
    const configDir = path.join(this.projectDir, PROJECT_CONFIG_DIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, CONFIG_FILE_NAMES[0]!);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as T;

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== undefined &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as object,
        sourceValue as object
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Format Zod validation errors into a readable string
 */
function formatZodErrors(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/**
 * Create a config loader and load configuration
 */
export async function loadConfig(options?: ConfigLoaderOptions): Promise<Config> {
  const loader = new ConfigLoader(options);
  return loader.load();
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return defaultConfig;
}

// Re-export config types for convenience
export type { Config };
export { defaultConfig, mergeConfig } from './ConfigSchema.js';
