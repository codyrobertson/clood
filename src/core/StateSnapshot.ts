/**
 * State Snapshot Serializer (UOW-0203)
 *
 * Creates debuggable snapshots of state with large payload redaction.
 */

import type { AppState } from '../store/index.js';

export interface SnapshotOptions {
  /** Max content length before truncation (default: 200) */
  maxContentLength?: number;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Redact specific fields */
  redactFields?: string[];
}

export interface StateSnapshot {
  timestamp: string;
  summary: {
    messageCount: number;
    taskCount: number;
    hasDocument: boolean;
    viewMode: string;
    notificationCount: number;
  };
  messages: Array<{
    id: string;
    role: string;
    contentPreview: string;
    contentLength: number;
    isStreaming: boolean;
  }>;
  tasks: Array<{
    id: string;
    status: string;
    command: string;
  }>;
  document: {
    path: string;
    title: string;
    lineCount: number;
  } | null;
  ui: {
    viewMode: string;
    showTasksPanel: boolean;
    conversationScrollOffset: number;
    documentScrollOffset: number;
  };
}

export function createStateSnapshot(
  state: AppState,
  options: SnapshotOptions = {}
): StateSnapshot {
  const { maxContentLength = 200 } = options;

  const truncate = (str: string, maxLen: number): string => {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + `... [${str.length - maxLen} more chars]`;
  };

  return {
    timestamp: new Date().toISOString(),
    summary: {
      messageCount: state.messages.length,
      taskCount: state.tasks.length,
      hasDocument: state.currentDocument !== null,
      viewMode: state.viewMode,
      notificationCount: state.notifications.length,
    },
    messages: state.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      contentPreview: truncate(msg.content, maxContentLength),
      contentLength: msg.content.length,
      isStreaming: msg.isStreaming ?? false,
    })),
    tasks: state.tasks.map((task) => ({
      id: task.id,
      status: task.status,
      command: truncate(task.command, 50),
    })),
    document: state.currentDocument
      ? {
          path: state.currentDocument.path,
          title: state.currentDocument.title,
          lineCount: state.currentDocument.lineCount,
        }
      : null,
    ui: {
      viewMode: state.viewMode,
      showTasksPanel: state.showTasksPanel,
      conversationScrollOffset: state.conversationScrollOffset,
      documentScrollOffset: state.documentScrollOffset,
    },
  };
}

export function serializeSnapshot(snapshot: StateSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function logSnapshot(state: AppState, label?: string): void {
  const snapshot = createStateSnapshot(state);
  const serialized = serializeSnapshot(snapshot);
  // eslint-disable-next-line no-console
  console.log(`\n=== State Snapshot${label ? `: ${label}` : ''} ===\n${serialized}\n`);
}
