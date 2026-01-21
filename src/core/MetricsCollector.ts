/**
 * Metrics Collector (UOW-1210-1212)
 *
 * Enhanced metrics collection with:
 * - Events per second tracking
 * - Renders per second tracking
 * - Memory usage monitoring
 * - Optional status bar display integration
 */

/** Metrics snapshot at a point in time */
export interface MetricsSnapshot {
  // Rate metrics
  eventsPerSecond: number;
  rendersPerSecond: number;

  // Memory metrics
  memoryUsageMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;

  // Counters
  totalEvents: number;
  totalRenders: number;
  totalErrors: number;

  // Performance
  avgEventProcessingMs: number;
  avgRenderTimeMs: number;
  maxEventProcessingMs: number;
  maxRenderTimeMs: number;

  // Session info
  uptimeSeconds: number;
  startTime: number;
  lastUpdateTime: number;
}

/** Options for metrics collection */
export interface MetricsCollectorOptions {
  /** Size of rolling window for rate calculations (default: 60 seconds) */
  windowSizeMs?: number;
  /** Enable memory tracking (default: true) */
  trackMemory?: boolean;
  /** Memory sampling interval in ms (default: 1000) */
  memorySampleIntervalMs?: number;
  /** Maximum samples to keep (default: 100) */
  maxSamples?: number;
}

/** Sample data point with timestamp */
interface TimestampedSample {
  timestamp: number;
  value: number;
}

/**
 * Advanced metrics collector for performance monitoring
 */
export class AdvancedMetricsCollector {
  private options: Required<MetricsCollectorOptions>;
  private startTime: number;

  // Counters
  private totalEvents = 0;
  private totalRenders = 0;
  private totalErrors = 0;

  // Rolling samples for rate calculation
  private eventSamples: TimestampedSample[] = [];
  private renderSamples: TimestampedSample[] = [];

  // Processing time tracking
  private eventProcessingTimes: number[] = [];
  private renderTimes: number[] = [];

  // Memory tracking
  private memoryInterval: ReturnType<typeof setInterval> | null = null;
  private lastMemorySnapshot: NodeJS.MemoryUsage | null = null;

  // Listeners for metrics updates
  private listeners: Set<(metrics: MetricsSnapshot) => void> = new Set();

  constructor(options: MetricsCollectorOptions = {}) {
    this.options = {
      windowSizeMs: options.windowSizeMs ?? 60000, // 60 seconds
      trackMemory: options.trackMemory ?? true,
      memorySampleIntervalMs: options.memorySampleIntervalMs ?? 1000,
      maxSamples: options.maxSamples ?? 100,
    };

    this.startTime = Date.now();

    // Start memory tracking if enabled
    if (this.options.trackMemory) {
      this.startMemoryTracking();
    }
  }

  /**
   * Record an event being processed
   */
  recordEvent(processingTimeMs?: number): void {
    const now = Date.now();
    this.totalEvents++;
    this.eventSamples.push({ timestamp: now, value: 1 });

    if (processingTimeMs !== undefined) {
      this.eventProcessingTimes.push(processingTimeMs);
      this.trimArray(this.eventProcessingTimes, this.options.maxSamples);
    }

    this.cleanupOldSamples(this.eventSamples, now);
    this.notifyListeners();
  }

  /**
   * Record a render cycle
   */
  recordRender(renderTimeMs?: number): void {
    const now = Date.now();
    this.totalRenders++;
    this.renderSamples.push({ timestamp: now, value: 1 });

    if (renderTimeMs !== undefined) {
      this.renderTimes.push(renderTimeMs);
      this.trimArray(this.renderTimes, this.options.maxSamples);
    }

    this.cleanupOldSamples(this.renderSamples, now);
    this.notifyListeners();
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.totalErrors++;
    this.notifyListeners();
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): MetricsSnapshot {
    const now = Date.now();
    this.cleanupOldSamples(this.eventSamples, now);
    this.cleanupOldSamples(this.renderSamples, now);

    // Calculate rates
    const windowSeconds = this.options.windowSizeMs / 1000;
    const eventsPerSecond = this.eventSamples.length / windowSeconds;
    const rendersPerSecond = this.renderSamples.length / windowSeconds;

    // Calculate processing times
    const avgEventProcessingMs = this.calculateAverage(this.eventProcessingTimes);
    const avgRenderTimeMs = this.calculateAverage(this.renderTimes);
    const maxEventProcessingMs = this.eventProcessingTimes.length > 0
      ? Math.max(...this.eventProcessingTimes)
      : 0;
    const maxRenderTimeMs = this.renderTimes.length > 0
      ? Math.max(...this.renderTimes)
      : 0;

    // Memory metrics
    const memory = this.getMemoryMetrics();

    return {
      eventsPerSecond,
      rendersPerSecond,
      memoryUsageMB: memory.rss,
      heapUsedMB: memory.heapUsed,
      heapTotalMB: memory.heapTotal,
      externalMB: memory.external,
      totalEvents: this.totalEvents,
      totalRenders: this.totalRenders,
      totalErrors: this.totalErrors,
      avgEventProcessingMs,
      avgRenderTimeMs,
      maxEventProcessingMs,
      maxRenderTimeMs,
      uptimeSeconds: (now - this.startTime) / 1000,
      startTime: this.startTime,
      lastUpdateTime: now,
    };
  }

