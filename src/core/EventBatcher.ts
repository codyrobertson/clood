/**
 * Event Batcher (UOW-0306)
 *
 * Coalesces multiple events into a single state update tick using a microtask queue pattern.
 * This prevents excessive re-renders when multiple events arrive in quick succession.
 */

/**
 * Configuration for the event batcher
 */
export interface EventBatcherConfig {
  /** Maximum events to batch before forcing a flush (default: 1000) */
  maxBatchSize: number;

  /** Enable automatic flushing via microtask (default: true) */
  autoFlush: boolean;

  /** Custom coalescing function for events of the same type */
  coalesceEvents?: <T>(existing: T, incoming: T) => T;

  /** Event types that should bypass batching entirely */
  immediateEventTypes?: string[];

  /** Enable batching statistics tracking (default: true) */
  trackStats?: boolean;
}

/**
 * Batched event with metadata
 */
export interface BatchedEvent<T = unknown> {
  type: string;
  key?: string;
  payload: T;
  timestamp: number;
  coalesced: number;
}

/**
 * Batch statistics
 */
export interface BatchStats {
  /** Total events received */
  eventsReceived: number;

  /** Total events coalesced (merged with existing) */
  eventsCoalesced: number;

  /** Total batches flushed */
  batchesFlushed: number;

  /** Total events delivered */
  eventsDelivered: number;

  /** Average batch size when flushed */
  avgBatchSize: number;

  /** Maximum batch size recorded */
  maxBatchSize: number;

  /** Events bypassed due to immediate flag */
  eventsBypassed: number;
}

/**
 * Event handler callback type
 */
export type BatchFlushHandler<T = unknown> = (events: BatchedEvent<T>[]) => void;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<EventBatcherConfig> = {
  maxBatchSize: 1000,
  autoFlush: true,
  coalesceEvents: undefined as unknown as <T>(existing: T, incoming: T) => T,
  immediateEventTypes: [],
  trackStats: true,
};

/**
 * EventBatcher class
 *
 * Uses a microtask queue pattern to batch events, ensuring that multiple events
 * arriving in the same synchronous execution context are coalesced into a single
 * state update.
 */
export class EventBatcher<T = unknown> {
  private config: Required<EventBatcherConfig>;
  private batch: Map<string, BatchedEvent<T>> = new Map();
  private pendingFlush: boolean = false;
  private handlers: Set<BatchFlushHandler<T>> = new Set();
  private paused: boolean = false;
  private pausedEvents: BatchedEvent<T>[] = [];

  // Statistics tracking
  private stats: BatchStats = {
    eventsReceived: 0,
    eventsCoalesced: 0,
    batchesFlushed: 0,
    eventsDelivered: 0,
    avgBatchSize: 0,
    maxBatchSize: 0,
    eventsBypassed: 0,
  };
  private totalBatchedEvents: number = 0;

