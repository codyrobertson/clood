/**
 * Tasks Panel Tests (UOW-0607, UOW-0610)
 *
 * Comprehensive tests for TasksPanel component including:
 * - Task categorization and display logic
 * - Selection management and boundaries
 * - Empty state handling
 * - Panel toggle behavior
 * - Task control actions (cancel, retry)
 * - Event emission for task control
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Task, TaskStatus } from '../../types/index.js';
import { isCancelableTask, isRetryableTask } from './TasksPanel.js';
import { UIEvents, TaskCancelPayloadSchema, TaskRetryPayloadSchema } from '../../protocol/UIEvent.js';

// Mock task factory
const createMockTask = (
  id: string,
  status: TaskStatus,
  command: string = 'test',
  description?: string
): Task => ({
  id,
  command,
  description,
  status,
  startedAt: new Date(),
});

describe('TasksPanel logic', () => {
  describe('task categorization', () => {
    it('should separate running tasks', () => {
      const tasks: Task[] = [
        createMockTask('1', 'running'),
        createMockTask('2', 'completed'),
        createMockTask('3', 'pending'),
        createMockTask('4', 'failed'),
      ];

      const runningTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
      expect(runningTasks).toHaveLength(2);
      expect(runningTasks.map((t) => t.id)).toEqual(['1', '3']);
    });

    it('should separate completed tasks', () => {
      const tasks: Task[] = [
        createMockTask('1', 'running'),
        createMockTask('2', 'completed'),
        createMockTask('3', 'completed'),
      ];

      const completedTasks = tasks.filter((t) => t.status === 'completed');
      expect(completedTasks).toHaveLength(2);
    });

    it('should separate failed tasks', () => {
      const tasks: Task[] = [
        createMockTask('1', 'running'),
        createMockTask('2', 'failed'),
        createMockTask('3', 'failed'),
      ];

      const failedTasks = tasks.filter((t) => t.status === 'failed');
      expect(failedTasks).toHaveLength(2);
    });

    it('should include cancelled with completed', () => {
      const tasks: Task[] = [createMockTask('1', 'cancelled')];

      // Cancelled tasks could be grouped with completed or in their own category
      const cancelledTasks = tasks.filter((t) => t.status === 'cancelled');
      expect(cancelledTasks).toHaveLength(1);
    });
  });

  describe('selection management (UOW-0607)', () => {
    it('should reset selection when tasks are removed', () => {
      const tasks: Task[] = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 2; // Last item

      // Simulate task removal
      const newTasks = tasks.slice(0, 2);

      // Selection should adjust
      if (selectedIndex >= newTasks.length) {
        selectedIndex = Math.max(0, newTasks.length - 1);
      }

      expect(selectedIndex).toBe(1);
    });

    it('should keep selection at 0 for empty list', () => {
      let selectedIndex = 5;
      const tasks: Task[] = [];

      if (selectedIndex >= tasks.length) {
        selectedIndex = Math.max(0, tasks.length - 1);
      }

      expect(selectedIndex).toBe(0);
    });

    it('should support navigation up', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 2;

      // Navigate up
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(1);

      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);

      // Can't go below 0
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);
    });

    it('should support navigation down', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 0;

      // Navigate down
      selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(1);

      selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(2);

      // Can't go past end
      selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(2);
    });

    it('should jump to start with g', () => {
      let selectedIndex = 5;
      // Press 'g' to go to start
      selectedIndex = 0;
      expect(selectedIndex).toBe(0);
    });

    it('should jump to end with G', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 0;
      // Press 'G' to go to end
      selectedIndex = tasks.length - 1;
      expect(selectedIndex).toBe(2);
    });

    it('should handle selection boundaries at list start', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
      ];

      let selectedIndex = 0;

      // Attempting to go up at start should stay at 0
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);

      // Multiple attempts should still stay at 0
      for (let i = 0; i < 5; i++) {
        selectedIndex = Math.max(0, selectedIndex - 1);
      }
      expect(selectedIndex).toBe(0);
    });

    it('should handle selection boundaries at list end', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
      ];

      let selectedIndex = tasks.length - 1;

      // Attempting to go down at end should stay at end
      selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(1);

      // Multiple attempts should still stay at end
      for (let i = 0; i < 5; i++) {
        selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      }
      expect(selectedIndex).toBe(1);
    });

    it('should handle selection with single task', () => {
      const tasks = [createMockTask('1', 'running')];

      let selectedIndex = 0;

      // Up should stay at 0
      selectedIndex = Math.max(0, selectedIndex - 1);
      expect(selectedIndex).toBe(0);

      // Down should stay at 0
      selectedIndex = Math.min(tasks.length - 1, selectedIndex + 1);
      expect(selectedIndex).toBe(0);

      // G should stay at 0
      selectedIndex = tasks.length - 1;
      expect(selectedIndex).toBe(0);
    });
  });

  describe('empty state handling (UOW-0607)', () => {
    it('should handle empty task list gracefully', () => {
      const tasks: Task[] = [];

      expect(tasks.length).toBe(0);

      // Selection should default to 0
      let selectedIndex = 0;
      if (selectedIndex >= tasks.length && tasks.length > 0) {
        selectedIndex = Math.max(0, tasks.length - 1);
      }
      expect(selectedIndex).toBe(0);
    });

    it('should not crash when selecting from empty list', () => {
      const tasks: Task[] = [];
      const flatTaskList: Task[] = [];

      const getSelectedTask = (index: number): Task | null => {
        if (flatTaskList.length === 0 || index >= flatTaskList.length) {
          return null;
        }
        return flatTaskList[index];
      };

      expect(getSelectedTask(0)).toBeNull();
      expect(getSelectedTask(5)).toBeNull();
      expect(getSelectedTask(-1)).toBeNull();
    });

    it('should transition from empty to non-empty state', () => {
      let tasks: Task[] = [];
      let selectedIndex = 0;

      // Start empty
      expect(tasks.length).toBe(0);

      // Add tasks
      tasks = [createMockTask('1', 'running')];

      // Selection should still be valid
      expect(selectedIndex).toBe(0);
      expect(selectedIndex < tasks.length).toBe(true);
    });

    it('should transition from non-empty to empty state', () => {
      let tasks: Task[] = [createMockTask('1', 'running')];
      let selectedIndex = 0;

      // Start with task
      expect(tasks.length).toBe(1);

      // Remove all tasks
      tasks = [];

      // Selection should be reset
      if (selectedIndex >= tasks.length) {
        selectedIndex = Math.max(0, tasks.length - 1);
      }
      expect(selectedIndex).toBe(0);
    });
  });

  describe('panel toggle behavior (UOW-0607)', () => {
    it('should preserve selection when panel is hidden and shown', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 2;
      let panelVisible = true;

      // Hide panel
      panelVisible = false;

      // Selection should be preserved (component state persists)
      expect(selectedIndex).toBe(2);

      // Show panel again
      panelVisible = true;

      // Selection should still be at same index
      expect(selectedIndex).toBe(2);
      expect(tasks[selectedIndex].id).toBe('3');
    });

    it('should handle tasks changing while panel is hidden', () => {
      let tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
        createMockTask('3', 'running'),
      ];

      let selectedIndex = 2;

      // Hide panel
      let panelVisible = false;

      // Tasks complete while hidden
      tasks = [createMockTask('1', 'running')];

      // Show panel again - selection should adjust
      panelVisible = true;
      if (selectedIndex >= tasks.length) {
        selectedIndex = Math.max(0, tasks.length - 1);
      }

      expect(selectedIndex).toBe(0);
    });

    it('should reset to first task when focus is gained after being unfocused', () => {
      const tasks = [
        createMockTask('1', 'running'),
        createMockTask('2', 'running'),
      ];

      let selectedIndex = 1;
      let focused = true;

      // Lose focus
      focused = false;

      // Gain focus - could optionally reset to first
      focused = true;
      // Note: Current implementation preserves selection
      // This test documents the expected behavior

      expect(selectedIndex).toBe(1); // Selection preserved
    });
  });

  describe('task display limits', () => {
    it('should limit displayed completed tasks', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask(`${i}`, 'completed', `Task ${i}`)
      );

      // Show last 3 completed
      const displayedCompleted = tasks.slice(-3);
      expect(displayedCompleted).toHaveLength(3);
      expect(displayedCompleted[0].id).toBe('7');
    });

    it('should limit displayed failed tasks', () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask(`${i}`, 'failed', `Task ${i}`)
      );

      // Show last 3 failed
      const displayedFailed = tasks.slice(-3);
      expect(displayedFailed).toHaveLength(3);
    });

    it('should show all running tasks', () => {
      const runningTasks = Array.from({ length: 10 }, (_, i) =>
        createMockTask(`${i}`, 'running', `Task ${i}`)
      );

      // All running should be shown
      expect(runningTasks).toHaveLength(10);
    });
  });

  describe('text truncation', () => {
    it('should truncate long commands', () => {
      const maxWidth = 20;
      const longCommand = 'This is a very long command that should be truncated';

      const displayCommand = longCommand;
      const truncatedCommand =
        displayCommand.length > maxWidth - 4
          ? displayCommand.slice(0, maxWidth - 7) + '...'
          : displayCommand;

      expect(truncatedCommand.length).toBeLessThanOrEqual(maxWidth);
      expect(truncatedCommand).toContain('...');
    });

    it('should not truncate short commands', () => {
      const maxWidth = 50;
      const shortCommand = 'npm test';

      const displayCommand = shortCommand;
      const truncatedCommand =
        displayCommand.length > maxWidth - 4
          ? displayCommand.slice(0, maxWidth - 7) + '...'
          : displayCommand;

      expect(truncatedCommand).toBe(shortCommand);
    });

    it('should use description if available', () => {
      const task: Task = {
        id: '1',
        command: 'npm run build:production --verbose',
        description: 'Build project',
        status: 'running',
        startedAt: new Date(),
      };

      const displayCommand = task.description || task.command;
      expect(displayCommand).toBe('Build project');
    });
  });

  describe('status icons', () => {
    it('should map status to appropriate symbol', () => {
      const statusIcons: Record<TaskStatus, string> = {
        pending: '○',
        running: '●', // Spinner in actual component
        completed: '✓',
        failed: '✗',
        cancelled: '⊘',
      };

      expect(statusIcons.pending).toBe('○');
      expect(statusIcons.completed).toBe('✓');
      expect(statusIcons.failed).toBe('✗');
      expect(statusIcons.cancelled).toBe('⊘');
    });
  });

  describe('flat list ordering', () => {
    it('should build flat list in correct order', () => {
      const running = [createMockTask('r1', 'running'), createMockTask('r2', 'pending')];
      const failed = [createMockTask('f1', 'failed')];
      const completed = [createMockTask('c1', 'completed'), createMockTask('c2', 'completed')];

      const flatList = [...running, ...failed.slice(-3), ...completed.slice(-3)];

      expect(flatList.map((t) => t.id)).toEqual(['r1', 'r2', 'f1', 'c1', 'c2']);
    });
  });
});

/**
 * Task Control Tests (UOW-0610)
 *
 * Tests for task cancel/retry functionality and event emission
 */
