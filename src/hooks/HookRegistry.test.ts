/**
 * Hook Registry Tests (UOW-0901)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookRegistry, getHookRegistry, resetHookRegistry, type HookContext } from './HookRegistry.js';

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('register', () => {
    it('should register a hook', () => {
      const id = registry.register('onMount', () => {});
      expect(id).toBeDefined();
      expect(registry.getHooks('onMount')).toHaveLength(1);
    });

    it('should use custom id', () => {
      const id = registry.register('onMount', () => {}, { id: 'my-hook' });
      expect(id).toBe('my-hook');
    });

    it('should sort by priority', () => {
      registry.register('onMount', () => {}, { priority: 1, id: 'low' });
      registry.register('onMount', () => {}, { priority: 10, id: 'high' });
      registry.register('onMount', () => {}, { priority: 5, id: 'mid' });

      const hooks = registry.getHooks('onMount');
      expect(hooks[0].id).toBe('high');
      expect(hooks[1].id).toBe('mid');
      expect(hooks[2].id).toBe('low');
    });
  });

  describe('once', () => {
    it('should register a once hook', async () => {
      const callback = vi.fn();
      registry.once('onMount', callback);

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      await registry.execute('onMount', context);
      await registry.execute('onMount', context);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('unregister', () => {
    it('should unregister by id', () => {
      const id = registry.register('onMount', () => {});
      expect(registry.unregister(id)).toBe(true);
      expect(registry.getHooks('onMount')).toHaveLength(0);
    });

    it('should return false for non-existent id', () => {
      expect(registry.unregister('non-existent')).toBe(false);
    });
  });

  describe('unregisterAll', () => {
    it('should unregister all hooks for name', () => {
      registry.register('onMount', () => {});
      registry.register('onMount', () => {});
      registry.register('onUnmount', () => {});

      const count = registry.unregisterAll('onMount');
      expect(count).toBe(2);
      expect(registry.getHooks('onMount')).toHaveLength(0);
      expect(registry.getHooks('onUnmount')).toHaveLength(1);
    });
  });

  describe('setEnabled', () => {
    it('should enable/disable hooks', async () => {
      const callback = vi.fn();
      const id = registry.register('onMount', callback);

      registry.setEnabled(id, false);
      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      await registry.execute('onMount', context);
      expect(callback).not.toHaveBeenCalled();

      registry.setEnabled(id, true);
      await registry.execute('onMount', context);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute', () => {
    it('should execute all hooks', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      registry.register('onMount', callback1);
      registry.register('onMount', callback2);

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      const result = await registry.execute('onMount', context);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(result.executedCount).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass context to callbacks', async () => {
      const callback = vi.fn();
      registry.register('onMount', callback);

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now(), custom: 'data' };
      await registry.execute('onMount', context);

      expect(callback).toHaveBeenCalledWith(context);
    });

    it('should apply filter', async () => {
      const callback = vi.fn();
      registry.register('onEvent', callback, {
        filter: (ctx) => (ctx as any).eventType === 'message',
      });

      await registry.execute('onEvent', { hookName: 'onEvent', timestamp: Date.now(), eventType: 'task' });
      expect(callback).not.toHaveBeenCalled();

      await registry.execute('onEvent', { hookName: 'onEvent', timestamp: Date.now(), eventType: 'message' });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle errors with continueOnError', async () => {
      const callback1 = vi.fn(() => { throw new Error('Test error'); });
      const callback2 = vi.fn();

      registry.register('onMount', callback1);
      registry.register('onMount', callback2);

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      const result = await registry.execute('onMount', context);

      expect(callback2).toHaveBeenCalled();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error.message).toBe('Test error');
    });

    it('should stop on error when continueOnError is false', async () => {
      const strictRegistry = new HookRegistry({ continueOnError: false });
      const callback1 = vi.fn(() => { throw new Error('Stop'); });
      const callback2 = vi.fn();

      strictRegistry.register('onMount', callback1, { priority: 10 });
      strictRegistry.register('onMount', callback2, { priority: 5 });

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      await strictRegistry.execute('onMount', context);

      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle async callbacks', async () => {
      let value = 0;
      registry.register('onMount', async () => {
        await new Promise((r) => setTimeout(r, 10));
        value = 1;
      });

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      await registry.execute('onMount', context);

      expect(value).toBe(1);
    });
  });

  describe('executeSync', () => {
    it('should execute synchronously', () => {
      const callback = vi.fn();
      registry.register('onMount', callback);

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      const result = registry.executeSync('onMount', context);

      expect(callback).toHaveBeenCalled();
      expect(result.executedCount).toBe(1);
    });
  });

  describe('getters', () => {
    it('should get registered names', () => {
      registry.register('onMount', () => {});
      registry.register('onUnmount', () => {});

      const names = registry.getRegisteredNames();
      expect(names).toContain('onMount');
      expect(names).toContain('onUnmount');
    });

    it('should get hook by id', () => {
      const id = registry.register('onMount', () => {}, { id: 'test-hook' });
      const hook = registry.getHook(id);
      expect(hook).toBeDefined();
      expect(hook?.id).toBe('test-hook');
    });

    it('should get hook count', () => {
      registry.register('onMount', () => {});
      registry.register('onMount', () => {});
      registry.register('onUnmount', () => {});

      expect(registry.getHookCount()).toBe(3);
    });
  });

  describe('getStats', () => {
    it('should track execution statistics', async () => {
      registry.register('onMount', () => {});
      registry.register('onUnmount', () => {});

      const context: HookContext = { hookName: 'onMount', timestamp: Date.now() };
      await registry.execute('onMount', context);
      await registry.execute('onMount', context);
      await registry.execute('onUnmount', { hookName: 'onUnmount', timestamp: Date.now() });

      const stats = registry.getStats();
      expect(stats.totalExecutions).toBe(3);
      expect(stats.byHook['onMount']).toBe(2);
      expect(stats.byHook['onUnmount']).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all hooks', () => {
      registry.register('onMount', () => {});
      registry.register('onUnmount', () => {});

      registry.clear();

      expect(registry.getHookCount()).toBe(0);
    });
  });

  describe('global registry', () => {
    beforeEach(() => {
      resetHookRegistry();
    });

    it('should provide singleton instance', () => {
      const reg1 = getHookRegistry();
      const reg2 = getHookRegistry();
      expect(reg1).toBe(reg2);
    });

    it('should reset global registry', () => {
      const reg1 = getHookRegistry();
      reg1.register('onMount', () => {});

      resetHookRegistry();
      const reg2 = getHookRegistry();

      expect(reg2.getHookCount()).toBe(0);
    });
  });
});