  /**
   * Get formatted metrics string for status bar display
   */
  getStatusBarMetrics(): string {
    const metrics = this.getMetrics();
    const parts: string[] = [];

    // Events per second
    parts.push(`E:${metrics.eventsPerSecond.toFixed(1)}/s`);

    // Renders per second
    parts.push(`R:${metrics.rendersPerSecond.toFixed(1)}/s`);

    // Memory usage
    parts.push(`M:${metrics.memoryUsageMB.toFixed(0)}MB`);

    // Error count if any
    if (metrics.totalErrors > 0) {
      parts.push(`Err:${metrics.totalErrors}`);
    }

    return parts.join(' | ');
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(listener: (metrics: MetricsSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.totalEvents = 0;
    this.totalRenders = 0;
    this.totalErrors = 0;
    this.eventSamples = [];
    this.renderSamples = [];
    this.eventProcessingTimes = [];
    this.renderTimes = [];
    this.startTime = Date.now();
    this.notifyListeners();
  }

  /**
   * Stop metrics collection and cleanup
   */
  dispose(): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
    this.listeners.clear();
  }

  private startMemoryTracking(): void {
    this.updateMemorySnapshot();
    this.memoryInterval = setInterval(() => {
      this.updateMemorySnapshot();
    }, this.options.memorySampleIntervalMs);
  }

  private updateMemorySnapshot(): void {
    try {
      this.lastMemorySnapshot = process.memoryUsage();
    } catch {
      // Memory tracking not available
    }
  }

  private getMemoryMetrics(): {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  } {
    if (this.lastMemorySnapshot) {
      return {
        rss: this.lastMemorySnapshot.rss / 1024 / 1024,
        heapUsed: this.lastMemorySnapshot.heapUsed / 1024 / 1024,
        heapTotal: this.lastMemorySnapshot.heapTotal / 1024 / 1024,
        external: this.lastMemorySnapshot.external / 1024 / 1024,
      };
    }
    return { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 };
  }

  private cleanupOldSamples(samples: TimestampedSample[], now: number): void {
    const cutoff = now - this.options.windowSizeMs;
    let first = samples[0];
    while (samples.length > 0 && first && first.timestamp < cutoff) {
      samples.shift();
      first = samples[0];
    }
  }

  private trimArray<T>(arr: T[], maxLength: number): void {
    while (arr.length > maxLength) {
      arr.shift();
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  private notifyListeners(): void {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * Singleton metrics collector instance
 */
export const metricsCollector = new AdvancedMetricsCollector();

/**
 * Export getMetrics function for convenient access
 */
export function getMetrics(): MetricsSnapshot {
  return metricsCollector.getMetrics();
}

/**
 * Export status bar metrics string
 */
export function getStatusBarMetrics(): string {
  return metricsCollector.getStatusBarMetrics();
}

/**
 * Record an event (convenience function)
 */
export function recordEvent(processingTimeMs?: number): void {
  metricsCollector.recordEvent(processingTimeMs);
}

/**
 * Record a render (convenience function)
 */
export function recordRender(renderTimeMs?: number): void {
  metricsCollector.recordRender(renderTimeMs);
}

/**
 * Record an error (convenience function)
 */
export function recordError(): void {
  metricsCollector.recordError();
}

/**
 * Reset metrics (convenience function)
 */
export function resetMetrics(): void {
  metricsCollector.reset();
}

export default metricsCollector;
