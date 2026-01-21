/**
 * E2E Test Runner (UOW-1223)
 *
 * End-to-end test runner for the Clood TUI:
 * - Replay fixture files with event simulation
 * - Capture key screens at specified points
 * - Snapshot comparison utility
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import {
  loadFixture,
  parseFixture,
} from './FixtureReplay.js';
import { type ParsedEvent } from '../core/EventStream.js';

/** Screen capture at a point in time */
export interface ScreenCapture {
  /** Unique identifier for this capture */
  id: string;
  /** Timestamp when captured */
  timestamp: number;
  /** Event index that triggered the capture */
  eventIndex: number;
  /** Event that triggered the capture */
  triggerEvent?: ParsedEvent;
  /** Captured screen content */
  content: string;
  /** Metadata about the capture */
  metadata?: Record<string, unknown>;
}

/** Snapshot for comparison */
export interface Snapshot {
  /** Snapshot identifier */
  id: string;
  /** Screen content */
  content: string;
  /** When the snapshot was created */
  createdAt: number;
  /** Test run that created this snapshot */
  testRunId?: string;
}

/** Comparison result between snapshots */
export interface SnapshotComparison {
  /** Whether the snapshots match */
  matches: boolean;
  /** Expected snapshot */
  expected: Snapshot;
  /** Actual snapshot */
  actual: Snapshot;
  /** Differences if any */
  differences?: SnapshotDiff[];
}

/** Individual difference in snapshot */
export interface SnapshotDiff {
  /** Line number with difference */
  line: number;
  /** Expected content */
  expected: string;
  /** Actual content */
  actual: string;
  /** Type of difference */
  type: 'added' | 'removed' | 'changed';
}

/** Options for E2E test run */
export interface E2ETestOptions {
  /** Fixture path to replay */
  fixturePath?: string;
  /** Fixture content (alternative to path) */
  fixtureContent?: string;
  /** Delay between events in ms */
  eventDelay?: number;
  /** Points at which to capture screens (event indices or types) */
  capturePoints?: CapturePoint[];
  /** Screen renderer function */
  renderScreen?: (state: E2EState) => string;
  /** Snapshot directory for comparison */
  snapshotDir?: string;
  /** Whether to update snapshots instead of comparing */
  updateSnapshots?: boolean;
  /** Custom state reducer */
  stateReducer?: (state: E2EState, event: ParsedEvent) => E2EState;
  /** Timeout for the entire test run in ms */
  timeout?: number;
  /** Callback for progress updates */
  onProgress?: (progress: E2EProgress) => void;
}

/** When to capture a screen */
export interface CapturePoint {
  /** Capture at specific event index */
  atIndex?: number;
  /** Capture after specific event type */
  afterEventType?: string;
  /** Capture at percentage of total events */
  atPercentage?: number;
  /** Custom condition function */
  condition?: (event: ParsedEvent, index: number, state: E2EState) => boolean;
  /** ID for the capture point */
  id: string;
}

/** State maintained during E2E test */
export interface E2EState {
  /** Messages in the conversation */
  messages: Array<{
    id: string;
    role: string;
    content: string;
  }>;
  /** Active tasks */
  tasks: Array<{
    id: string;
    status: string;
    description?: string;
  }>;
  /** Current document if open */
  currentDocument?: {
    path: string;
    title: string;
    content: string;
  };
  /** Notifications shown */
  notifications: Array<{
    level: string;
    message: string;
  }>;
  /** Streaming message ID if any */
  streamingMessageId: string | null;
  /** Streaming content buffer */
  streamingContent: string;
  /** Number of events processed */
  eventCount: number;
  /** Custom state data */
  custom: Record<string, unknown>;
}

/** Progress update during test run */
export interface E2EProgress {
  /** Current event index */
  currentEvent: number;
  /** Total events */
  totalEvents: number;
  /** Percentage complete */
  percentage: number;
  /** Current event type */
  eventType: string;
  /** Captures taken so far */
  capturesTaken: number;
}

