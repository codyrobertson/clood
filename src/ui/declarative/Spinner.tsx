/**
 * Declarative Spinner Component (UOW-0808)
 *
 * Animated loading spinners for terminal UI.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';

export type SpinnerType =
  | 'dots'
  | 'line'
  | 'arc'
  | 'circle'
  | 'square'
  | 'bounce'
  | 'clock'
  | 'moon'
  | 'earth'
  | 'hamburger'
  | 'growVertical'
  | 'growHorizontal';

const SPINNER_FRAMES: Record<SpinnerType, string[]> = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['-', '\\', '|', '/'],
  arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
  circle: ['◐', '◓', '◑', '◒'],
  square: ['◰', '◳', '◲', '◱'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  clock: ['🕛', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚'],
  moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
  earth: ['🌍', '🌎', '🌏'],
  hamburger: ['☱', '☲', '☴'],
  growVertical: ['▁', '▃', '▄', '▅', '▆', '▇', '▆', '▅', '▄', '▃'],
  growHorizontal: ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '▊', '▋', '▌', '▍', '▎'],
};

const SPINNER_SPEEDS: Record<SpinnerType, number> = {
  dots: 80,
  line: 130,
  arc: 100,
  circle: 120,
  square: 120,
  bounce: 120,
  clock: 100,
  moon: 80,
  earth: 180,
  hamburger: 100,
  growVertical: 120,
  growHorizontal: 80,
};

export interface SpinnerProps {
  /** Spinner animation type */
  type?: SpinnerType;
  /** Text to show after spinner */
  label?: string;
  /** Spinner color */
  color?: string;
  /** Animation speed in ms (overrides default) */
  speed?: number;
  /** Whether spinner is active */
  active?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  type = 'dots',
  label,
  color = 'cyan',
  speed,
  active = true,
}) => {
  const frames = SPINNER_FRAMES[type];
  const defaultSpeed = SPINNER_SPEEDS[type];
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, speed ?? defaultSpeed);

    return () => clearInterval(interval);
  }, [active, frames.length, speed, defaultSpeed]);

  if (!active) return null;

  const frame = frames[frameIndex] ?? frames[0];

  return (
    <Box>
      <Text color={color as Parameters<typeof Text>[0]['color']}>{frame}</Text>
      {label && <Text> {label}</Text>}
    </Box>
  );
};

/**
 * Loading indicator with message
 */
export interface LoadingProps {
  message?: string;
  spinnerType?: SpinnerType;
  showElapsed?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  spinnerType = 'dots',
  showElapsed = false,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!showElapsed) return;

    const interval = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showElapsed]);

  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Box>
      <Spinner type={spinnerType} />
      <Text> {message}</Text>
      {showElapsed && (
        <Text dimColor> ({formatElapsed(elapsed)})</Text>
      )}
    </Box>
  );
};

/**
 * Task spinner with status
 */
export interface TaskSpinnerProps {
  task: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  error?: string;
}

const STATUS_ICONS = {
  pending: '○',
  running: null, // Use spinner
  success: '✔',
  error: '✖',
  skipped: '◌',
};

const STATUS_COLORS = {
  pending: 'gray',
  running: 'cyan',
  success: 'green',
  error: 'red',
  skipped: 'yellow',
} as const;

export const TaskSpinner: React.FC<TaskSpinnerProps> = ({
  task,
  status,
  error,
}) => {
  const icon = STATUS_ICONS[status];
  const color = STATUS_COLORS[status];

  return (
    <Box flexDirection="column">
      <Box>
        {status === 'running' ? (
          <Spinner type="dots" color={color} />
        ) : (
          <Text color={color}>{icon}</Text>
        )}
        <Text color={status === 'running' ? 'cyan' : undefined}> {task}</Text>
      </Box>
      {error && (
        <Box marginLeft={2}>
          <Text color="red" dimColor>{error}</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Multi-task progress with spinners
 */
export interface TaskListProps {
  tasks: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    error?: string;
  }>;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  return (
    <Box flexDirection="column">
      {tasks.map((task) => (
        <TaskSpinner
          key={task.id}
          task={task.name}
          status={task.status}
          error={task.error}
        />
      ))}
    </Box>
  );
};

/**
 * Pulsing dot indicator
 */
export interface PulseDotProps {
  color?: string;
  size?: number;
}

export const PulseDot: React.FC<PulseDotProps> = ({
  color = 'cyan',
  size = 1,
}) => {
  const frames = ['⠁', '⠉', '⠋', '⠛', '⠟', '⠿', '⠟', '⠛', '⠋', '⠉'];
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, 120);

    return () => clearInterval(interval);
  }, [frames.length]);

  const frame = frames[frameIndex] ?? '⠁';

  return (
    <Text color={color as Parameters<typeof Text>[0]['color']}>
      {frame.repeat(size)}
    </Text>
  );
};

/**
 * Three-dot typing indicator
 */
export const TypingIndicator: React.FC<{ color?: string }> = ({ color = 'gray' }) => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, []);

  return (
    <Text color={color as Parameters<typeof Text>[0]['color']}>
      {'.'.repeat(dots)}{'   '.slice(dots)}
    </Text>
  );
};
