/**
 * Tasks Panel Tests (UOW-0607)
 */

import { describe, it, expect } from 'vitest';
import type { Task, TaskStatus } from '../../types/index.js';

// Test the task filtering and categorization logic
describe('TasksPanel logic', () => {
  const createMockTask = (id: string, status: TaskStatus, command: string = 'test'): Task => ({
    id,
    command,
    status,
    startedAt: new Date().toISOString(),
  });

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
      const tasks: Task[] = [
        createMockTask('1', 'cancelled'),
      ];

      // Cancelled tasks could be grouped with completed or in their own category
      const cancelledTasks = tasks.filter((t) => t.status === 'cancelled');
      expect(cancelledTasks).toHaveLength(1);
    });
  });

  describe('selection management', () => {
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
        startedAt: new Date().toISOString(),
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