/** Result of an E2E test run */
export interface E2ETestResult {
  /** Whether the test passed */
  passed: boolean;
  /** Test run identifier */
  runId: string;
  /** When the test started */
  startTime: number;
  /** When the test ended */
  endTime: number;
  /** Duration in ms */
  duration: number;
  /** Number of events processed */
  eventsProcessed: number;
  /** Screen captures */
  captures: ScreenCapture[];
  /** Snapshot comparisons */
  comparisons: SnapshotComparison[];
  /** Errors encountered */
  errors: E2EError[];
  /** Final state */
  finalState: E2EState;
}

/** Error during E2E test */
export interface E2EError {
  /** Error message */
  message: string;
  /** Event index where error occurred */
  eventIndex?: number;
  /** Stack trace */
  stack?: string;
}

/**
 * Create initial E2E state
 */
function createInitialState(): E2EState {
  return {
    messages: [],
    tasks: [],
    notifications: [],
    streamingMessageId: null,
    streamingContent: '',
    eventCount: 0,
    custom: {},
  };
}

/**
 * Default state reducer that processes events
 */
function defaultStateReducer(state: E2EState, event: ParsedEvent): E2EState {
  const newState = { ...state, eventCount: state.eventCount + 1 };

  switch (event.type) {
    case 'message': {
      const msg = event as ParsedEvent & { id: string; role: string; content: string };
      const existingIndex = newState.messages.findIndex((m) => m.id === msg.id);
      if (existingIndex >= 0) {
        newState.messages = [...newState.messages];
        newState.messages[existingIndex] = {
          id: msg.id,
          role: msg.role,
          content: msg.content,
        };
      } else {
        newState.messages = [
          ...newState.messages,
          { id: msg.id, role: msg.role, content: msg.content },
        ];
      }
      // Clear streaming if this was the streaming message
      if (newState.streamingMessageId === msg.id) {
        newState.streamingMessageId = null;
        newState.streamingContent = '';
      }
      break;
    }

    case 'stream': {
      const stream = event as ParsedEvent & {
        messageId: string;
        content?: string;
        done?: boolean;
      };
      if (stream.content) {
        if (!newState.streamingMessageId) {
          newState.streamingMessageId = stream.messageId;
          newState.streamingContent = stream.content;
        } else {
          newState.streamingContent += stream.content;
        }
      }
      if (stream.done) {
        newState.streamingMessageId = null;
      }
      break;
    }

    case 'task': {
      const task = event as ParsedEvent & {
        id: string;
        status: string;
        description?: string;
      };
      const taskIndex = newState.tasks.findIndex((t) => t.id === task.id);
      if (taskIndex >= 0) {
        newState.tasks = [...newState.tasks];
        const existingTask = newState.tasks[taskIndex]!;
        newState.tasks[taskIndex] = {
          id: existingTask.id,
          status: task.status,
          description: task.description ?? existingTask.description,
        };
      } else {
        newState.tasks = [
          ...newState.tasks,
          { id: task.id, status: task.status, description: task.description },
        ];
      }
      break;
    }

    case 'document': {
      const doc = event as ParsedEvent & {
        action: string;
        path?: string;
        title?: string;
        content?: string;
      };
      if (doc.action === 'open' && doc.path) {
        newState.currentDocument = {
          path: doc.path,
          title: doc.title ?? doc.path,
          content: doc.content ?? '',
        };
      } else if (doc.action === 'close') {
        newState.currentDocument = undefined;
      }
      break;
    }

    case 'notify': {
      const notify = event as ParsedEvent & { level: string; message: string };
      newState.notifications = [
        ...newState.notifications,
        { level: notify.level, message: notify.message },
      ];
      break;
    }
  }

  return newState;
}

/**
 * Default screen renderer
 */