  constructor(config: Partial<EventBatcherConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      immediateEventTypes: config.immediateEventTypes ?? [],
    };
  }

  /**
   * Add an event to the batch
   */
  add(type: string, payload: T, key?: string): void {
    if (this.config.trackStats) {
      this.stats.eventsReceived++;
    }

    // Check if this event type should bypass batching
    if (this.config.immediateEventTypes.includes(type)) {
      if (this.config.trackStats) {
        this.stats.eventsBypassed++;
      }
      this.deliverImmediate(type, payload, key);
      return;
    }

    // Generate a unique key for this event (for coalescing)
    const eventKey = key ?? type;

    const now = Date.now();
    const existing = this.batch.get(eventKey);

    if (existing) {
      // Coalesce with existing event
      const coalesced = this.coalescePayloads(existing.payload, payload);
      existing.payload = coalesced;
      existing.coalesced++;

      if (this.config.trackStats) {
        this.stats.eventsCoalesced++;
      }
    } else {
      // Add new event to batch
      this.batch.set(eventKey, {
        type,
        key: eventKey,
        payload,
        timestamp: now,
        coalesced: 0,
      });
    }

    // Check if batch size limit reached
    if (this.batch.size >= this.config.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule microtask flush
    if (this.config.autoFlush && !this.pendingFlush) {
      this.scheduleMicrotaskFlush();
    }
  }

  /**
   * Coalesce two payloads
   */
  private coalescePayloads(existing: T, incoming: T): T {
    if (this.config.coalesceEvents) {
      return this.config.coalesceEvents(existing, incoming);
    }

    // Default coalescing: prefer incoming value
    // For objects, do a shallow merge
    if (
      typeof existing === 'object' &&
      existing !== null &&
      typeof incoming === 'object' &&
      incoming !== null &&
      !Array.isArray(existing) &&
      !Array.isArray(incoming)
    ) {
      return { ...existing, ...incoming };
    }

    // For primitives and arrays, use incoming
    return incoming;
  }

  /**
   * Deliver an event immediately (bypassing batch)
   */
  private deliverImmediate(type: string, payload: T, key?: string): void {
    const event: BatchedEvent<T> = {
      type,
      key,
      payload,
      timestamp: Date.now(),
      coalesced: 0,
    };

    if (this.paused) {
      this.pausedEvents.push(event);
      return;
    }

    for (const handler of this.handlers) {
      try {
        handler([event]);
      } catch (error) {
        console.error('EventBatcher: handler error:', error);
      }
    }

    if (this.config.trackStats) {
      this.stats.eventsDelivered++;
      this.stats.batchesFlushed++;
    }
  }

  /**
   * Schedule a flush using microtask queue
   */
  private scheduleMicrotaskFlush(): void {
    this.pendingFlush = true;

    // Use queueMicrotask for true microtask timing
    // Falls back to process.nextTick in Node.js or Promise.resolve()
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.flushIfPending());
    } else if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
      process.nextTick(() => this.flushIfPending());
    } else {
      Promise.resolve().then(() => this.flushIfPending());
    }
  }

  /**
   * Flush if there's a pending flush scheduled
   */
  private flushIfPending(): void {
    if (this.pendingFlush) {
      this.pendingFlush = false;
      this.flush();
    }
  }

  /**
   * Flush all batched events to handlers
   */
  flush(): void {
    if (this.batch.size === 0) {
      return;
    }

    // Collect events
    const events = Array.from(this.batch.values());
    this.batch.clear();
    this.pendingFlush = false;

    // Track statistics
    if (this.config.trackStats) {
      this.stats.batchesFlushed++;
      this.stats.eventsDelivered += events.length;
      this.totalBatchedEvents += events.length;
      this.stats.avgBatchSize = this.totalBatchedEvents / this.stats.batchesFlushed;
      this.stats.maxBatchSize = Math.max(this.stats.maxBatchSize, events.length);
    }

    // Check if paused
    if (this.paused) {
      this.pausedEvents.push(...events);
      return;
    }

    // Deliver to handlers
    this.deliverToHandlers(events);
  }

  /**
   * Deliver events to all registered handlers
   */
  private deliverToHandlers(events: BatchedEvent<T>[]): void {
    for (const handler of this.handlers) {
      try {
        handler(events);
      } catch (error) {
        console.error('EventBatcher: handler error:', error);
      }
    }
  }

  /**
   * Register a handler for batch flushes
   */
  onFlush(handler: BatchFlushHandler<T>): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Remove a handler
   */
  removeHandler(handler: BatchFlushHandler<T>): void {
    this.handlers.delete(handler);
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }

  /**
   * Pause event delivery (events continue to be batched)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume event delivery and flush any paused events
   */
  resume(): void {
    this.paused = false;

    if (this.pausedEvents.length > 0) {
      const events = this.pausedEvents;
      this.pausedEvents = [];
      this.deliverToHandlers(events);
    }

    // Also flush any pending batch
    this.flush();
  }

  /**
   * Check if batcher is paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current batch size
   */
  getBatchSize(): number {
    return this.batch.size;
  }

  /**
   * Get paused events count
   */
  getPausedCount(): number {
    return this.pausedEvents.length;
  }

  /**
   * Get batch statistics
   */
  getStats(): Readonly<BatchStats> {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      eventsReceived: 0,
      eventsCoalesced: 0,
      batchesFlushed: 0,
      eventsDelivered: 0,
      avgBatchSize: 0,
      maxBatchSize: 0,
      eventsBypassed: 0,
    };
    this.totalBatchedEvents = 0;
  }

  /**
   * Clear all pending events without delivering
   */
  clear(): void {
    this.batch.clear();
    this.pausedEvents = [];
    this.pendingFlush = false;
  }

  /**
   * Destroy the batcher and clean up
   */
  destroy(): void {
    this.flush();
    this.clear();
    this.clearHandlers();
  }
}

/**
 * State update batcher specifically for UI state changes
 */
export class StateUpdateBatcher<S = Record<string, unknown>> {
  private batcher: EventBatcher<Partial<S>>;
  private currentState: S;
  private stateUpdateCallback: ((state: S) => void) | null = null;

  constructor(initialState: S, config?: Partial<EventBatcherConfig>) {
    this.currentState = { ...initialState };
    this.batcher = new EventBatcher<Partial<S>>({
      ...config,
      coalesceEvents: (existing, incoming) => ({ ...existing, ...incoming }),
    });

    // Handle batched updates
    this.batcher.onFlush((events) => {
      // Merge all updates into current state
      let newState = { ...this.currentState };
      for (const event of events) {
        newState = { ...newState, ...event.payload };
      }

      this.currentState = newState;

      if (this.stateUpdateCallback) {
        this.stateUpdateCallback(newState);
      }
    });
  }

  /**
   * Update state (will be batched)
   */
  update(partial: Partial<S>, key?: string): void {
    this.batcher.add('state_update', partial, key);
  }

  /**
   * Set callback for state updates
   */
  onStateUpdate(callback: (state: S) => void): () => void {
    this.stateUpdateCallback = callback;
    return () => {
      this.stateUpdateCallback = null;
    };
  }

  /**
   * Get current state
   */
  getState(): Readonly<S> {
    return { ...this.currentState };
  }

  /**
   * Force flush pending updates
   */
  flush(): void {
    this.batcher.flush();
  }

  /**
   * Get underlying batcher
   */
  getBatcher(): EventBatcher<Partial<S>> {
    return this.batcher;
  }

  /**
   * Destroy the batcher
   */
  destroy(): void {
    this.batcher.destroy();
  }
}

/**
 * Create an event batcher with the given configuration
 */
export function createEventBatcher<T = unknown>(
  config?: Partial<EventBatcherConfig>
): EventBatcher<T> {
  return new EventBatcher<T>(config);
}

/**
 * Create a state update batcher with the given initial state
 */
export function createStateUpdateBatcher<S = Record<string, unknown>>(
  initialState: S,
  config?: Partial<EventBatcherConfig>
): StateUpdateBatcher<S> {
  return new StateUpdateBatcher<S>(initialState, config);
}

/**
 * Global event batcher instance
 */
let globalBatcher: EventBatcher | null = null;

/**
 * Get or create the global event batcher
 */
export function getEventBatcher(config?: Partial<EventBatcherConfig>): EventBatcher {
  if (!globalBatcher) {
    globalBatcher = new EventBatcher(config);
  }
  return globalBatcher;
}

/**
 * Reset the global event batcher
 */
export function resetEventBatcher(): void {
  if (globalBatcher) {
    globalBatcher.destroy();
    globalBatcher = null;
  }
}
