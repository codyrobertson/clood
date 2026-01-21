/**
 * Error Log Panel Component (UOW-1202)
 *
 * Shows recent errors with timestamps in a scrollable list.
 * Toggle with 'e' key.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

/** Error entry with timestamp and details */
export interface ErrorEntry {
  id: string;
  timestamp: Date;
  message: string;
  source?: string;
  stack?: string;
}

export interface ErrorLogPanelProps {
  /** List of errors to display */
  errors: ErrorEntry[];
  /** Maximum height of the panel */
  maxHeight?: number;
  /** Whether the panel is visible */
  visible?: boolean;
  /** Callback when visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
}

/**
 * Global error log store for collecting errors
 */
class ErrorLogStore {
  private errors: ErrorEntry[] = [];
  private maxErrors = 100;
  private idCounter = 0;
  private listeners: Set<() => void> = new Set();

  addError(message: string, source?: string, stack?: string): ErrorEntry {
    const entry: ErrorEntry = {
      id: `err-${++this.idCounter}-${Date.now()}`,
      timestamp: new Date(),
      message,
      source,
      stack,
    };

    this.errors.push(entry);

    // Trim old errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    this.notifyListeners();
    return entry;
  }

  getErrors(): ErrorEntry[] {
    return [...this.errors];
  }

  getRecentErrors(count: number): ErrorEntry[] {
    return this.errors.slice(-count);
  }

  clearErrors(): void {
    this.errors = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Singleton error log store */
export const errorLog = new ErrorLogStore();

/**
 * Hook to get error log state with automatic updates
 */
export function useErrorLog(): ErrorEntry[] {
  const [errors, setErrors] = React.useState<ErrorEntry[]>(errorLog.getErrors());

  React.useEffect(() => {
    const unsubscribe = errorLog.subscribe(() => {
      setErrors(errorLog.getErrors());
    });
    return unsubscribe;
  }, []);

  return errors;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Error Log Panel Component
 */
export const ErrorLogPanel: React.FC<ErrorLogPanelProps> = ({
  errors,
  maxHeight = 10,
  visible = true,
  onVisibilityChange,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Calculate visible range
  const displayErrors = errors.slice().reverse(); // Most recent first
  const visibleCount = Math.min(maxHeight - 2, displayErrors.length);
  const maxScroll = Math.max(0, displayErrors.length - visibleCount);
  const visibleErrors = displayErrors.slice(scrollOffset, scrollOffset + visibleCount);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (!visible) return;

    // Toggle visibility with 'e'
    if (input === 'e') {
      onVisibilityChange?.(!visible);
      return;
    }

    // Scroll up
    if (key.upArrow && scrollOffset > 0) {
      setScrollOffset(scrollOffset - 1);
    }

    // Scroll down
    if (key.downArrow && scrollOffset < maxScroll) {
      setScrollOffset(scrollOffset + 1);
    }

    // Page up
    if (key.pageUp) {
      setScrollOffset(Math.max(0, scrollOffset - visibleCount));
    }

    // Page down
    if (key.pageDown) {
      setScrollOffset(Math.min(maxScroll, scrollOffset + visibleCount));
    }

    // Home - go to newest
    if (input === 'g' && key.shift) {
      setScrollOffset(0);
    }

    // End - go to oldest
    if (input === 'G') {
      setScrollOffset(maxScroll);
    }

    // Toggle error expansion
    if (key.return && visibleErrors.length > 0) {
      const currentError = visibleErrors[0];
      if (currentError) {
        setExpanded(expanded === currentError.id ? null : currentError.id);
      }
    }

    // Clear errors
    if (input === 'c' && key.ctrl) {
      errorLog.clearErrors();
      setScrollOffset(0);
    }
  });

  if (!visible) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="red"
      paddingX={1}
      marginTop={1}
      height={maxHeight}
    >
      {/* Header */}
      <Box justifyContent="space-between">
        <Text bold color="red">
          Error Log ({errors.length} errors)
        </Text>
        <Text dimColor>
          {scrollOffset > 0 && '\u2191'} {scrollOffset < maxScroll && '\u2193'} | Ctrl+C: Clear | E: Toggle
        </Text>
      </Box>

      {/* Error list */}
      {errors.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor italic>
            No errors recorded
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column" marginTop={1}>
          {visibleErrors.map((error, _index) => (
            <Box key={error.id} flexDirection="column">
              <Box>
                <Text color="gray">[{formatTimestamp(error.timestamp)}]</Text>
                <Text color="red"> </Text>
                {error.source && (
                  <Text color="yellow">[{error.source}] </Text>
                )}
                <Text color="red" wrap="truncate">
                  {error.message}
                </Text>
              </Box>
              {/* Expanded stack trace */}
              {expanded === error.id && error.stack && (
                <Box marginLeft={2} marginTop={0}>
                  <Text dimColor wrap="truncate">
                    {error.stack.split('\n').slice(0, 3).join('\n')}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Scroll indicator */}
      {displayErrors.length > visibleCount && (
        <Box marginTop={1}>
          <Text dimColor>
            Showing {scrollOffset + 1}-{Math.min(scrollOffset + visibleCount, displayErrors.length)} of {displayErrors.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Standalone Error Log Panel with built-in visibility toggle
 * Use this when you want the component to manage its own visibility state
 */
export const StandaloneErrorLogPanel: React.FC<{
  maxHeight?: number;
  initialVisible?: boolean;
}> = ({ maxHeight = 10, initialVisible = false }) => {
  const [visible, setVisible] = useState(initialVisible);
  const errors = useErrorLog();

  // Global 'e' key handler for toggle
  useInput((input) => {
    if (input === 'e') {
      setVisible((prev) => !prev);
    }
  });

  return (
    <ErrorLogPanel
      errors={errors}
      maxHeight={maxHeight}
      visible={visible}
      onVisibilityChange={setVisible}
    />
  );
};

export default ErrorLogPanel;