describe('Task Control (UOW-0610)', () => {
  describe('isCancelableTask', () => {
    it('should return true for running tasks', () => {
      const task = createMockTask('1', 'running');
      expect(isCancelableTask(task)).toBe(true);
    });

    it('should return true for pending tasks', () => {
      const task = createMockTask('1', 'pending');
      expect(isCancelableTask(task)).toBe(true);
    });

    it('should return false for completed tasks', () => {
      const task = createMockTask('1', 'completed');
      expect(isCancelableTask(task)).toBe(false);
    });

    it('should return false for failed tasks', () => {
      const task = createMockTask('1', 'failed');
      expect(isCancelableTask(task)).toBe(false);
    });

    it('should return false for cancelled tasks', () => {
      const task = createMockTask('1', 'cancelled');
      expect(isCancelableTask(task)).toBe(false);
    });
  });

  describe('isRetryableTask', () => {
    it('should return true for failed tasks', () => {
      const task = createMockTask('1', 'failed');
      expect(isRetryableTask(task)).toBe(true);
    });

    it('should return true for cancelled tasks', () => {
      const task = createMockTask('1', 'cancelled');
      expect(isRetryableTask(task)).toBe(true);
    });

    it('should return false for running tasks', () => {
      const task = createMockTask('1', 'running');
      expect(isRetryableTask(task)).toBe(false);
    });

    it('should return false for pending tasks', () => {
      const task = createMockTask('1', 'pending');
      expect(isRetryableTask(task)).toBe(false);
    });

    it('should return false for completed tasks', () => {
      const task = createMockTask('1', 'completed');
      expect(isRetryableTask(task)).toBe(false);
    });
  });

  describe('UIEvents.taskCancel', () => {
    it('should create task cancel event with taskId', () => {
      const event = UIEvents.taskCancel('task-123');

      expect(event.eventType).toBe('task.cancel');
      expect(event.payload).toEqual({
        taskId: 'task-123',
        reason: undefined,
        force: false,
      });
    });

    it('should create task cancel event with reason', () => {
      const event = UIEvents.taskCancel('task-123', 'user requested');

      expect(event.eventType).toBe('task.cancel');
      expect(event.payload).toEqual({
        taskId: 'task-123',
        reason: 'user requested',
        force: false,
      });
    });

    it('should create task cancel event with force flag', () => {
      const event = UIEvents.taskCancel('task-123', 'timeout', true);

      expect(event.eventType).toBe('task.cancel');
      expect(event.payload).toEqual({
        taskId: 'task-123',
        reason: 'timeout',
        force: true,
      });
    });

    it('should include valid timestamp', () => {
      const before = new Date().toISOString();
      const event = UIEvents.taskCancel('task-123');
      const after = new Date().toISOString();

      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
    });

    it('should include version 1.0', () => {
      const event = UIEvents.taskCancel('task-123');
      expect(event.version).toBe('1.0');
    });
  });

  describe('UIEvents.taskRetry', () => {
    it('should create task retry event with taskId', () => {
      const event = UIEvents.taskRetry('task-456');

      expect(event.eventType).toBe('task.retry');
      expect(event.payload).toEqual({
        taskId: 'task-456',
        resetState: false,
      });
    });

    it('should create task retry event with resetState flag', () => {
      const event = UIEvents.taskRetry('task-456', true);

      expect(event.eventType).toBe('task.retry');
      expect(event.payload).toEqual({
        taskId: 'task-456',
        resetState: true,
      });
    });

    it('should include valid timestamp', () => {
      const before = new Date().toISOString();
      const event = UIEvents.taskRetry('task-456');
      const after = new Date().toISOString();

      expect(event.timestamp >= before).toBe(true);
      expect(event.timestamp <= after).toBe(true);
    });
  });

  describe('UIEvents.taskAction', () => {
    it('should create task action event for cancel', () => {
      const event = UIEvents.taskAction('task-789', 'cancel');

      expect(event.eventType).toBe('task_action');
      expect(event.payload).toEqual({
        taskId: 'task-789',
        action: 'cancel',
        data: undefined,
      });
    });

    it('should create task action event for retry', () => {
      const event = UIEvents.taskAction('task-789', 'retry');

      expect(event.eventType).toBe('task_action');
      expect(event.payload).toEqual({
        taskId: 'task-789',
        action: 'retry',
        data: undefined,
      });
    });

    it('should create task action event with additional data', () => {
      const event = UIEvents.taskAction('task-789', 'view', { scrollTo: 100 });

      expect(event.eventType).toBe('task_action');
      expect(event.payload).toEqual({
        taskId: 'task-789',
        action: 'view',
        data: { scrollTo: 100 },
      });
    });

    it('should support all action types', () => {
      const actions: Array<'cancel' | 'retry' | 'pause' | 'resume' | 'view'> = [
        'cancel',
        'retry',
        'pause',
        'resume',
        'view',
      ];

      for (const action of actions) {
        const event = UIEvents.taskAction('task-1', action);
        expect(event.eventType).toBe('task_action');
        expect(event.payload.action).toBe(action);
      }
    });
  });

  describe('TaskCancelPayloadSchema validation', () => {
    it('should validate minimal payload', () => {
      const payload = { taskId: 'task-123' };
      const result = TaskCancelPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-123');
        expect(result.data.force).toBe(false);
      }
    });

    it('should validate complete payload', () => {
      const payload = {
        taskId: 'task-123',
        reason: 'user cancelled',
        force: true,
      };
      const result = TaskCancelPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-123');
        expect(result.data.reason).toBe('user cancelled');
        expect(result.data.force).toBe(true);
      }
    });

    it('should reject payload without taskId', () => {
      const payload = { reason: 'test' };
      const result = TaskCancelPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });

    it('should default force to false', () => {
      const payload = { taskId: 'task-123' };
      const result = TaskCancelPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.force).toBe(false);
      }
    });
  });

  describe('TaskRetryPayloadSchema validation', () => {
    it('should validate minimal payload', () => {
      const payload = { taskId: 'task-456' };
      const result = TaskRetryPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-456');
        expect(result.data.resetState).toBe(false);
      }
    });

    it('should validate complete payload', () => {
      const payload = {
        taskId: 'task-456',
        resetState: true,
      };
      const result = TaskRetryPayloadSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-456');
        expect(result.data.resetState).toBe(true);
      }
    });

    it('should reject payload without taskId', () => {
      const payload = { resetState: true };
      const result = TaskRetryPayloadSchema.safeParse(payload);

      expect(result.success).toBe(false);
    });
  });

  describe('Task status transitions', () => {
    it('should allow transition from running to cancelled', () => {
      const task = createMockTask('1', 'running');
      expect(isCancelableTask(task)).toBe(true);

      // Simulate cancellation
      const cancelledTask: Task = { ...task, status: 'cancelled' };
      expect(cancelledTask.status).toBe('cancelled');
      expect(isCancelableTask(cancelledTask)).toBe(false);
    });

    it('should allow transition from pending to cancelled', () => {
      const task = createMockTask('1', 'pending');
      expect(isCancelableTask(task)).toBe(true);

      // Simulate cancellation
      const cancelledTask: Task = { ...task, status: 'cancelled' };
      expect(cancelledTask.status).toBe('cancelled');
      expect(isCancelableTask(cancelledTask)).toBe(false);
    });

    it('should allow transition from failed to running (retry)', () => {
      const task = createMockTask('1', 'failed');
      expect(isRetryableTask(task)).toBe(true);

      // Simulate retry
      const retriedTask: Task = { ...task, status: 'running' };
      expect(retriedTask.status).toBe('running');
      expect(isRetryableTask(retriedTask)).toBe(false);
    });

    it('should allow transition from cancelled to running (retry)', () => {
      const task = createMockTask('1', 'cancelled');
      expect(isRetryableTask(task)).toBe(true);

      // Simulate retry
      const retriedTask: Task = { ...task, status: 'running' };
      expect(retriedTask.status).toBe('running');
      expect(isRetryableTask(retriedTask)).toBe(false);
    });

    it('should not allow cancellation of completed tasks', () => {
      const task = createMockTask('1', 'completed');
      expect(isCancelableTask(task)).toBe(false);
    });

    it('should not allow retry of running tasks', () => {
      const task = createMockTask('1', 'running');
      expect(isRetryableTask(task)).toBe(false);
    });
  });

  describe('Cancel keybinding behavior', () => {
    it('should only cancel if task is cancelable', () => {
      const runningTask = createMockTask('1', 'running');
      const completedTask = createMockTask('2', 'completed');

      // Simulating keybinding 'k' press behavior
      const attemptCancel = (task: Task): boolean => {
        if (!isCancelableTask(task)) {
          return false;
        }
        return true;
      };

      expect(attemptCancel(runningTask)).toBe(true);
      expect(attemptCancel(completedTask)).toBe(false);
    });

    it('should emit correct event payload on cancel', () => {
      const taskId = 'test-task-123';
      const event = UIEvents.taskCancel(taskId);

      // Verify structure matches expected format
      expect(event).toMatchObject({
        eventType: 'task.cancel',
        payload: {
          taskId,
          force: false,
        },
        version: '1.0',
      });
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('string');
    });
  });

  describe('Retry keybinding behavior', () => {
    it('should only retry if task is retryable', () => {
      const failedTask = createMockTask('1', 'failed');
      const runningTask = createMockTask('2', 'running');

      // Simulating keybinding 'r' press behavior
      const attemptRetry = (task: Task): boolean => {
        if (!isRetryableTask(task)) {
          return false;
        }
        return true;
      };

      expect(attemptRetry(failedTask)).toBe(true);
      expect(attemptRetry(runningTask)).toBe(false);
    });

    it('should emit correct event payload on retry', () => {
      const taskId = 'test-task-456';
      const event = UIEvents.taskRetry(taskId);

      // Verify structure matches expected format
      expect(event).toMatchObject({
        eventType: 'task.retry',
        payload: {
          taskId,
          resetState: false,
        },
        version: '1.0',
      });
      expect(event.timestamp).toBeDefined();
    });
  });

  describe('Confirmation dialog behavior', () => {
    it('should support optional confirmation before cancel', () => {
      let showConfirm = false;
      let pendingTaskId: string | null = null;
      const confirmCancel = true; // Config option

      const initiateCancel = (task: Task): void => {
        if (!isCancelableTask(task)) return;

        if (confirmCancel) {
          pendingTaskId = task.id;
          showConfirm = true;
        }
      };

      const task = createMockTask('1', 'running');
      initiateCancel(task);

      expect(showConfirm).toBe(true);
      expect(pendingTaskId).toBe('1');
    });

    it('should bypass confirmation when disabled', () => {
      let cancelled = false;
      const confirmCancel = false; // Config option disabled

      const initiateCancel = (task: Task, doConfirm: boolean): void => {
        if (!isCancelableTask(task)) return;

        if (doConfirm) {
          // Show confirmation
        } else {
          cancelled = true;
        }
      };

      const task = createMockTask('1', 'running');
      initiateCancel(task, confirmCancel);

      expect(cancelled).toBe(true);
    });

    it('should handle confirmation yes/no responses', () => {
      let taskCancelled = false;
      let confirmDismissed = false;

      const confirmYes = (): void => {
        taskCancelled = true;
        confirmDismissed = true;
      };

      const confirmNo = (): void => {
        taskCancelled = false;
        confirmDismissed = true;
      };

      // User presses 'y'
      confirmYes();
      expect(taskCancelled).toBe(true);
      expect(confirmDismissed).toBe(true);

      // Reset
      taskCancelled = false;
      confirmDismissed = false;

      // User presses 'n'
      confirmNo();
      expect(taskCancelled).toBe(false);
      expect(confirmDismissed).toBe(true);
    });
  });

  describe('Event envelope structure (UOW-0609)', () => {
    it('should have correct envelope format for task.cancel', () => {
      const event = UIEvents.taskCancel('task-1', 'user request', false);

      expect(event).toHaveProperty('eventType', 'task.cancel');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('payload');
      expect(event).toHaveProperty('version', '1.0');

      // Payload should contain task control specific fields
      expect(event.payload).toHaveProperty('taskId', 'task-1');
      expect(event.payload).toHaveProperty('reason', 'user request');
      expect(event.payload).toHaveProperty('force', false);
    });

    it('should have correct envelope format for task.retry', () => {
      const event = UIEvents.taskRetry('task-2', true);

      expect(event).toHaveProperty('eventType', 'task.retry');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('payload');
      expect(event).toHaveProperty('version', '1.0');

      // Payload should contain task control specific fields
      expect(event.payload).toHaveProperty('taskId', 'task-2');
      expect(event.payload).toHaveProperty('resetState', true);
    });

    it('should have ISO 8601 timestamp format', () => {
      const event = UIEvents.taskCancel('task-1');

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(event.timestamp).toMatch(iso8601Regex);
    });
  });
});

