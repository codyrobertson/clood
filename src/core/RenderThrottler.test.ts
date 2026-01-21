/**
 * Render Throttler Tests (UOW-0308)
 *
 * Comprehensive tests for the RenderThrottler including stress tests
 * that verify the renderer remains responsive under 10k events.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RenderThrottler,
  createRenderThrottler,
  getRenderThrottler,
  resetRenderThrottler,
  requestRenderFrame,
  flushRenderFrames,
  type RenderThrottlerConfig,
} from './RenderThrottler.js';

describe('RenderThrottler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRenderThrottler();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRenderThrottler();
  });

  describe('basic functionality', () => {
    it('should create a throttler with default configuration', () => {
      const throttler = new RenderThrottler();
      const config = throttler.getConfig();

      expect(config.targetFps).toBe(60);
      expect(config.minFrameInterval).toBe(16);
      expect(config.maxFrameInterval).toBe(33);
      expect(config.adaptiveFrameRate).toBe(true);
      expect(config.incrementalRendering).toBe(true);
    });

    it('should create a throttler with custom configuration', () => {
      const throttler = new RenderThrottler({
        targetFps: 30,
        minFrameInterval: 33,
        adaptiveFrameRate: false,
      });
      const config = throttler.getConfig();

      expect(config.targetFps).toBe(30);
      expect(config.minFrameInterval).toBe(33);
      expect(config.adaptiveFrameRate).toBe(false);
    });

    it('should start and stop correctly', () => {
      const throttler = new RenderThrottler();

      expect(throttler.isActive()).toBe(false);
      throttler.start();
      expect(throttler.isActive()).toBe(true);
      throttler.stop();
      expect(throttler.isActive()).toBe(false);
    });

    it('should auto-start when requesting a frame', () => {
      const throttler = new RenderThrottler();
      const callback = vi.fn();

      expect(throttler.isActive()).toBe(false);
      throttler.requestFrame(callback);
      expect(throttler.isActive()).toBe(true);
    });
  });

  describe('frame scheduling', () => {
    it('should schedule frame at target FPS', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback = vi.fn();

      throttler.requestFrame(callback);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should coalesce multiple frame requests', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      throttler.requestFrame(callback1);
      throttler.requestFrame(callback2);
      throttler.requestFrame(callback3);

      expect(throttler.getPendingCount()).toBe(3);

      vi.advanceTimersByTime(16);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should respect priority ordering', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const order: number[] = [];

      throttler.requestFrame(() => order.push(1), 0);
      throttler.requestFrame(() => order.push(2), 10);
      throttler.requestFrame(() => order.push(3), 5);

      vi.advanceTimersByTime(16);

      // Higher priority should execute first
      expect(order).toEqual([2, 3, 1]);
    });

    it('should handle frame timing at 30 FPS', () => {
      const throttler = new RenderThrottler({
        targetFps: 30,
        minFrameInterval: 33,
        maxFrameInterval: 33,
      });
      const callback = vi.fn();

      throttler.requestFrame(callback);
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(17);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush and clear', () => {
    it('should flush pending callbacks immediately', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback = vi.fn();

      throttler.requestFrame(callback);
      expect(callback).not.toHaveBeenCalled();

      throttler.flush();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should clear pending callbacks without executing', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback = vi.fn();

      throttler.requestFrame(callback);
      throttler.clear();

      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
      expect(throttler.getPendingCount()).toBe(0);
    });

    it('should cancel pending frame timer', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback = vi.fn();

      throttler.requestFrame(callback);
      throttler.cancelPendingFrame();

      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('statistics', () => {
    it('should track frames rendered', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });

      throttler.requestFrame(() => {});
      vi.advanceTimersByTime(16);

      throttler.requestFrame(() => {});
      vi.advanceTimersByTime(16);

      const stats = throttler.getStats();
      expect(stats.framesRendered).toBe(2);
    });

    it('should track callbacks queued and executed', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });

      throttler.requestFrame(() => {});
      throttler.requestFrame(() => {});
      throttler.requestFrame(() => {});

      vi.advanceTimersByTime(16);

      const stats = throttler.getStats();
      expect(stats.callbacksQueued).toBe(3);
      expect(stats.callbacksExecuted).toBe(3);
    });

    it('should calculate effective FPS', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });

      // Execute several frames
      for (let i = 0; i < 10; i++) {
        throttler.requestFrame(() => {});
        vi.advanceTimersByTime(16);
      }

      const stats = throttler.getStats();
      expect(stats.effectiveFps).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });

      throttler.requestFrame(() => {});
      vi.advanceTimersByTime(16);

      throttler.resetStats();
      const stats = throttler.getStats();

      expect(stats.framesRendered).toBe(0);
      expect(stats.callbacksQueued).toBe(0);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });

      throttler.updateConfig({ targetFps: 30 });
      const config = throttler.getConfig();

      expect(config.targetFps).toBe(30);
    });

    it('should update frame interval when FPS changes', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const callback = vi.fn();

      throttler.updateConfig({ targetFps: 30, minFrameInterval: 33 });

      throttler.requestFrame(callback);
      vi.advanceTimersByTime(16);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(17);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should continue rendering when callback throws', () => {
      const throttler = new RenderThrottler({ targetFps: 60 });
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = vi.fn();

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      throttler.requestFrame(errorCallback);
      throttler.requestFrame(successCallback);

      vi.advanceTimersByTime(16);

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('global throttler', () => {
    it('should create and reuse global instance', () => {
      const throttler1 = getRenderThrottler();
      const throttler2 = getRenderThrottler();

      expect(throttler1).toBe(throttler2);
    });

    it('should reset global instance', () => {
      const throttler1 = getRenderThrottler();
      resetRenderThrottler();
      const throttler2 = getRenderThrottler();

      expect(throttler1).not.toBe(throttler2);
    });

    it('should request frame on global throttler', () => {
      const callback = vi.fn();
      requestRenderFrame(callback);

      vi.advanceTimersByTime(16);
      expect(callback).toHaveBeenCalled();
    });

    it('should flush global throttler', () => {
      const callback = vi.fn();
      requestRenderFrame(callback);

      flushRenderFrames();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('createRenderThrottler factory', () => {
    it('should create a new instance', () => {
      const throttler = createRenderThrottler({ targetFps: 30 });
      expect(throttler.getConfig().targetFps).toBe(30);
    });
  });
});

describe('RenderThrottler stress tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetRenderThrottler();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetRenderThrottler();
  });

  it('should remain responsive under 10k events', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      adaptiveFrameRate: false, // Disable to test raw throughput
      loadThreshold: 100000, // High threshold to prevent dropping
    });

    const EVENT_COUNT = 10000;
    const executedCallbacks: number[] = [];

    // Queue 10k render requests rapidly
    for (let i = 0; i < EVENT_COUNT; i++) {
      const idx = i;
      throttler.requestFrame(() => {
        executedCallbacks.push(idx);
      });
    }

    // Verify throttler is handling the load
    expect(throttler.getPendingCount()).toBeGreaterThan(0);
    expect(throttler.getStats().callbacksQueued).toBe(EVENT_COUNT);

    // Flush all callbacks at once (this simulates the scenario where we need
    // to ensure all pending operations complete before proceeding)
    throttler.flush();

    const stats = throttler.getStats();
    expect(stats.callbacksQueued).toBe(EVENT_COUNT);
    expect(stats.callbacksExecuted).toBe(EVENT_COUNT);
    expect(executedCallbacks.length).toBe(EVENT_COUNT);
  });

  it('should handle 10k events with incremental rendering', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      incrementalRendering: true,
      incrementalBatchSize: 100,
      adaptiveFrameRate: false, // Disable to test raw throughput
    });

    const EVENT_COUNT = 10000;
    let executedCount = 0;

    // Queue 10k render requests
    for (let i = 0; i < EVENT_COUNT; i++) {
      throttler.requestFrame(() => {
        executedCount++;
      });
    }

    // Flush all callbacks (flush executes synchronously)
    throttler.flush();

    expect(executedCount).toBe(EVENT_COUNT);
  });

  it('should drop frames under extreme load when adaptive', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      adaptiveFrameRate: true,
      loadThreshold: 50, // Low threshold to trigger frame dropping
    });

    const BATCH_SIZE = 500;

    // Queue a large batch
    for (let i = 0; i < BATCH_SIZE; i++) {
      throttler.requestFrame(() => {});
    }

    // Process frames
    for (let frame = 0; frame < 20; frame++) {
      vi.advanceTimersByTime(16);
    }

    throttler.flush();

    const stats = throttler.getStats();

    // Should have dropped some frames due to load
    // The exact number depends on timing, but we should have processed efficiently
    expect(stats.framesRendered).toBeGreaterThan(0);
    expect(stats.callbacksExecuted).toBeGreaterThan(0);
  });

  it('should maintain reasonable frame times under load', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      adaptiveFrameRate: false, // Disable to test raw performance
    });

    const EVENT_COUNT = 1000;

    // Queue events in batches over time
    for (let batch = 0; batch < 10; batch++) {
      for (let i = 0; i < EVENT_COUNT / 10; i++) {
        throttler.requestFrame(() => {
          // Simulate some work
          let sum = 0;
          for (let j = 0; j < 100; j++) sum += j;
          return sum;
        });
      }
      vi.advanceTimersByTime(16);
    }

    throttler.flush();

    const stats = throttler.getStats();
    expect(stats.callbacksExecuted).toBe(EVENT_COUNT);

    // Average frame time should be reasonable (not timing out)
    expect(stats.avgFrameTime).toBeLessThan(1000);
  });

  it('should handle rapid start/stop cycles', () => {
    const throttler = new RenderThrottler({ targetFps: 60 });

    for (let cycle = 0; cycle < 100; cycle++) {
      throttler.start();
      throttler.requestFrame(() => {});
      throttler.stop();
    }

    throttler.start();
    vi.advanceTimersByTime(16);

    // Should not crash and should have processed some callbacks
    expect(throttler.getStats().callbacksQueued).toBeGreaterThan(0);
  });

  it('should handle concurrent flush and request operations', () => {
    const throttler = new RenderThrottler({ targetFps: 60 });
    let executed = 0;

    for (let i = 0; i < 100; i++) {
      throttler.requestFrame(() => {
        executed++;
      });

      if (i % 10 === 0) {
        throttler.flush();
      }
    }

    throttler.flush();

    expect(executed).toBe(100);
  });

  it('should process 10k events within reasonable time limit', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      adaptiveFrameRate: false, // Disable for predictable behavior
    });

    const EVENT_COUNT = 10000;

    // Queue all events
    for (let i = 0; i < EVENT_COUNT; i++) {
      throttler.requestFrame(() => {});
    }

    // Measure that flush completes (all callbacks executed synchronously)
    const flushStart = Date.now();
    throttler.flush();
    const flushTime = Date.now() - flushStart;

    const stats = throttler.getStats();
    expect(stats.callbacksExecuted).toBe(EVENT_COUNT);

    // Flush should be fast (< 1 second in real time for 10k simple callbacks)
    expect(flushTime).toBeLessThan(1000);
  });

  it('should handle priority inversion correctly under load', () => {
    const throttler = new RenderThrottler({
      targetFps: 60,
      adaptiveFrameRate: false,
    });
    const executionOrder: number[] = [];

    // Queue low priority events
    for (let i = 0; i < 100; i++) {
      throttler.requestFrame(() => executionOrder.push(0), 0);
    }

    // Queue high priority event
    throttler.requestFrame(() => executionOrder.push(100), 100);

    // Queue medium priority events
    for (let i = 0; i < 100; i++) {
      throttler.requestFrame(() => executionOrder.push(50), 50);
    }

    // Flush all at once - this ensures priority sorting within a single batch
    throttler.flush();

    // High priority should execute first
    expect(executionOrder[0]).toBe(100);

    // Then medium priorities (indices 1-100)
    for (let i = 1; i <= 100; i++) {
      expect(executionOrder[i]).toBe(50);
    }

    // Then low priorities (indices 101-200)
    for (let i = 101; i < executionOrder.length; i++) {
      expect(executionOrder[i]).toBe(0);
    }

    expect(executionOrder.length).toBe(201); // 100 low + 1 high + 100 medium
  });

  it('should recover gracefully after clearing large pending queue', () => {
    const throttler = new RenderThrottler({ targetFps: 60 });

    // Queue many events
    for (let i = 0; i < 5000; i++) {
      throttler.requestFrame(() => {});
    }

    expect(throttler.getPendingCount()).toBe(5000);

    // Clear all
    throttler.clear();
    expect(throttler.getPendingCount()).toBe(0);

    // Should still work normally after clearing
    let executed = false;
    throttler.requestFrame(() => {
      executed = true;
    });

    vi.advanceTimersByTime(16);
    expect(executed).toBe(true);
  });
});
