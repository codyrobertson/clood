/**
 * State Snapshot Serializer (UOW-0203)
 *
 * Creates debuggable snapshots of state with large payload redaction.
 * Used for debugging, logging, and state inspection.
 */

import type { AppState } from '../store/index.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SnapshotOptions {
  /** Max content length before truncation (default: 1000) */
  maxContentLength?: number;
  /** Include timestamps in output */
  includeTimestamps?: boolean;
  /** Redact specific fields by name */
  redactFields?: string[];
  /** Include full raw state (for advanced debugging) */
  includeRawState?: boolean;
  /** Pretty print JSON output */
  prettyPrint?: boolean;
}

export interface StateSnapshot {
  timestamp: string;
  version: string;
  summary: {
    messageCount: number;
    taskCount: number;
    hasDocument: boolean;
    viewMode: string;
    notificationCount: number;
    isDebugMode: boolean;
  };
  messages: Array<{
    id: string;
    role: string;
    contentPreview: string;
    contentLength: number;
    isStreaming: boolean;
    isRedacted: boolean;
  }>;
  tasks: Array<{
    id: string;
    status: string;
    command: string;
    hasOutput: boolean;
    hasError: boolean;
  }>;
  document: {
    path: string;
    title: string;
    lineCount: number;
    contentLength: number;
    isRedacted: boolean;
  } | null;
  ui: {
    viewMode: string;
    showTasksPanel: boolean;
    conversationScrollOffset: number;
    documentScrollOffset: number;
  };
  notifications: Array<{
    id: string;
    level: string;
    message: string;
  }>;
}

