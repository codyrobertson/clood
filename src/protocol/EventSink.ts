/**
 * Event Sink (UOW-1002)
 *
 * Provides output channels for UI events with support for:
 * - stdout output (default)
 * - IPC channel (configurable)
 * - JSON serialization
 */

import { UIEvent, serializeUIEvent } from './UIEvent.js';

/**
 * Event sink output modes
 */
export type EventSinkMode = 'stdout' | 'ipc' | 'callback' | 'buffer';

/**
 * Event sink configuration
 */
export interface EventSinkConfig {
  /** Output mode */
  mode: EventSinkMode;

  /** IPC channel path (for 'ipc' mode) */
  ipcPath?: string;

  /** Custom callback (for 'callback' mode) */
  callback?: (event: UIEvent) => void;

  /** Whether to pretty print JSON output */
  prettyPrint?: boolean;

  /** Whether to add newline after each event */
  newlineDelimited?: boolean;

  /** Optional prefix for each output line */
  prefix?: string;

  /** Error handler */
  onError?: (error: Error, event: UIEvent) => void;
}

/**
 * Event sink interface
 */
export interface IEventSink {
  /** Emit a single event */
  emit(event: UIEvent): void;

  /** Emit multiple events */
  emitBatch(events: UIEvent[]): void;

  /** Flush any buffered events */
  flush(): void;

  /** Close the sink and release resources */
  close(): void;

  /** Get sink statistics */
  getStats(): EventSinkStats;
}

/**
 * Event sink statistics
 */
export interface EventSinkStats {
  eventsEmitted: number;
  bytesWritten: number;
  errors: number;
  lastEmitTime: number | null;
}

/**
 * Abstract base class for event sinks
 */
abstract class BaseEventSink implements IEventSink {
  protected stats: EventSinkStats = {
    eventsEmitted: 0,
    bytesWritten: 0,
    errors: 0,
    lastEmitTime: null,
  };

  protected config: EventSinkConfig;
  protected closed = false;

  constructor(config: EventSinkConfig) {
    this.config = {
      newlineDelimited: true,
      prettyPrint: false,
      ...config,
    };
  }

  abstract emit(event: UIEvent): void;

  emitBatch(events: UIEvent[]): void {
    for (const event of events) {
      this.emit(event);
    }
  }

  flush(): void {
    // Default implementation - no-op
  }

  close(): void {
    this.closed = true;
  }

  getStats(): EventSinkStats {
    return { ...this.stats };
  }

  protected serialize(event: UIEvent): string {
    const json = this.config.prettyPrint
      ? JSON.stringify(event, null, 2)
      : serializeUIEvent(event);

    const prefix = this.config.prefix ?? '';
    const suffix = this.config.newlineDelimited ? '\n' : '';

    return prefix + json + suffix;
  }

  protected recordEmit(bytes: number): void {
    this.stats.eventsEmitted++;
    this.stats.bytesWritten += bytes;
    this.stats.lastEmitTime = Date.now();
  }

  protected recordError(error: Error, event: UIEvent): void {
    this.stats.errors++;
    if (this.config.onError) {
      this.config.onError(error, event);
    }
  }
}

/**
 * Stdout event sink - writes events to stdout
 */
export class StdoutEventSink extends BaseEventSink {
  constructor(config: Partial<EventSinkConfig> = {}) {
    super({ mode: 'stdout', ...config });
  }

  emit(event: UIEvent): void {
    if (this.closed) return;

    try {
      const output = this.serialize(event);
      process.stdout.write(output);
      this.recordEmit(output.length);
    } catch (error) {
      this.recordError(error instanceof Error ? error : new Error(String(error)), event);
    }
  }
}

/**
 * IPC event sink - writes events to an IPC channel
 */
export class IPCEventSink extends BaseEventSink {
  private writeStream: NodeJS.WritableStream | null = null;
  private pendingEvents: UIEvent[] = [];
  private connecting = false;

  constructor(config: EventSinkConfig) {
    super({ ...config, mode: 'ipc' });

    if (!config.ipcPath) {
      throw new Error('IPC path is required for IPCEventSink');
    }

    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.connecting || this.closed) return;
    this.connecting = true;

    try {
      // For now, we use a simple file-based IPC
      // In production, this would use actual IPC mechanisms
      const { createWriteStream } = await import('fs');
      this.writeStream = createWriteStream(this.config.ipcPath!, {
        flags: 'a',
        encoding: 'utf8',
      });

      // Flush pending events
      for (const event of this.pendingEvents) {
        this.writeToStream(event);
      }
      this.pendingEvents = [];
    } catch (error) {
      console.error('Failed to connect to IPC channel:', error);
    } finally {
      this.connecting = false;
    }
  }

  private writeToStream(event: UIEvent): void {
    if (!this.writeStream) {
      this.pendingEvents.push(event);
      return;
    }

    try {
      const output = this.serialize(event);
      this.writeStream.write(output);
      this.recordEmit(output.length);
    } catch (error) {
      this.recordError(error instanceof Error ? error : new Error(String(error)), event);
    }
  }

  emit(event: UIEvent): void {
    if (this.closed) return;
    this.writeToStream(event);
  }

  flush(): void {
    // File streams auto-flush
  }

  close(): void {
    super.close();
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
  }
}