function defaultRenderScreen(state: E2EState): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('CLOOD TUI - Screen Capture');
  lines.push('='.repeat(60));
  lines.push('');

  // Messages
  lines.push(`--- Messages (${state.messages.length}) ---`);
  for (const msg of state.messages.slice(-5)) {
    const prefix = msg.role === 'user' ? '[USER]' : '[ASSISTANT]';
    const content =
      msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
    lines.push(`${prefix} ${content}`);
  }
  lines.push('');

  // Streaming indicator
  if (state.streamingMessageId) {
    lines.push(`--- Streaming: ${state.streamingMessageId} ---`);
    lines.push(state.streamingContent.substring(0, 100) + '...');
    lines.push('');
  }

  // Tasks
  if (state.tasks.length > 0) {
    lines.push(`--- Tasks (${state.tasks.length}) ---`);
    for (const task of state.tasks.slice(-3)) {
      lines.push(`[${task.status.toUpperCase()}] ${task.description ?? task.id}`);
    }
    lines.push('');
  }

  // Current document
  if (state.currentDocument) {
    lines.push(`--- Document: ${state.currentDocument.title} ---`);
    lines.push(state.currentDocument.content.substring(0, 100));
    lines.push('');
  }

  // Notifications
  if (state.notifications.length > 0) {
    lines.push(`--- Notifications ---`);
    for (const n of state.notifications.slice(-3)) {
      lines.push(`[${n.level.toUpperCase()}] ${n.message}`);
    }
  }

  lines.push('');
  lines.push(`Events processed: ${state.eventCount}`);
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Compare two strings and find differences
 */
function findDifferences(expected: string, actual: string): SnapshotDiff[] {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const diffs: SnapshotDiff[] = [];

  const maxLines = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLines; i++) {
    const expectedLine = expectedLines[i] ?? '';
    const actualLine = actualLines[i] ?? '';

    if (expectedLine !== actualLine) {
      let type: 'added' | 'removed' | 'changed' = 'changed';
      if (i >= expectedLines.length) {
        type = 'added';
      } else if (i >= actualLines.length) {
        type = 'removed';
      }

      diffs.push({
        line: i + 1,
        expected: expectedLine,
        actual: actualLine,
        type,
      });
    }
  }

  return diffs;
}

/**
 * Compare two snapshots
 */
export function compareSnapshots(expected: Snapshot, actual: Snapshot): SnapshotComparison {
  const differences = findDifferences(expected.content, actual.content);

  return {
    matches: differences.length === 0,
    expected,
    actual,
    differences: differences.length > 0 ? differences : undefined,
  };
}

/**
 * Load snapshot from file
 */
export function loadSnapshot(path: string): Snapshot | null {
  try {
    if (!existsSync(path)) {
      return null;
    }
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as Snapshot;
  } catch {
    return null;
  }
}

/**
 * Save snapshot to file
 */
export function saveSnapshot(path: string, snapshot: Snapshot): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * Generate a unique run ID
 */