export interface DebugSnapshot extends StateSnapshot {
  debugInfo: {
    memoryUsage?: {
      heapUsed: number;
      heapTotal: number;
    };
    uptime?: number;
    nodeVersion?: string;
    platform?: string;
  };
  config: {
    showTasksPanel: boolean;
    autoScroll: boolean;
    maxMessagesInMemory: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_CONTENT_LENGTH = 1000;
const SNAPSHOT_VERSION = '1.0.0';
const REDACTION_MARKER = '[REDACTED]';

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Creates a state snapshot with large payload redaction.
 * Content exceeding maxContentLength (default: 1000 chars) is truncated.
 */
export function createStateSnapshot(
  state: AppState,
  options: SnapshotOptions = {}
): StateSnapshot {
  const { maxContentLength = DEFAULT_MAX_CONTENT_LENGTH, redactFields = [] } = options;

  const truncate = (str: string, maxLen: number): { text: string; isRedacted: boolean } => {
    if (str.length <= maxLen) {
      return { text: str, isRedacted: false };
    }
    const truncated = str.slice(0, maxLen);
    const remaining = str.length - maxLen;
    return {
      text: `${truncated}... [${remaining} more chars]`,
      isRedacted: true,
    };
  };

  const shouldRedact = (fieldName: string): boolean => {
    return redactFields.includes(fieldName);
  };

  return {
    timestamp: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    summary: {
      messageCount: state.messages.length,
      taskCount: state.tasks.length,
      hasDocument: state.currentDocument !== null,
      viewMode: state.viewMode,
      notificationCount: state.notifications.length,
      isDebugMode: state.debug,
    },
    messages: state.messages.map((msg) => {
      if (shouldRedact('messages')) {
        return {
          id: msg.id,
          role: msg.role,
          contentPreview: REDACTION_MARKER,
          contentLength: msg.content.length,
          isStreaming: msg.isStreaming ?? false,
          isRedacted: true,
        };
      }
      const { text, isRedacted } = truncate(msg.content, maxContentLength);
      return {
        id: msg.id,
        role: msg.role,
        contentPreview: text,
        contentLength: msg.content.length,
        isStreaming: msg.isStreaming ?? false,
        isRedacted,
      };
    }),
    tasks: state.tasks.map((task) => ({
      id: task.id,
      status: task.status,
      command: shouldRedact('tasks')
        ? REDACTION_MARKER
        : truncate(task.command, 100).text,
      hasOutput: !!task.output,
      hasError: !!task.error,
    })),
    document: state.currentDocument
      ? {
          path: shouldRedact('document')
            ? REDACTION_MARKER
            : state.currentDocument.path,
          title: state.currentDocument.title,
          lineCount: state.currentDocument.lineCount,
          contentLength: state.currentDocument.content.length,
          isRedacted: state.currentDocument.content.length > maxContentLength,
        }
      : null,
    ui: {
      viewMode: state.viewMode,
      showTasksPanel: state.showTasksPanel,
      conversationScrollOffset: state.conversationScrollOffset,
      documentScrollOffset: state.documentScrollOffset,
    },
    notifications: state.notifications.map((n) => ({
      id: n.id,
      level: n.level,
      message: truncate(n.message, 200).text,
    })),
  };
}

/**
 * Creates a debug snapshot with additional diagnostic information.
 * Includes memory usage, uptime, and configuration details.
 */
export function toDebugSnapshot(
  state: AppState,
  options: SnapshotOptions = {}
): DebugSnapshot {
  const baseSnapshot = createStateSnapshot(state, options);

  // Collect debug info (Node.js specific, handle browser environments)
  const debugInfo: DebugSnapshot['debugInfo'] = {};

  // Memory usage (Node.js only)
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage();
    debugInfo.memoryUsage = {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
    };
  }

  // Uptime (Node.js only)
  if (typeof process !== 'undefined' && process.uptime) {
    debugInfo.uptime = process.uptime();
  }

  // Node version and platform
  if (typeof process !== 'undefined') {
    debugInfo.nodeVersion = process.version;
    debugInfo.platform = process.platform;
  }

  return {
    ...baseSnapshot,
    debugInfo,
    config: {
      showTasksPanel: state.config.showTasksPanel,
      autoScroll: state.config.autoScroll,
      maxMessagesInMemory: state.config.maxMessagesInMemory,
    },
  };
}

/**
 * Serializes a snapshot to JSON string.
 */
export function serializeSnapshot(
  snapshot: StateSnapshot | DebugSnapshot,
  options: { prettyPrint?: boolean } = {}
): string {
  const { prettyPrint = true } = options;
  return JSON.stringify(snapshot, null, prettyPrint ? 2 : undefined);
}

/**
 * Creates and serializes a snapshot in one step.
 */
export function snapshotToString(
  state: AppState,
  options: SnapshotOptions = {}
): string {
  const snapshot = createStateSnapshot(state, options);
  return serializeSnapshot(snapshot, { prettyPrint: options.prettyPrint ?? true });
}

/**
 * Creates and serializes a debug snapshot in one step.
 */
export function debugSnapshotToString(
  state: AppState,
  options: SnapshotOptions = {}
): string {
  const snapshot = toDebugSnapshot(state, options);
  return serializeSnapshot(snapshot, { prettyPrint: options.prettyPrint ?? true });
}

/**
 * Logs a state snapshot to the console.
 */
export function logSnapshot(state: AppState, label?: string): void {
  const snapshot = createStateSnapshot(state);
  const serialized = serializeSnapshot(snapshot);
  // eslint-disable-next-line no-console
  console.log(`\n=== State Snapshot${label ? `: ${label}` : ''} ===\n${serialized}\n`);
}

/**
 * Logs a debug snapshot to the console.
 */
export function logDebugSnapshot(state: AppState, label?: string): void {
  const snapshot = toDebugSnapshot(state);
  const serialized = serializeSnapshot(snapshot);
  // eslint-disable-next-line no-console
  console.log(`\n=== Debug Snapshot${label ? `: ${label}` : ''} ===\n${serialized}\n`);
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

/**
 * Compares two snapshots and returns the differences.
 */
export function compareSnapshots(
  before: StateSnapshot,
  after: StateSnapshot
): SnapshotDiff {
  const changes: SnapshotChange[] = [];

  // Compare message counts
  if (before.summary.messageCount !== after.summary.messageCount) {
    changes.push({
      field: 'messageCount',
      before: before.summary.messageCount,
      after: after.summary.messageCount,
    });
  }

  // Compare task counts
  if (before.summary.taskCount !== after.summary.taskCount) {
    changes.push({
      field: 'taskCount',
      before: before.summary.taskCount,
      after: after.summary.taskCount,
    });
  }

  // Compare view mode
  if (before.summary.viewMode !== after.summary.viewMode) {
    changes.push({
      field: 'viewMode',
      before: before.summary.viewMode,
      after: after.summary.viewMode,
    });
  }

  // Compare document presence
  if (before.summary.hasDocument !== after.summary.hasDocument) {
    changes.push({
      field: 'hasDocument',
      before: before.summary.hasDocument,
      after: after.summary.hasDocument,
    });
  }

  // Compare notification counts
  if (before.summary.notificationCount !== after.summary.notificationCount) {
    changes.push({
      field: 'notificationCount',
      before: before.summary.notificationCount,
      after: after.summary.notificationCount,
    });
  }

  // Find new messages
  const beforeMsgIds = new Set(before.messages.map((m) => m.id));
  const newMessages = after.messages.filter((m) => !beforeMsgIds.has(m.id));
  if (newMessages.length > 0) {
    changes.push({
      field: 'newMessages',
      before: null,
      after: newMessages.map((m) => m.id),
    });
  }

  // Find new tasks
  const beforeTaskIds = new Set(before.tasks.map((t) => t.id));
  const newTasks = after.tasks.filter((t) => !beforeTaskIds.has(t.id));
  if (newTasks.length > 0) {
    changes.push({
      field: 'newTasks',
      before: null,
      after: newTasks.map((t) => t.id),
    });
  }

  // Find completed tasks
  const completedTasks = after.tasks.filter((afterTask) => {
    const beforeTask = before.tasks.find((t) => t.id === afterTask.id);
    return beforeTask && beforeTask.status !== afterTask.status;
  });
  if (completedTasks.length > 0) {
    changes.push({
      field: 'taskStatusChanges',
      before: completedTasks.map((t) => {
        const bt = before.tasks.find((bt) => bt.id === t.id);
        return { id: t.id, status: bt?.status };
      }),
      after: completedTasks.map((t) => ({ id: t.id, status: t.status })),
    });
  }

  return {
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    changes,
    timeDelta: new Date(after.timestamp).getTime() - new Date(before.timestamp).getTime(),
  };
}

export interface SnapshotDiff {
  hasChanges: boolean;
  changeCount: number;
  changes: SnapshotChange[];
  timeDelta: number;
}

export interface SnapshotChange {
  field: string;
  before: unknown;
  after: unknown;
}

// =============================================================================
// SNAPSHOT HISTORY
// =============================================================================

/**
 * Manages a rolling history of snapshots for debugging.
 */
export class SnapshotHistory {
  private snapshots: StateSnapshot[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  /**
   * Adds a snapshot to the history.
   */
  push(state: AppState, options?: SnapshotOptions): void {
    const snapshot = createStateSnapshot(state, options);
    this.snapshots.push(snapshot);

    // Trim to max size
    if (this.snapshots.length > this.maxSize) {
      this.snapshots.shift();
    }
  }

  /**
   * Gets the most recent snapshot.
   */
  latest(): StateSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Gets all snapshots in the history.
   */
  all(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Gets the number of snapshots in the history.
   */
  size(): number {
    return this.snapshots.length;
  }

  /**
   * Clears all snapshots.
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Compares the latest two snapshots.
   */
  compareLatest(): SnapshotDiff | null {
    if (this.snapshots.length < 2) {
      return null;
    }
    const before = this.snapshots[this.snapshots.length - 2]!;
    const after = this.snapshots[this.snapshots.length - 1]!;
    return compareSnapshots(before, after);
  }

  /**
   * Exports the history as JSON.
   */
  export(): string {
    return JSON.stringify(this.snapshots, null, 2);
  }
}