/**
 * Callback event sink - calls a custom callback for each event
 */
export class CallbackEventSink extends BaseEventSink {
  private callback: (event: UIEvent) => void;

  constructor(callback: (event: UIEvent) => void, config: Partial<EventSinkConfig> = {}) {
    super({ mode: 'callback', callback, ...config });
    this.callback = callback;
  }

  emit(event: UIEvent): void {
    if (this.closed) return;

    try {
      this.callback(event);
      this.recordEmit(JSON.stringify(event).length);
    } catch (error) {
      this.recordError(error instanceof Error ? error : new Error(String(error)), event);
    }
  }
}

/**
 * Buffer event sink - buffers events for later retrieval
 */
export class BufferEventSink extends BaseEventSink {
  private buffer: UIEvent[] = [];
  private maxSize: number;

  constructor(config: Partial<EventSinkConfig> & { maxSize?: number } = {}) {
    super({ mode: 'buffer', ...config });
    this.maxSize = config.maxSize ?? 1000;
  }

  emit(event: UIEvent): void {
    if (this.closed) return;

    try {
      if (this.buffer.length >= this.maxSize) {
        // Remove oldest event
        this.buffer.shift();
      }
      this.buffer.push(event);
      this.recordEmit(JSON.stringify(event).length);
    } catch (error) {
      this.recordError(error instanceof Error ? error : new Error(String(error)), event);
    }
  }

  flush(): void {
    this.buffer = [];
  }

  getBuffer(): UIEvent[] {
    return [...this.buffer];
  }

  getBufferSize(): number {
    return this.buffer.length;
  }
}

/**
 * Composite event sink - sends events to multiple sinks
 */
export class CompositeEventSink implements IEventSink {
  private sinks: IEventSink[];

  constructor(sinks: IEventSink[]) {
    this.sinks = sinks;
  }

  emit(event: UIEvent): void {
    for (const sink of this.sinks) {
      sink.emit(event);
    }
  }

  emitBatch(events: UIEvent[]): void {
    for (const sink of this.sinks) {
      sink.emitBatch(events);
    }
  }

  flush(): void {
    for (const sink of this.sinks) {
      sink.flush();
    }
  }

  close(): void {
    for (const sink of this.sinks) {
      sink.close();
    }
  }

  getStats(): EventSinkStats {
    // Aggregate stats from all sinks
    return this.sinks.reduce(
      (acc, sink) => {
        const stats = sink.getStats();
        return {
          eventsEmitted: acc.eventsEmitted + stats.eventsEmitted,
          bytesWritten: acc.bytesWritten + stats.bytesWritten,
          errors: acc.errors + stats.errors,
          lastEmitTime: Math.max(acc.lastEmitTime ?? 0, stats.lastEmitTime ?? 0) || null,
        };
      },
      { eventsEmitted: 0, bytesWritten: 0, errors: 0, lastEmitTime: null } as EventSinkStats
    );
  }

  addSink(sink: IEventSink): void {
    this.sinks.push(sink);
  }

  removeSink(sink: IEventSink): void {
    const index = this.sinks.indexOf(sink);
    if (index !== -1) {
      this.sinks.splice(index, 1);
    }
  }
}

/**
 * Factory function to create event sinks
 */
export function createEventSink(config: EventSinkConfig): IEventSink {
  switch (config.mode) {
    case 'stdout':
      return new StdoutEventSink(config);
    case 'ipc':
      return new IPCEventSink(config);
    case 'callback':
      if (!config.callback) {
        throw new Error('Callback is required for callback mode');
      }
      return new CallbackEventSink(config.callback, config);
    case 'buffer':
      return new BufferEventSink(config);
    default:
      throw new Error(`Unknown event sink mode: ${config.mode}`);
  }
}

/**
 * Default event sink instance (stdout)
 */
let defaultSink: IEventSink | null = null;

export function getDefaultEventSink(): IEventSink {
  if (!defaultSink) {
    defaultSink = new StdoutEventSink();
  }
  return defaultSink;
}

export function setDefaultEventSink(sink: IEventSink): void {
  defaultSink = sink;
}

/**
 * Convenience function to emit an event to the default sink
 */
export function emitEvent(event: UIEvent): void {
  getDefaultEventSink().emit(event);
}
