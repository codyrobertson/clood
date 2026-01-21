/**
 * Render Batch Tests (UOW-0306)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  UpdateBatcher,
  CallbackBatcher,
  composeUpdates,
  transaction,
  unstable_batchedUpdates,
  isBatchingUpdates,
} from './RenderBatch.js';

describe('UpdateBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch updates within maxWait', () => {
    const batcher = new UpdateBatcher<{ count: number }>({ maxWait: 16 });
    const onFlush = vi.fn();
    batcher.onFlush(onFlush);

    batcher.queue((s) => ({ count: s.count + 1 }));
    batcher.queue((s) => ({ count: s.count + 1 }));
    batcher.queue((s) => ({ count: s.count + 1 }));

    expect(onFlush).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);
    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(expect.any(Array));
    expect(onFlush.mock.calls[0][0]).toHaveLength(3);
  });

  it('should flush immediately when max batch size reached', () => {
    const batcher = new UpdateBatcher<number>({ maxBatchSize: 3 });
    const onFlush = vi.fn();
    batcher.onFlush(onFlush);

    batcher.queue((n) => n + 1);
    batcher.queue((n) => n + 1);
    expect(onFlush).not.toHaveBeenCalled();

    batcher.queue((n) => n + 1);
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  it('should queue partial values', () => {
    const batcher = new UpdateBatcher<{ a: number; b: number }>();
    const onFlush = vi.fn();
    batcher.onFlush(onFlush);

    batcher.queueValue({ a: 1 });
    batcher.queueValue({ b: 2 });

    batcher.flush();
    expect(onFlush).toHaveBeenCalled();
  });

  it('should cancel pending updates', () => {
    const batcher = new UpdateBatcher<number>({ maxWait: 100 });
    const onFlush = vi.fn();
    batcher.onFlush(onFlush);

    batcher.queue((n) => n + 1);
    batcher.cancel();

    vi.advanceTimersByTime(200);
    expect(onFlush).not.toHaveBeenCalled();
  });

  it('should track pending state', () => {
    const batcher = new UpdateBatcher<number>();

    expect(batcher.isPending()).toBe(false);
    expect(batcher.getPendingCount()).toBe(0);

    batcher.queue((n) => n + 1);
    expect(batcher.isPending()).toBe(true);
    expect(batcher.getPendingCount()).toBe(1);

    batcher.flush();
    expect(batcher.isPending()).toBe(false);
  });

  it('should track statistics', () => {
    const batcher = new UpdateBatcher<number>({ maxWait: 10 });

    batcher.queue((n) => n + 1);
    batcher.queue((n) => n + 1);
    batcher.flush();

    batcher.queue((n) => n + 1);
    batcher.flush();

    const stats = batcher.getStats();
    expect(stats.totalBatches).toBe(2);
    expect(stats.totalUpdates).toBe(3);
    expect(stats.averageBatchSize).toBe(1.5);
    expect(stats.maxBatchSize).toBe(2);
  });

  it('should reset statistics', () => {
    const batcher = new UpdateBatcher<number>();

    batcher.queue((n) => n + 1);
    batcher.flush();
    batcher.resetStats();

    const stats = batcher.getStats();
    expect(stats.totalBatches).toBe(0);
    expect(stats.totalUpdates).toBe(0);
  });
});

describe('composeUpdates', () => {
  it('should compose multiple updates', () => {
    const updates = [
      (s: { count: number }) => ({ count: s.count + 1 }),
      (s: { count: number }) => ({ count: s.count * 2 }),
      (s: { count: number }) => ({ count: s.count + 10 }),
    ];

    const composed = composeUpdates(updates);
    const result = composed({ count: 5 });

    // (5 + 1) * 2 + 10 = 22
    expect(result.count).toBe(22);
  });

  it('should handle empty updates array', () => {
    const composed = composeUpdates<{ val: number }>([]);
    const result = composed({ val: 42 });
    expect(result.val).toBe(42);
  });
});

describe('CallbackBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch callbacks with delay', () => {
    const batcher = new CallbackBatcher(16);
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    batcher.schedule(cb1);
    batcher.schedule(cb2);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(16);
    expect(cb1).toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  it('should flush immediately', () => {
    const batcher = new CallbackBatcher(100);
    const cb = vi.fn();

    batcher.schedule(cb);
    batcher.flush();

    expect(cb).toHaveBeenCalled();
  });

  it('should cancel pending callbacks', () => {
    const batcher = new CallbackBatcher(100);
    const cb = vi.fn();

    batcher.schedule(cb);
    batcher.cancel();

    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });
});

describe('transaction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch updates in transaction', () => {
    const batcher = new UpdateBatcher<{ count: number }>();
    const onFlush = vi.fn();
    batcher.onFlush(onFlush);

    transaction(batcher, (queue) => {
      queue((s) => ({ count: s.count + 1 }));
      queue((s) => ({ count: s.count + 1 }));
      queue((s) => ({ count: s.count + 1 }));
    });

    // Should have queued single composed update
    expect(batcher.getPendingCount()).toBe(1);

    batcher.flush();
    expect(onFlush).toHaveBeenCalledWith(expect.any(Array));
    expect(onFlush.mock.calls[0][0]).toHaveLength(1);
  });

  it('should handle empty transaction', () => {
    const batcher = new UpdateBatcher<number>();

    transaction(batcher, () => {
      // No updates
    });

    expect(batcher.isPending()).toBe(false);
  });
});

describe('unstable_batchedUpdates', () => {
  it('should batch updates', () => {
    const updates: number[] = [];

    unstable_batchedUpdates(() => {
      updates.push(1);
      unstable_batchedUpdates(() => {
        updates.push(2); // This is queued and runs after outer callback completes
      });
      updates.push(3);
    });

    // Nested batched updates are queued and run after outer callback
    expect(updates).toEqual([1, 3, 2]);
  });

  it('should report batching state', () => {
    expect(isBatchingUpdates()).toBe(false);

    unstable_batchedUpdates(() => {
      expect(isBatchingUpdates()).toBe(true);
    });

    expect(isBatchingUpdates()).toBe(false);
  });
});
