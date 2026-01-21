/**
 * Render Throttler (UOW-0305)
 *
 * Provides high-performance render throttling using requestAnimationFrame-style timing.
 * Throttles render updates to configurable 16-33ms intervals (30-60 FPS).
 * Designed to handle 10k+ events while maintaining responsive rendering.
 */

/**
 * Configuration for the render throttler
 */
export interface RenderThrottlerConfig {
  /** Target frame rate (30-60 FPS recommended, default: 60) */
  targetFps: number;

  /** Minimum frame interval in ms (default: calculated from targetFps) */
  minFrameInterval?: number;

  /** Maximum frame interval in ms (default: 33ms = 30fps floor) */
  maxFrameInterval?: number;

  /** Enable adaptive frame rate based on load (default: true) */
  adaptiveFrameRate?: boolean;

  /** Threshold for dropping frames under heavy load (default: 100) */
  loadThreshold?: number;

  /** Enable incremental rendering for large updates (default: true) */
  incrementalRendering?: boolean;

  /** Batch size for incremental rendering (default: 100) */
  incrementalBatchSize?: number;
}

/**
 * Render statistics for monitoring performance
 */
export interface RenderStats {
  /** Total frames rendered */
  framesRendered: number;

  /** Frames dropped due to load */
  framesDropped: number;

  /** Average frame time in ms */
  avgFrameTime: number;

  /** Maximum frame time recorded */
  maxFrameTime: number;

  /** Current effective FPS */
  effectiveFps: number;

  /** Total render callbacks queued */
  callbacksQueued: number;

  /** Total render callbacks executed */
  callbacksExecuted: number;

  /** Time since throttler started */
  uptimeMs: number;
}

/**
 * Frame callback with optional priority
 */
export interface FrameCallback {
  callback: () => void;
  priority: number;
  timestamp: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<RenderThrottlerConfig> = {
  targetFps: 60,
  minFrameInterval: 16, // ~60fps
  maxFrameInterval: 33, // ~30fps
  adaptiveFrameRate: true,
  loadThreshold: 100,
  incrementalRendering: true,
  incrementalBatchSize: 100,
};

/**
 * RenderThrottler class
 *
 * Provides requestAnimationFrame-style timing for smooth terminal UI updates.
 * Coalesces multiple render requests into a single frame to avoid overwhelming
 * the terminal with updates.
 */
export class RenderThrottler {
  private config: Required<RenderThrottlerConfig>;
  private frameInterval: number;
  private lastFrameTime: number = 0;
  private pendingCallbacks: FrameCallback[] = [];
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isRunning: boolean = false;
  private startTime: number = 0;

  // Statistics tracking
  private stats = {
    framesRendered: 0,
    framesDropped: 0,
    totalFrameTime: 0,
    maxFrameTime: 0,
    callbacksQueued: 0,
    callbacksExecuted: 0,
    recentFrameTimes: [] as number[],
  };

  // Adaptive frame rate tracking
  private loadHistory: number[] = [];
  private readonly LOAD_HISTORY_SIZE = 10;
  private readonly RECENT_FRAMES_SIZE = 60;

  constructor(config: Partial<RenderThrottlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Calculate frame interval from target FPS
    this.frameInterval = config.minFrameInterval ?? Math.floor(1000 / this.config.targetFps);

    // Clamp frame interval to valid range
    this.frameInterval = Math.max(
      this.config.minFrameInterval,
      Math.min(this.config.maxFrameInterval, this.frameInterval)
    );
  }

  /**
   * Start the throttler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.lastFrameTime = Date.now();
  }

  /**
   * Stop the throttler
   */
  stop(): void {
    this.isRunning = false;
    this.cancelPendingFrame();
  }

  /**
   * Request a render on the next frame
   * Similar to requestAnimationFrame but for terminal UI
   */
  requestFrame(callback: () => void, priority: number = 0): void {
    if (!this.isRunning) {
      this.start();
    }

    this.stats.callbacksQueued++;

    this.pendingCallbacks.push({
      callback,
      priority,
      timestamp: Date.now(),
    });

    this.scheduleNextFrame();
  }

