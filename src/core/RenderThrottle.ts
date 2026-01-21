/**
 * Render Throttling (UOW-0305)
 *
 * Provides utilities to throttle render updates for better performance.
 */

export interface ThrottleOptions {
  /** Minimum time between updates in ms (default: 16 = ~60fps) */
  minInterval?: number;
  /** Maximum time to wait before forcing an update (default: 100ms) */
  maxWait?: number;
  /** Leading edge execution (default: true) */
  leading?: boolean;
  /** Trailing edge execution (default: true) */
  trailing?: boolean;
}

export interface ThrottleState {
  lastExecuteTime: number;
  pendingArgs: unknown[] | null;
  timerId: ReturnType<typeof setTimeout> | null;
  firstCallTime: number | null;
}

export type ThrottledFunction<T extends (...args: unknown[]) => unknown> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

/**
 * Create a throttled function that limits execution rate
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: ThrottleOptions = {}
): ThrottledFunction<T> {
  const { minInterval = 16, maxWait = 100, leading = true, trailing = true } = options;

  const state: ThrottleState = {
    lastExecuteTime: 0,
    pendingArgs: null,
    timerId: null,
    firstCallTime: null,
  };

  const execute = (args: unknown[]) => {
    state.lastExecuteTime = Date.now();
    state.firstCallTime = null;
    fn(...args);
  };

  const scheduleTrailing = (args: unknown[], delay: number) => {
    if (state.timerId) {
      clearTimeout(state.timerId);
    }
    state.timerId = setTimeout(() => {
      state.timerId = null;
      if (state.pendingArgs) {
        execute(state.pendingArgs);
        state.pendingArgs = null;
      }
    }, delay);
  };

  const throttled = (...args: Parameters<T>): void => {
    const now = Date.now();
    const timeSinceLastExecute = now - state.lastExecuteTime;
    const isFirstCall = state.firstCallTime === null;

    if (isFirstCall) {
      state.firstCallTime = now;
    }

    // Check if we've waited too long (maxWait exceeded)
    const timeSinceFirstCall = isFirstCall ? 0 : now - state.firstCallTime!;
    const maxWaitExceeded = timeSinceFirstCall >= maxWait;

    // Should execute now?
    if (timeSinceLastExecute >= minInterval || maxWaitExceeded) {
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      state.pendingArgs = null;

      if (leading || !isFirstCall) {
        execute(args);
      } else {
        state.pendingArgs = args;
        scheduleTrailing(args, minInterval);
      }
    } else {
      // Queue for trailing execution
      state.pendingArgs = args;
      if (trailing && !state.timerId) {
        const remaining = minInterval - timeSinceLastExecute;
        scheduleTrailing(args, remaining);
      }
    }
  };

  throttled.cancel = () => {
    if (state.timerId) {
      clearTimeout(state.timerId);
      state.timerId = null;
    }
    state.pendingArgs = null;
    state.firstCallTime = null;
  };

  throttled.flush = () => {
    if (state.pendingArgs) {
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      execute(state.pendingArgs);
      state.pendingArgs = null;
    }
  };

  throttled.pending = () => {
    return state.pendingArgs !== null;
  };

  return throttled;
}

/**
 * Frame-based render scheduler using requestAnimationFrame-like timing
 */
export class RenderScheduler {
  private frameTime: number;
  private lastFrameTime: number = 0;
  private pendingCallback: (() => void) | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private frameCount: number = 0;

  constructor(fps: number = 60) {
    this.frameTime = 1000 / fps;
  }

  /**
   * Schedule a render on the next available frame
   */
  scheduleRender(callback: () => void): void {
    this.pendingCallback = callback;

    if (this.timerId !== null) {
      return; // Already scheduled
    }

    const now = Date.now();
    const timeSinceLastFrame = now - this.lastFrameTime;
    const delay = Math.max(0, this.frameTime - timeSinceLastFrame);

    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.lastFrameTime = Date.now();
      this.frameCount++;

      if (this.pendingCallback) {
        const cb = this.pendingCallback;
        this.pendingCallback = null;
        cb();
      }
    }, delay);
  }

  /**
   * Cancel any pending render
   */
  cancel(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.pendingCallback = null;
  }

  /**
   * Get current frame count
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Check if a render is pending
   */
  isPending(): boolean {
    return this.pendingCallback !== null;
  }

  /**
   * Update target FPS
   */
  setFps(fps: number): void {
    this.frameTime = 1000 / fps;
  }
}

/**
 * Debounce function - delays execution until after wait period of inactivity
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number
): ThrottledFunction<T> {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: unknown[] | null = null;

  const debounced = (...args: Parameters<T>): void => {
    pendingArgs = args;

    if (timerId) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = null;
      if (pendingArgs) {
        fn(...pendingArgs);
        pendingArgs = null;
      }
    }, wait);
  };

  debounced.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (pendingArgs) {
      fn(...pendingArgs);
      pendingArgs = null;
    }
  };

  debounced.pending = () => {
    return pendingArgs !== null;
  };

  return debounced;
}

// Global render scheduler instance
let globalScheduler: RenderScheduler | null = null;

export function getRenderScheduler(fps: number = 60): RenderScheduler {
  if (!globalScheduler) {
    globalScheduler = new RenderScheduler(fps);
  }
  return globalScheduler;
}

export function resetRenderScheduler(): void {
  if (globalScheduler) {
    globalScheduler.cancel();
  }
  globalScheduler = null;
}