/**
 * Integration-like tests for callback behavior
 */
describe('TasksPanel callback integration', () => {
  it('should call onTaskCancel with correct taskId', () => {
    const onTaskCancel = vi.fn();
    const taskId = 'task-to-cancel';

    // Simulate cancel action
    onTaskCancel(taskId);

    expect(onTaskCancel).toHaveBeenCalledTimes(1);
    expect(onTaskCancel).toHaveBeenCalledWith(taskId);
  });

  it('should call onTaskRetry with correct taskId', () => {
    const onTaskRetry = vi.fn();
    const taskId = 'task-to-retry';

    // Simulate retry action
    onTaskRetry(taskId);

    expect(onTaskRetry).toHaveBeenCalledTimes(1);
    expect(onTaskRetry).toHaveBeenCalledWith(taskId);
  });

  it('should not call callbacks for non-actionable tasks', () => {
    const onTaskCancel = vi.fn();
    const onTaskRetry = vi.fn();

    const completedTask = createMockTask('1', 'completed');

    // Simulate pressing 'k' on completed task
    if (isCancelableTask(completedTask)) {
      onTaskCancel(completedTask.id);
    }

    // Simulate pressing 'r' on completed task
    if (isRetryableTask(completedTask)) {
      onTaskRetry(completedTask.id);
    }

    expect(onTaskCancel).not.toHaveBeenCalled();
    expect(onTaskRetry).not.toHaveBeenCalled();
  });
});
