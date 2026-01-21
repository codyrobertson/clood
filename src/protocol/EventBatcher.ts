/**
 * Event Batcher (UOW-1003)
 *
 * Batches high-frequency events with configurable debounce interval.
 * Flushes on timeout or when batch size is reached.
 */

import { UIEvent, UIEventType } from './UIEvent.js';
import { IEventSink } from './EventSink.js';

/**
 * Event batcher configuration
 */
export interface EventBatcherConfig {
  /** Maximum batch size before auto-flush */
  maxBatchSize: number;

  /** Debounce interval in milliseconds */
  debounceMs: number;

  /** Maximum wait time before force flush (in ms) */
  maxWaitMs: number;

  /** Event types to batch (others are passed through immediately) */
  batchableEventTypes?: UIEventType[];

  /** Whether to merge similar events (e.g., multiple scroll events) */
  mergeSimilarEvents?: boolean;

  /** Custom merge function for events */
  mergeFunction?: (existing: UIEvent, incoming: UIEvent) => UIEvent;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EventBatcherConfig = {
  maxBatchSize: 50,
  debounceMs: 16, // ~60fps
  maxWaitMs: 100,
  batchableEventTypes: ['scroll', 'key_press', 'metrics'],
  mergeSimilarEvents: true,
};

/**
 * Batch state tracking
 */
interface BatchState {
  events: UIEvent[];
  firstEventTime: number;
  debounceTimer: NodeJS.Timeout | null;
  maxWaitTimer: NodeJS.Timeout | null;
}

/**
 * Event Batcher class
 * Batches events and flushes them to a sink
 */
export class EventBatcher {
  private sink: IEventSink;
  private config: EventBatcherConfig;
  private batch: BatchState;
  private paused = false;
  private stats = {
    eventsReceived: 0,
    eventsBatched: 0,
    eventsPassedThrough: 0,
    batchesFlushed: 0,
    eventsMerged: 0,
  };

  constructor(sink: IEventSink, config: Partial<EventBatcherConfig> = {}) {
    this.sink = sink;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.batch = {
      events: [],
      firstEventTime: 0,
      debounceTimer: null,
      maxWaitTimer: null,
    };
  }

  /**
   * Add an event to the batcher
   */
  add(event: UIEvent): void {
    this.stats.eventsReceived++;

    if (this.paused) {
      // When paused, buffer all events
      this.batch.events.push(event);
      return;
    }

    // Check if this event type should be batched
    if (!this.shouldBatch(event)) {
      // Pass through immediately
      this.stats.eventsPassedThrough++;
      this.sink.emit(event);
      return;
    }

    this.stats.eventsBatched++;
    this.addToBatch(event);
  }

  /**
   * Check if an event type should be batched
   */
  private shouldBatch(event: UIEvent): boolean {
    if (!this.config.batchableEventTypes) {
      return true;
    }
    return this.config.batchableEventTypes.includes(event.eventType);
  }

  /**
   * Add event to the current batch
   */
  private addToBatch(event: UIEvent): void {
    // Try to merge with existing event if configured
    if (this.config.mergeSimilarEvents) {
      const merged = this.tryMerge(event);
      if (merged) {
        this.stats.eventsMerged++;
        return;
      }
    }

    // Add to batch
    this.batch.events.push(event);

    // Set first event time
    if (this.batch.events.length === 1) {
      this.batch.firstEventTime = Date.now();
      this.startMaxWaitTimer();
    }

    // Reset debounce timer
    this.resetDebounceTimer();

    // Check if batch is full
    if (this.batch.events.length >= this.config.maxBatchSize) {
      this.flush();
    }
  }

  /**
   * Try to merge with an existing similar event
   */
  private tryMerge(event: UIEvent): boolean {
    // Find a similar event to merge with
    const existingIndex = this.batch.events.findIndex(
      (e) =>
        e.eventType === event.eventType &&
        e.componentId === event.componentId
    );

    if (existingIndex === -1) {
      return false;
    }

    const existing = this.batch.events[existingIndex]!;

    // Use custom merge function if provided
    if (this.config.mergeFunction) {
      this.batch.events[existingIndex] = this.config.mergeFunction(existing, event);
      return true;
    }

    // Default merge: replace with newer event but keep first timestamp
    this.batch.events[existingIndex] = {
      ...event,
      timestamp: existing.timestamp,
    };

    return true;
  }

  /**
   * Start the debounce timer
   */
  private resetDebounceTimer(): void {
    if (this.batch.debounceTimer) {
      clearTimeout(this.batch.debounceTimer);
    }

    this.batch.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.config.debounceMs);
  }

