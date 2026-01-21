/**
 * Hook Registry (UOW-0901)
 *
 * Manages lifecycle hooks for extensibility.
 */

export type HookName =
  | 'beforeRender'
  | 'afterRender'
  | 'onEvent'
  | 'onError'
  | 'onMount'
  | 'onUnmount'
  | 'onFocus'
  | 'onBlur'
  | 'onKeyPress'
  | 'onResize'
  | 'beforeStateChange'
  | 'afterStateChange'
  | 'onDocumentOpen'
  | 'onDocumentClose'
  | 'onTaskStart'
  | 'onTaskComplete'
  | 'onTaskError'
  | 'onNotification';

export type HookCallback<T = unknown> = (context: T) => void | Promise<void>;
export type HookFilter<T = unknown> = (context: T) => boolean;

export interface HookRegistration<T = unknown> {
  id: string;
  name: HookName;
  callback: HookCallback<T>;
  priority: number;
  filter?: HookFilter<T>;
  once?: boolean;
  enabled: boolean;
}

export interface HookContext {
  hookName: HookName;
  timestamp: number;
  [key: string]: unknown;
}

export interface HookResult {
  hookName: HookName;
  executedCount: number;
  errors: HookError[];
  duration: number;
}

export interface HookError {
  hookId: string;
  error: Error;
}

export interface HookRegistryOptions {
  /** Enable async hook execution (default: true) */
  async?: boolean;
  /** Continue on error (default: true) */
  continueOnError?: boolean;
  /** Maximum hook execution time in ms (default: 5000) */
  timeout?: number;
}

let hookIdCounter = 0;

function generateHookId(): string {
  return `hook-${++hookIdCounter}`;
}

export class HookRegistry {
  private hooks: Map<HookName, HookRegistration[]> = new Map();
  private options: Required<HookRegistryOptions>;
  private executionLog: Array<{ name: HookName; timestamp: number; duration: number }> = [];

  constructor(options: HookRegistryOptions = {}) {
    this.options = {
      async: options.async ?? true,
      continueOnError: options.continueOnError ?? true,
      timeout: options.timeout ?? 5000,
    };
  }

  /**
   * Register a hook
   */
  register<T = unknown>(
    name: HookName,
    callback: HookCallback<T>,
    options: {
      priority?: number;
      filter?: HookFilter<T>;
      once?: boolean;
      id?: string;
    } = {}
  ): string {
    const id = options.id || generateHookId();
    const registration: HookRegistration<T> = {
      id,
      name,
      callback: callback as HookCallback<unknown>,
      priority: options.priority ?? 0,
      filter: options.filter as HookFilter<unknown> | undefined,
      once: options.once ?? false,
      enabled: true,
    };

    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    const hooks = this.hooks.get(name)!;
    hooks.push(registration as HookRegistration);

    // Sort by priority (higher first)
    hooks.sort((a, b) => b.priority - a.priority);

    return id;
  }

  /**
   * Register a hook that only fires once
   */
  once<T = unknown>(
    name: HookName,
    callback: HookCallback<T>,
    options: { priority?: number; filter?: HookFilter<T> } = {}
  ): string {
    return this.register(name, callback, { ...options, once: true });
  }

  /**
   * Unregister a hook by ID
   */
  unregister(id: string): boolean {
    for (const [_name, hooks] of this.hooks) {
      const index = hooks.findIndex((h) => h.id === id);
      if (index !== -1) {
        hooks.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Unregister all hooks for a name
   */
  unregisterAll(name: HookName): number {
    const hooks = this.hooks.get(name);
    if (!hooks) return 0;

    const count = hooks.length;
    this.hooks.set(name, []);
    return count;
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(id: string, enabled: boolean): boolean {
    for (const hooks of this.hooks.values()) {
      const hook = hooks.find((h) => h.id === id);
      if (hook) {
        hook.enabled = enabled;
        return true;
      }
    }
    return false;
  }

  /**
   * Execute all hooks for a name
   */
  async execute<T extends HookContext>(name: HookName, context: T): Promise<HookResult> {
    const startTime = Date.now();
    const hooks = this.hooks.get(name) || [];
    const errors: HookError[] = [];
    let executedCount = 0;
    const toRemove: string[] = [];

    for (const hook of hooks) {
      if (!hook.enabled) continue;

      // Apply filter
      if (hook.filter && !hook.filter(context)) continue;

      try {
        if (this.options.async) {
          await Promise.race([
            hook.callback(context),
            this.createTimeout(hook.id),
          ]);
        } else {
          hook.callback(context);
        }
        executedCount++;

        // Mark for removal if once
        if (hook.once) {
          toRemove.push(hook.id);
        }
      } catch (error) {
        errors.push({
          hookId: hook.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        if (!this.options.continueOnError) {
          break;
        }
      }
    }

    // Remove once hooks
    for (const id of toRemove) {
      this.unregister(id);
    }

    const duration = Date.now() - startTime;
    this.executionLog.push({ name, timestamp: startTime, duration });

    // Keep log bounded
    if (this.executionLog.length > 1000) {
      this.executionLog.shift();
    }

    return {
      hookName: name,
      executedCount,
      errors,
      duration,
    };
  }

  /**
   * Execute hooks synchronously
   */
  executeSync<T extends HookContext>(name: HookName, context: T): HookResult {
    const startTime = Date.now();
    const hooks = this.hooks.get(name) || [];
    const errors: HookError[] = [];
    let executedCount = 0;
    const toRemove: string[] = [];

    for (const hook of hooks) {
      if (!hook.enabled) continue;
      if (hook.filter && !hook.filter(context)) continue;

      try {
        hook.callback(context);
        executedCount++;

        if (hook.once) {
          toRemove.push(hook.id);
        }
      } catch (error) {
        errors.push({
          hookId: hook.id,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        if (!this.options.continueOnError) {
          break;
        }
      }
    }

    for (const id of toRemove) {
      this.unregister(id);
    }

    return {
      hookName: name,
      executedCount,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get registered hooks for a name
   */
  getHooks(name: HookName): HookRegistration[] {
    return [...(this.hooks.get(name) || [])];
  }

  /**
   * Get all hook names with registrations
   */
  getRegisteredNames(): HookName[] {
    return Array.from(this.hooks.keys()).filter((name) => this.hooks.get(name)!.length > 0);
  }

  /**
   * Get hook by ID
   */
  getHook(id: string): HookRegistration | undefined {
    for (const hooks of this.hooks.values()) {
      const hook = hooks.find((h) => h.id === id);
      if (hook) return hook;
    }
    return undefined;
  }

  /**
   * Get total hook count
   */
  getHookCount(): number {
    let count = 0;
    for (const hooks of this.hooks.values()) {
      count += hooks.length;
    }
    return count;
  }

  /**
   * Get execution statistics
   */
  getStats(): { totalExecutions: number; averageDuration: number; byHook: Record<string, number> } {
    const byHook: Record<string, number> = {};
    let totalDuration = 0;

    for (const entry of this.executionLog) {
      byHook[entry.name] = (byHook[entry.name] || 0) + 1;
      totalDuration += entry.duration;
    }

    return {
      totalExecutions: this.executionLog.length,
      averageDuration: this.executionLog.length > 0 ? totalDuration / this.executionLog.length : 0,
      byHook,
    };
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.executionLog = [];
  }

  private createTimeout(hookId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Hook ${hookId} timed out after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }
}

// Global registry instance
let globalRegistry: HookRegistry | null = null;

export function getHookRegistry(): HookRegistry {
  if (!globalRegistry) {
    globalRegistry = new HookRegistry();
  }
  return globalRegistry;
}

export function resetHookRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}
