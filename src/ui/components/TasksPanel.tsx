/**
 * Tasks Panel Component (UOW-0608)
 *
 * Displays a list of background tasks and their statuses.
 * Shows running, completed, and failed tasks with keyboard navigation.
 * Supports task cancellation with 'k' keybinding.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useStore } from '../../store/index.js';
import type { Task, TaskStatus } from '../../types/index.js';
import { UIEventEmitter } from '../declarative/EventEmitter.js';

export interface TasksPanelProps {
  width: number;
  height: number;
  /** Whether this panel has focus for keyboard navigation */
  focused?: boolean;
  /** Callback when a task cancel is requested */
  onTaskCancel?: (taskId: string) => void;
  /** Callback when a task retry is requested */
  onTaskRetry?: (taskId: string) => void;
  /** Whether to show confirmation before cancel (default: false) */
  confirmCancel?: boolean;
}

/**
 * Check if a task can be cancelled
 */
export function isCancelableTask(task: Task): boolean {
  return task.status === 'running' || task.status === 'pending';
}

/**
 * Check if a task can be retried
 */
export function isRetryableTask(task: Task): boolean {
  return task.status === 'failed' || task.status === 'cancelled';
}

export const TasksPanel: React.FC<TasksPanelProps> = ({
  width,
  height,
  focused = false,
  onTaskCancel,
  onTaskRetry,
  confirmCancel = false,
}) => {
  const tasks = useStore((s) => s.tasks);
  const theme = useStore((s) => s.config.theme);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCancelTaskId, setPendingCancelTaskId] = useState<string | null>(null);

  // Reset selection when tasks change
  useEffect(() => {
    if (selectedIndex >= tasks.length) {
      setSelectedIndex(Math.max(0, tasks.length - 1));
    }
  }, [tasks.length, selectedIndex]);

  // Separate tasks by status for display
  const runningTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  // Build flat list for selection mapping
  const flatTaskList = [...runningTasks, ...failedTasks.slice(-3), ...completedTasks.slice(-3)];

  /**
   * Get the currently selected task
   */
  const getSelectedTask = useCallback((): Task | null => {
    if (flatTaskList.length === 0 || selectedIndex >= flatTaskList.length) {
      return null;
    }
    return flatTaskList[selectedIndex] ?? null;
  }, [flatTaskList, selectedIndex]);

  /**
   * Handle task cancellation (UOW-0608)
   */
  const handleCancelTask = useCallback((task: Task) => {
    if (!isCancelableTask(task)) {
      return;
    }

    // Update local state to 'cancelling' status
    // Note: We use 'cancelled' status since TaskStatus doesn't have 'cancelling'
    // The UI will show it's being cancelled via visual feedback
    updateTaskStatus(task.id, 'cancelled');

    // Emit the cancel event through the UI event emitter
    UIEventEmitter.emit({
      type: 'modal.cancel', // Using existing event type for compatibility
      componentId: 'tasks-panel',
      data: { taskId: task.id, action: 'cancel' },
    });

    // Call the callback if provided
    if (onTaskCancel) {
      onTaskCancel(task.id);
    }
  }, [updateTaskStatus, onTaskCancel]);

  /**
   * Handle task retry (UOW-0608)
   */
  const handleRetryTask = useCallback((task: Task) => {
    if (!isRetryableTask(task)) {
      return;
    }

    // Emit the retry event through the UI event emitter
    UIEventEmitter.emit({
      type: 'modal.confirm', // Using existing event type for compatibility
      componentId: 'tasks-panel',
      data: { taskId: task.id, action: 'retry' },
    });

    // Call the callback if provided
    if (onTaskRetry) {
      onTaskRetry(task.id);
    }
  }, [onTaskRetry]);

  /**
   * Initiate cancel with optional confirmation
   */
  const initiateCancel = useCallback(() => {
    const selectedTask = getSelectedTask();
    if (!selectedTask || !isCancelableTask(selectedTask)) {
      return;
    }

    if (confirmCancel) {
      setPendingCancelTaskId(selectedTask.id);
      setShowCancelConfirm(true);
    } else {
      handleCancelTask(selectedTask);
    }
  }, [getSelectedTask, confirmCancel, handleCancelTask]);

  /**
   * Confirm the pending cancellation
   */
  const confirmCancelAction = useCallback(() => {
    if (pendingCancelTaskId) {
      const task = tasks.find((t) => t.id === pendingCancelTaskId);
      if (task) {
        handleCancelTask(task);
      }
    }
    setShowCancelConfirm(false);
    setPendingCancelTaskId(null);
  }, [pendingCancelTaskId, tasks, handleCancelTask]);

  /**
   * Cancel the confirmation dialog
   */
  const cancelConfirmAction = useCallback(() => {
    setShowCancelConfirm(false);
    setPendingCancelTaskId(null);
  }, []);

  // Handle keyboard navigation and actions when focused
  useInput(
    (input, key) => {
      if (!focused) return;

      // Handle confirmation dialog
      if (showCancelConfirm) {
        if (input === 'y' || input === 'Y' || key.return) {
          confirmCancelAction();
        } else if (input === 'n' || input === 'N' || key.escape) {
          cancelConfirmAction();
        }
        return;
      }

      if (tasks.length === 0) return;

      // Navigation (using arrow keys only, 'j'/'k' reserved for vim-style but 'k' is cancel)
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(flatTaskList.length - 1, prev + 1));
      } else if (input === 'g') {
        setSelectedIndex(0);
      } else if (input === 'G') {
        setSelectedIndex(flatTaskList.length - 1);
      } else if (input === 'k') {
        // Cancel selected task (UOW-0608)
        initiateCancel();
      } else if (input === 'r') {
        // Retry selected task
        const selectedTask = getSelectedTask();
        if (selectedTask && isRetryableTask(selectedTask)) {
          handleRetryTask(selectedTask);
        }
      }
    },
    { isActive: focused }
  );

  const isSelected = (task: Task) => {
    const flatIndex = flatTaskList.findIndex((t) => t.id === task.id);
    return flatIndex === selectedIndex;
  };

  // Render cancel confirmation dialog
  if (showCancelConfirm && pendingCancelTaskId) {
    const pendingTask = tasks.find((t) => t.id === pendingCancelTaskId);
    return (
      <Box flexDirection="column" height={height}>
        <Text bold color="yellow">Cancel Task?</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Are you sure you want to cancel:</Text>
          <Text color="cyan">{pendingTask?.description || pendingTask?.command}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>[Y]es / [N]o</Text>
        </Box>
      </Box>
    );
  }

  if (tasks.length === 0) {
    return (
      <Box flexDirection="column" height={height}>
        <Text bold color="blue">Tasks</Text>
        <Box marginTop={1} justifyContent="center">
          <Text dimColor italic>No background tasks</Text>
        </Box>
        {focused && (
          <Box marginTop={1}>
            <Text dimColor>↑/↓: Navigate</Text>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height={height}>
      <Text bold color={focused ? 'cyan' : 'blue'}>
        Tasks ({tasks.length})
        {focused && <Text color="yellow"> *</Text>}
      </Text>

      {/* Running tasks */}
      {runningTasks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="yellow">Running ({runningTasks.length})</Text>
          {runningTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              maxWidth={width}
              selected={focused && isSelected(task)}
              showCancelable={focused}
            />
          ))}
        </Box>
      )}

      {/* Failed tasks */}
      {failedTasks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.errorColor}>Failed ({failedTasks.length})</Text>
          {failedTasks.slice(-3).map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              maxWidth={width}
              selected={focused && isSelected(task)}
              showCancelable={focused}
            />
          ))}
        </Box>
      )}

      {/* Completed tasks (show last 3) */}
      {completedTasks.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.successColor}>Done ({completedTasks.length})</Text>
          {completedTasks.slice(-3).map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              maxWidth={width}
              selected={focused && isSelected(task)}
              showCancelable={focused}
            />
          ))}
        </Box>
      )}

      {/* Navigation hint */}
      {focused && (
        <Box marginTop={1}>
          <Text dimColor>↑/↓/j: Navigate | k: Cancel | r: Retry</Text>
        </Box>
      )}
    </Box>
  );
};