  /**
   * Start the max wait timer
   */
  private startMaxWaitTimer(): void {
    if (this.batch.maxWaitTimer) {
      return; // Already running
    }

    this.batch.maxWaitTimer = setTimeout(() => {
      this.flush();
    }, this.config.maxWaitMs);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.batch.debounceTimer) {
      clearTimeout(this.batch.debounceTimer);
      this.batch.debounceTimer = null;
    }
    if (this.batch.maxWaitTimer) {
      clearTimeout(this.batch.maxWaitTimer);
      this.batch.maxWaitTimer = null;
    }
  }

  /**
   * Flush all batched events
   */
  flush(): void {
    this.clearTimers();

    if (this.batch.events.length === 0) {
      return;
    }

    // Emit all batched events
    this.sink.emitBatch(this.batch.events);
    this.stats.batchesFlushed++;

    // Reset batch state
    this.batch = {
      events: [],
      firstEventTime: 0,
      debounceTimer: null,
      maxWaitTimer: null,
    };
  }

  /**
   * Pause batching - events will be buffered until resume
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume batching and flush any buffered events
   */
  resume(): void {
    this.paused = false;
    this.flush();
  }

  /**
   * Get batcher statistics
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batch.events.length;
  }

  /**
   * Check if batcher is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Destroy the batcher
   */
  destroy(): void {
    this.flush();
    this.clearTimers();
  }
}

/**
 * Debounced event emitter
 * Wraps an event sink and debounces emissions
 */
export class DebouncedEventEmitter {
  private sink: IEventSink;
  private debounceMs: number;
  private pending: Map<string, { event: UIEvent; timer: NodeJS.Timeout }> = new Map();

  constructor(sink: IEventSink, debounceMs: number = 16) {
    this.sink = sink;
    this.debounceMs = debounceMs;
  }

  /**
   * Emit an event with debouncing by key
   */
  emit(key: string, event: UIEvent): void {
    const existing = this.pending.get(key);

    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(() => {
      this.pending.delete(key);
      this.sink.emit(event);
    }, this.debounceMs);

    this.pending.set(key, { event, timer });
  }

  /**
   * Emit immediately without debouncing
   */
  emitImmediate(event: UIEvent): void {
    this.sink.emit(event);
  }

  /**
   * Flush all pending events
   */
  flush(): void {
    Array.from(this.pending.entries()).forEach(([key, { event, timer }]) => {
      clearTimeout(timer);
      this.sink.emit(event);
      this.pending.delete(key);
    });
  }

  /**
   * Cancel a pending event
   */
  cancel(key: string): void {
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.pending.delete(key);
    }
  }

  /**
   * Cancel all pending events
   */
  cancelAll(): void {
    Array.from(this.pending.values()).forEach(({ timer }) => {
      clearTimeout(timer);
    });
    this.pending.clear();
  }

  /**
   * Get count of pending events
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Destroy the emitter
   */
  destroy(): void {
    this.cancelAll();
  }
}

/**
 * Throttled event emitter
 * Emits at most once per interval
 */
export class ThrottledEventEmitter {
  private sink: IEventSink;
  private intervalMs: number;
  private lastEmit: Map<string, number> = new Map();
  private queued: Map<string, UIEvent> = new Map();

  constructor(sink: IEventSink, intervalMs: number = 16) {
    this.sink = sink;
    this.intervalMs = intervalMs;
  }

  /**
   * Emit an event with throttling by key
   */
  emit(key: string, event: UIEvent): void {
    const now = Date.now();
    const lastTime = this.lastEmit.get(key) ?? 0;

    if (now - lastTime >= this.intervalMs) {
      // Can emit immediately
      this.sink.emit(event);
      this.lastEmit.set(key, now);
      this.queued.delete(key);
    } else {
      // Queue for later
      this.queued.set(key, event);

      // Schedule emission
      const timeToWait = this.intervalMs - (now - lastTime);
      setTimeout(() => {
        const queuedEvent = this.queued.get(key);
        if (queuedEvent) {
          this.sink.emit(queuedEvent);
          this.lastEmit.set(key, Date.now());
          this.queued.delete(key);
        }
      }, timeToWait);
    }
  }

  /**
   * Emit immediately without throttling
   */
  emitImmediate(event: UIEvent): void {
    this.sink.emit(event);
  }

  /**
   * Flush all queued events
   */
  flush(): void {
    Array.from(this.queued.entries()).forEach(([key, event]) => {
      this.sink.emit(event);
      this.lastEmit.set(key, Date.now());
    });
    this.queued.clear();
  }

  /**
   * Get count of queued events
   */
  getQueuedCount(): number {
    return this.queued.size;
  }
}

/**
 * Create an event batcher with default configuration
 */
export function createEventBatcher(
  sink: IEventSink,
  config?: Partial<EventBatcherConfig>
): EventBatcher {
  return new EventBatcher(sink, config);
}
