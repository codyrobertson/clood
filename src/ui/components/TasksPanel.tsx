/**
 * Tasks Panel Component
 *
 * Displays a list of background tasks and their statuses.
 * Shows running, completed, and failed tasks with keyboard navigation.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { useStore } from '../../store/index.js';
import type { Task, TaskStatus } from '../../types/index.js';

export interface TasksPanelProps {
  width: number;
  height: number;
  /** Whether this panel has focus for keyboard navigation */
  focused?: boolean;
}

export const TasksPanel: React.FC<TasksPanelProps> = ({ width, height, focused = false }) => {
  const tasks = useStore((s) => s.tasks);
  const theme = useStore((s) => s.config.theme);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when tasks change
  useEffect(() => {
    if (selectedIndex >= tasks.length) {
      setSelectedIndex(Math.max(0, tasks.length - 1));
    }
  }, [tasks.length, selectedIndex]);

  // Handle keyboard navigation when focused
  useInput(
    (input, key) => {
      if (!focused || tasks.length === 0) return;

      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(tasks.length - 1, prev + 1));
      } else if (input === 'g') {
        setSelectedIndex(0);
      } else if (input === 'G') {
        setSelectedIndex(tasks.length - 1);
      }
    },
    { isActive: focused }
  );

  // Separate tasks by status for display
  const runningTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const failedTasks = tasks.filter((t) => t.status === 'failed');

  // Build flat list for selection mapping
  const flatTaskList = [...runningTasks, ...failedTasks.slice(-3), ...completedTasks.slice(-3)];

  const isSelected = (task: Task) => {
    const flatIndex = flatTaskList.findIndex((t) => t.id === task.id);
    return flatIndex === selectedIndex;
  };

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
            />
          ))}
        </Box>
      )}

      {/* Navigation hint */}
      {focused && (
        <Box marginTop={1}>
          <Text dimColor>↑/↓: Navigate | k: Cancel</Text>
        </Box>
      )}
    </Box>
  );
};

interface TaskItemProps {
  task: Task;
  maxWidth: number;
  selected?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, maxWidth, selected = false }) => {
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

  // Truncate command to fit
  const displayCommand = task.description || task.command;
  const truncatedCommand =
    displayCommand.length > maxWidth - 4
      ? displayCommand.slice(0, maxWidth - 7) + '...'
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
      {task.exitCode !== undefined && task.exitCode !== 0 && (
        <Text color="red"> (exit: {task.exitCode})</Text>
      )}
    </Box>
  );
};