  /**
   * Schedule the next frame render
   */
  private scheduleNextFrame(): void {
    if (this.timerId !== null) {
      // Already scheduled
      return;
    }

    const now = Date.now();
    const timeSinceLastFrame = now - this.lastFrameTime;
    const currentInterval = this.getCurrentFrameInterval();
    const delay = Math.max(0, currentInterval - timeSinceLastFrame);

    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.executeFrame();
    }, delay);
  }

  /**
   * Get current frame interval (adaptive or fixed)
   */
  private getCurrentFrameInterval(): number {
    if (!this.config.adaptiveFrameRate) {
      return this.frameInterval;
    }

    // Calculate average load from history
    if (this.loadHistory.length === 0) {
      return this.frameInterval;
    }

    const avgLoad = this.loadHistory.reduce((a, b) => a + b, 0) / this.loadHistory.length;

    // If under heavy load, slow down frame rate
    if (avgLoad > this.config.loadThreshold) {
      const loadFactor = Math.min(avgLoad / this.config.loadThreshold, 2);
      return Math.min(
        this.frameInterval * loadFactor,
        this.config.maxFrameInterval
      );
    }

    return this.frameInterval;
  }

  /**
   * Execute a frame - process all pending callbacks
   */
  private executeFrame(): void {
    if (this.pendingCallbacks.length === 0) {
      return;
    }

    const frameStart = Date.now();
    this.lastFrameTime = frameStart;

    // Sort callbacks by priority (higher priority first)
    this.pendingCallbacks.sort((a, b) => b.priority - a.priority);

    // Track load for adaptive frame rate
    const currentLoad = this.pendingCallbacks.length;
    this.loadHistory.push(currentLoad);
    if (this.loadHistory.length > this.LOAD_HISTORY_SIZE) {
      this.loadHistory.shift();
    }

    // Check if we should drop this frame due to excessive load
    if (this.config.adaptiveFrameRate && currentLoad > this.config.loadThreshold * 2) {
      // Keep only the highest priority callback
      const highestPriority = this.pendingCallbacks[0];
      this.stats.framesDropped++;
      this.pendingCallbacks = highestPriority ? [highestPriority] : [];
    }

    // Execute callbacks
    const callbacks = this.pendingCallbacks;
    this.pendingCallbacks = [];

    if (this.config.incrementalRendering && callbacks.length > this.config.incrementalBatchSize) {
      // Process in batches for incremental rendering
      this.executeIncrementally(callbacks);
    } else {
      // Execute all at once
      this.executeCallbacks(callbacks);
    }

    // Record frame statistics
    const frameTime = Date.now() - frameStart;
    this.recordFrameTime(frameTime);

    // Schedule next frame if there are pending callbacks
    if (this.pendingCallbacks.length > 0) {
      this.scheduleNextFrame();
    }
  }

  /**
   * Execute callbacks incrementally in batches
   */
  private executeIncrementally(callbacks: FrameCallback[]): void {
    const batchSize = this.config.incrementalBatchSize;
    let processed = 0;

    const processBatch = () => {
      const batch = callbacks.slice(processed, processed + batchSize);
      this.executeCallbacks(batch);
      processed += batch.length;

      if (processed < callbacks.length) {
        // Schedule next batch with minimal delay
        setImmediate(() => processBatch());
      }
    };

    processBatch();
  }

  /**
   * Execute a batch of callbacks
   */
  private executeCallbacks(callbacks: FrameCallback[]): void {
    for (const { callback } of callbacks) {
      try {
        callback();
        this.stats.callbacksExecuted++;
      } catch (error) {
        // Log but don't break the render loop
        console.error('RenderThrottler: callback error:', error);
      }
    }
  }

  /**
   * Record frame time for statistics
   */
  private recordFrameTime(frameTime: number): void {
    this.stats.framesRendered++;
    this.stats.totalFrameTime += frameTime;
    this.stats.maxFrameTime = Math.max(this.stats.maxFrameTime, frameTime);

    // Track recent frame times for FPS calculation
    this.stats.recentFrameTimes.push(frameTime);
    if (this.stats.recentFrameTimes.length > this.RECENT_FRAMES_SIZE) {
      this.stats.recentFrameTimes.shift();
    }
  }

  /**
   * Cancel any pending frame
   */
  cancelPendingFrame(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Flush all pending callbacks immediately (synchronously)
   * This bypasses incremental rendering to ensure all callbacks execute
   */
  flush(): void {
    this.cancelPendingFrame();

    if (this.pendingCallbacks.length > 0) {
      // Sort by priority before flushing
      this.pendingCallbacks.sort((a, b) => b.priority - a.priority);

      const callbacks = this.pendingCallbacks;
      this.pendingCallbacks = [];

      // Execute all callbacks synchronously (bypass incremental rendering)
      this.executeCallbacks(callbacks);
      this.stats.framesRendered++;

      // Record frame time
      this.recordFrameTime(0);
    }
  }

  /**
   * Clear all pending callbacks without executing them
   */
  clear(): void {
    this.cancelPendingFrame();
    this.pendingCallbacks = [];
  }

  /**
   * Get render statistics
   */
  getStats(): RenderStats {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Calculate effective FPS from recent frame times
    let effectiveFps = 0;
    if (this.stats.recentFrameTimes.length > 0) {
      const avgRecentFrameTime =
        this.stats.recentFrameTimes.reduce((a, b) => a + b, 0) /
        this.stats.recentFrameTimes.length;
      effectiveFps = avgRecentFrameTime > 0 ? 1000 / avgRecentFrameTime : this.config.targetFps;
    } else if (this.stats.framesRendered > 0) {
      effectiveFps = (this.stats.framesRendered / uptime) * 1000;
    }

    return {
      framesRendered: this.stats.framesRendered,
      framesDropped: this.stats.framesDropped,
      avgFrameTime: this.stats.framesRendered > 0
        ? this.stats.totalFrameTime / this.stats.framesRendered
        : 0,
      maxFrameTime: this.stats.maxFrameTime,
      effectiveFps: Math.round(effectiveFps * 10) / 10,
      callbacksQueued: this.stats.callbacksQueued,
      callbacksExecuted: this.stats.callbacksExecuted,
      uptimeMs: uptime,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      framesRendered: 0,
      framesDropped: 0,
      totalFrameTime: 0,
      maxFrameTime: 0,
      callbacksQueued: 0,
      callbacksExecuted: 0,
      recentFrameTimes: [],
    };
    this.loadHistory = [];
    this.startTime = Date.now();
  }

  /**
   * Get pending callback count
   */
  getPendingCount(): number {
    return this.pendingCallbacks.length;
  }

  /**
   * Check if throttler has pending callbacks
   */
  hasPending(): boolean {
    return this.pendingCallbacks.length > 0;
  }

  /**
   * Check if throttler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RenderThrottlerConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.targetFps !== undefined || config.minFrameInterval !== undefined) {
      this.frameInterval = config.minFrameInterval ?? Math.floor(1000 / this.config.targetFps);
      this.frameInterval = Math.max(
        this.config.minFrameInterval,
        Math.min(this.config.maxFrameInterval, this.frameInterval)
      );
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<RenderThrottlerConfig>> {
    return { ...this.config };
  }

  /**
   * Destroy the throttler and clean up resources
   */
  destroy(): void {
    this.stop();
    this.pendingCallbacks = [];
    this.loadHistory = [];
  }
}

/**
 * Create a render throttler with the given configuration
 */
export function createRenderThrottler(
  config?: Partial<RenderThrottlerConfig>
): RenderThrottler {
  return new RenderThrottler(config);
}

/**
 * Global render throttler instance
 */
let globalThrottler: RenderThrottler | null = null;

/**
 * Get or create the global render throttler
 */
export function getRenderThrottler(
  config?: Partial<RenderThrottlerConfig>
): RenderThrottler {
  if (!globalThrottler) {
    globalThrottler = new RenderThrottler(config);
  } else if (config) {
    globalThrottler.updateConfig(config);
  }
  return globalThrottler;
}

/**
 * Reset the global render throttler
 */
export function resetRenderThrottler(): void {
  if (globalThrottler) {
    globalThrottler.destroy();
    globalThrottler = null;
  }
}

/**
 * Convenience function to request a frame on the global throttler
 */
export function requestRenderFrame(callback: () => void, priority: number = 0): void {
  getRenderThrottler().requestFrame(callback, priority);
}

/**
 * Convenience function to flush the global throttler
 */
export function flushRenderFrames(): void {
  if (globalThrottler) {
    globalThrottler.flush();
  }
}
