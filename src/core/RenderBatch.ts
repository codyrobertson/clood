/**
 * Render Batching (UOW-0306)
 *
 * Batches multiple state updates together to minimize re-renders.
 */

export type UpdateFn<T> = (prev: T) => T;
export type BatchCallback = () => void;

export interface BatcherOptions {
  /** Maximum time to wait before flushing batch (ms) */
  maxWait?: number;
  /** Maximum number of updates to batch */
  maxBatchSize?: number;
}

export interface BatchStats {
  totalBatches: number;
  totalUpdates: number;
  averageBatchSize: number;
  maxBatchSize: number;
}

/**
 * Update batcher that collects updates and applies them together
 */
export class UpdateBatcher<T> {
  private pendingUpdates: UpdateFn<T>[] = [];
  private flushCallback: ((updates: UpdateFn<T>[]) => void) | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private options: Required<BatcherOptions>;
  private stats: BatchStats = {
    totalBatches: 0,
    totalUpdates: 0,
    averageBatchSize: 0,
    maxBatchSize: 0,
  };

  constructor(options: BatcherOptions = {}) {
    this.options = {
      maxWait: options.maxWait ?? 16,
      maxBatchSize: options.maxBatchSize ?? 100,
    };
  }

  /**
   * Set the callback to receive batched updates
   */
  onFlush(callback: (updates: UpdateFn<T>[]) => void): void {
    this.flushCallback = callback;
  }

  /**
   * Queue an update for batching
   */
  queue(update: UpdateFn<T>): void {
    this.pendingUpdates.push(update);

    // Flush if we hit max batch size
    if (this.pendingUpdates.length >= this.options.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (this.timerId === null) {
      this.timerId = setTimeout(() => {
        this.timerId = null;
        this.flush();
      }, this.options.maxWait);
    }
  }

  /**
   * Apply a value update
   */
  queueValue(value: Partial<T>): void {
    this.queue((prev) => ({ ...prev, ...value }));
  }

  /**
   * Immediately flush all pending updates
   */
  flush(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.pendingUpdates.length === 0) {
      return;
    }

    const updates = this.pendingUpdates;
    this.pendingUpdates = [];

    // Update stats
    this.stats.totalBatches++;
    this.stats.totalUpdates += updates.length;
    this.stats.averageBatchSize = this.stats.totalUpdates / this.stats.totalBatches;
    if (updates.length > this.stats.maxBatchSize) {
      this.stats.maxBatchSize = updates.length;
    }

    if (this.flushCallback) {
      this.flushCallback(updates);
    }
  }

  /**
   * Cancel any pending updates
   */
  cancel(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.pendingUpdates = [];
  }

  /**
   * Check if updates are pending
   */
  isPending(): boolean {
    return this.pendingUpdates.length > 0;
  }

  /**
   * Get number of pending updates
   */
  getPendingCount(): number {
    return this.pendingUpdates.length;
  }

  /**
   * Get batch statistics
   */
  getStats(): BatchStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalBatches: 0,
      totalUpdates: 0,
      averageBatchSize: 0,
      maxBatchSize: 0,
    };
  }
}

/**
 * Compose multiple update functions into a single update
 */
export function composeUpdates<T>(updates: UpdateFn<T>[]): UpdateFn<T> {
  return (prev: T) => updates.reduce((acc, update) => update(acc), prev);
}

/**
 * Batch callback scheduler - batches callbacks and executes them together
 */
export class CallbackBatcher {
  private callbacks: BatchCallback[] = [];
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private maxWait: number;

  constructor(maxWait: number = 0) {
    this.maxWait = maxWait;
  }

  /**
   * Schedule a callback for batched execution
   */
  schedule(callback: BatchCallback): void {
    this.callbacks.push(callback);

    if (this.timerId === null) {
      if (this.maxWait === 0) {
        // Use microtask for immediate batching
        queueMicrotask(() => this.flush());
      } else {
        this.timerId = setTimeout(() => {
          this.timerId = null;
          this.flush();
        }, this.maxWait);
      }
    }
  }

  /**
   * Execute all batched callbacks
   */
  flush(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    const callbacks = this.callbacks;
    this.callbacks = [];

    for (const callback of callbacks) {
      callback();
    }
  }

  /**
   * Cancel pending callbacks
   */
  cancel(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.callbacks = [];
  }
}

/**
 * Transaction helper - batches updates within a transaction
 */
export function transaction<T>(
  batcher: UpdateBatcher<T>,
  fn: (queue: (update: UpdateFn<T>) => void) => void
): void {
  const updates: UpdateFn<T>[] = [];
  fn((update) => updates.push(update));
  // Queue composed update
  if (updates.length > 0) {
    batcher.queue(composeUpdates(updates));
  }
}

/**
 * React-like batching context
 */
let isBatching = false;
const batchedCallbacks: BatchCallback[] = [];

export function unstable_batchedUpdates(callback: BatchCallback): void {
  if (isBatching) {
    batchedCallbacks.push(callback);
    return;
  }

  isBatching = true;
  try {
    callback();
    // Execute any batched callbacks
    while (batchedCallbacks.length > 0) {
      const cb = batchedCallbacks.shift();
      cb?.();
    }
  } finally {
    isBatching = false;
  }
}

export function isBatchingUpdates(): boolean {
  return isBatching;
}