interface TaskItemProps {
  task: Task;
  maxWidth: number;
  selected?: boolean;
  /** Show cancelable indicator */
  showCancelable?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  maxWidth,
  selected = false,
  showCancelable = false,
}) => {
  const getStatusIcon = (status: TaskStatus): React.ReactNode => {
    switch (status) {
      case 'pending':
        return <Text color="gray">○</Text>;
      case 'running':
        return <Text color="yellow"><Spinner type="dots" /></Text>;
      case 'completed':
        return <Text color="green">✓</Text>;
      case 'failed':
        return <Text color="red">✗</Text>;
      case 'cancelled':
        return <Text color="gray">⊘</Text>;
      default:
        return <Text>?</Text>;
    }
  };

  // Check if task is cancelable or retryable
  const cancelable = isCancelableTask(task);
  const retryable = isRetryableTask(task);

  // Truncate command to fit (accounting for action hints)
  const actionHintWidth = selected && (cancelable || retryable) ? 4 : 0;
  const displayCommand = task.description || task.command;
  const availableWidth = maxWidth - 4 - actionHintWidth;
  const truncatedCommand =
    displayCommand.length > availableWidth
      ? displayCommand.slice(0, availableWidth - 3) + '...'
      : displayCommand;

  return (
    <Box paddingLeft={1}>
      {selected && <Text color="cyan">▶ </Text>}
      {!selected && <Text>  </Text>}
      {getStatusIcon(task.status)}
      <Text> </Text>
      <Text
        dimColor={!selected && (task.status === 'completed' || task.status === 'cancelled')}
        bold={selected}
      >
        {truncatedCommand}
      </Text>
      {/* Visual indication of cancelable/retryable task (UOW-0608) */}
      {selected && cancelable && showCancelable && (
        <Text color="yellow"> [k]</Text>
      )}
      {selected && retryable && showCancelable && (
        <Text color="green"> [r]</Text>
      )}
      {task.exitCode !== undefined && task.exitCode !== 0 && (
        <Text color="red"> (exit: {task.exitCode})</Text>
      )}
    </Box>
  );
};