function generateRunId(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Check if a capture point should trigger at the given event
 */
function shouldCapture(
  point: CapturePoint,
  event: ParsedEvent,
  index: number,
  totalEvents: number,
  state: E2EState
): boolean {
  if (point.atIndex !== undefined && point.atIndex === index) {
    return true;
  }

  if (point.afterEventType && event.type === point.afterEventType) {
    return true;
  }

  if (point.atPercentage !== undefined) {
    // Use (index + 1) / totalEvents for percentage since we want to capture at completion
    const currentPercentage = ((index + 1) / totalEvents) * 100;
    const targetPercentage = point.atPercentage;
    // Trigger at the first event that reaches the target percentage
    const prevPercentage = (index / totalEvents) * 100;
    if (prevPercentage < targetPercentage && currentPercentage >= targetPercentage) {
      return true;
    }
  }

  if (point.condition) {
    return point.condition(event, index, state);
  }

  return false;
}

/**
 * Run an E2E test
 */
export async function runE2ETest(options: E2ETestOptions): Promise<E2ETestResult> {
  const runId = generateRunId();
  const startTime = Date.now();
  const errors: E2EError[] = [];
  const captures: ScreenCapture[] = [];
  const comparisons: SnapshotComparison[] = [];

  // Load events
  let events: ParsedEvent[] = [];
  try {
    if (options.fixturePath) {
      events = loadFixture(options.fixturePath);
    } else if (options.fixtureContent) {
      events = parseFixture(options.fixtureContent);
    } else {
      throw new Error('Either fixturePath or fixtureContent must be provided');
    }
  } catch (error) {
    errors.push({
      message: `Failed to load fixture: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      passed: false,
      runId,
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      eventsProcessed: 0,
      captures: [],
      comparisons: [],
      errors,
      finalState: createInitialState(),
    };
  }

  // Initialize state
  let state = createInitialState();
  const stateReducer = options.stateReducer ?? defaultStateReducer;
  const renderScreen = options.renderScreen ?? defaultRenderScreen;
  const capturePoints = options.capturePoints ?? [];

  // Process events
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event) continue;

    try {
      // Update state
      state = stateReducer(state, event);

      // Check capture points
      for (const point of capturePoints) {
        if (shouldCapture(point, event, i, events.length, state)) {
          const content = renderScreen(state);
          const capture: ScreenCapture = {
            id: point.id,
            timestamp: Date.now(),
            eventIndex: i,
            triggerEvent: event,
            content,
          };
          captures.push(capture);

          // Compare with snapshot if configured
          if (options.snapshotDir) {
            const snapshotPath = join(options.snapshotDir, `${point.id}.json`);
            const existingSnapshot = loadSnapshot(snapshotPath);

            const currentSnapshot: Snapshot = {
              id: point.id,
              content,
              createdAt: Date.now(),
              testRunId: runId,
            };

            if (options.updateSnapshots || !existingSnapshot) {
              // Update/create snapshot
              saveSnapshot(snapshotPath, currentSnapshot);
            } else {
              // Compare with existing snapshot
              const comparison = compareSnapshots(existingSnapshot, currentSnapshot);
              comparisons.push(comparison);
            }
          }
        }
      }

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          currentEvent: i,
          totalEvents: events.length,
          percentage: Math.round((i / events.length) * 100),
          eventType: event.type,
          capturesTaken: captures.length,
        });
      }

      // Apply delay if specified
      if (options.eventDelay && options.eventDelay > 0) {
        await sleep(options.eventDelay);
      }
    } catch (error) {
      errors.push({
        message: `Error processing event at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
        eventIndex: i,
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    // Check timeout
    if (options.timeout && Date.now() - startTime > options.timeout) {
      errors.push({
        message: `Test timed out after ${options.timeout}ms`,
        eventIndex: i,
      });
      break;
    }
  }

  const endTime = Date.now();

  // Determine if test passed
  const passed =
    errors.length === 0 && comparisons.every((c) => c.matches);

  return {
    passed,
    runId,
    startTime,
    endTime,
    duration: endTime - startTime,
    eventsProcessed: state.eventCount,
    captures,
    comparisons,
    errors,
    finalState: state,
  };
}

/**
 * Create a simple capture point at an event index
 */
export function captureAt(index: number, id?: string): CapturePoint {
  return {
    atIndex: index,
    id: id ?? `capture-at-${index}`,
  };
}

/**
 * Create a capture point after a specific event type
 */
export function captureAfter(eventType: string, id?: string): CapturePoint {
  return {
    afterEventType: eventType,
    id: id ?? `capture-after-${eventType}`,
  };
}

/**
 * Create a capture point at a percentage through the test
 */
export function captureAtPercentage(percentage: number, id?: string): CapturePoint {
  return {
    atPercentage: percentage,
    id: id ?? `capture-at-${percentage}pct`,
  };
}

/**
 * Create a capture point with a custom condition
 */
export function captureWhen(
  condition: (event: ParsedEvent, index: number, state: E2EState) => boolean,
  id: string
): CapturePoint {
  return {
    condition,
    id,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default runE2ETest;
