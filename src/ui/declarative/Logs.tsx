/**
 * Declarative Logs Component (UOW-0817)
 *
 * Renders a log viewer with timestamps, level filtering, color coding,
 * and auto-scroll functionality.
 * Emits log.filter events when filter toggles occur.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { UIEventEmitter } from './EventEmitter.js';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log entry interface
 */
export interface LogEntry {
  id: string;
  timestamp: Date | string;
  level: LogLevel;
  message: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log filter UI event
 */
export interface LogFilterUIEvent {
  type: 'log.filter';
  componentId: string;
  timestamp: string;
  data: {
    enabledLevels: LogLevel[];
    toggledLevel?: LogLevel;
    action: 'enable' | 'disable' | 'toggle' | 'reset';
  };
}

/**
 * Log scroll UI event
 */
export interface LogScrollUIEvent {
  type: 'log.scroll';
  componentId: string;
  timestamp: string;
  data: {
    autoScroll: boolean;
    scrollPosition: number;
  };
}

/**
 * Emit log filter event
 */
export function emitLogFilter(
  componentId: string,
  enabledLevels: LogLevel[],
  toggledLevel: LogLevel | undefined,
  action: 'enable' | 'disable' | 'toggle' | 'reset'
): void {
  UIEventEmitter.emit({
    type: 'log.filter' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { enabledLevels, toggledLevel, action },
  });
}

/**
 * Emit log scroll event
 */
export function emitLogScroll(
  componentId: string,
  autoScroll: boolean,
  scrollPosition: number
): void {
  UIEventEmitter.emit({
    type: 'log.scroll' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { autoScroll, scrollPosition },
  });
}

/**
 * Color mapping for log levels
 */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'gray',
  info: 'blue',
  warn: 'yellow',
  error: 'red',
};

/**
 * Icons for log levels
 */
const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '[D]',
  info: '[I]',
  warn: '[W]',
  error: '[E]',
};

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date | string, format: 'full' | 'time' | 'short'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    return String(timestamp);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');

  switch (format) {
    case 'full':
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case 'time':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case 'short':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    default:
      return date.toISOString();
  }
}

export interface LogsProps {
  /** Unique component ID */
  id: string;
  /** Log entries to display */
  entries: LogEntry[];
  /** Maximum number of visible entries */
  maxVisible?: number;
  /** Initial enabled levels */
  enabledLevels?: LogLevel[];
  /** Auto-scroll to bottom on new entries */
  autoScroll?: boolean;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Timestamp format */
  timestampFormat?: 'full' | 'time' | 'short';
  /** Show level icons */
  showLevelIcons?: boolean;
  /** Show source column */
  showSource?: boolean;
  /** Whether component is visible */
  visible?: boolean;
  /** Whether component has focus */
  focused?: boolean;
  /** Show filter status bar */
  showFilterBar?: boolean;
  /** Show help hints */
  showHelp?: boolean;
  /** Called when filter changes */
  onFilterChange?: (enabledLevels: LogLevel[]) => void;
  /** Called when auto-scroll changes */
  onAutoScrollChange?: (enabled: boolean) => void;
}

export const Logs: React.FC<LogsProps> = ({
  id,
  entries,
  maxVisible = 20,
  enabledLevels: initialEnabledLevels = ['debug', 'info', 'warn', 'error'],
  autoScroll: initialAutoScroll = true,
  showTimestamps = true,
  timestampFormat = 'time',
  showLevelIcons = true,
  showSource = false,
  visible = true,
  focused = false,
  showFilterBar = true,
  showHelp = true,
  onFilterChange,
  onAutoScrollChange,
}) => {
  // State for filters
  const [enabledLevels, setEnabledLevels] = useState<LogLevel[]>(initialEnabledLevels);
  const [autoScroll, setAutoScroll] = useState(initialAutoScroll);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Track previous entry count for auto-scroll
  const prevEntryCountRef = useRef(entries.length);

  // Filter entries based on enabled levels
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => enabledLevels.includes(entry.level));
  }, [entries, enabledLevels]);

  // Calculate visible entries with scrolling
  const visibleEntries = useMemo(() => {
    const totalFiltered = filteredEntries.length;

    if (autoScroll) {
      // Auto-scroll: show last maxVisible entries
      const startIndex = Math.max(0, totalFiltered - maxVisible);
      return filteredEntries.slice(startIndex);
    } else {
      // Manual scroll: use scrollOffset
      const safeOffset = Math.min(scrollOffset, Math.max(0, totalFiltered - maxVisible));
      return filteredEntries.slice(safeOffset, safeOffset + maxVisible);
    }
  }, [filteredEntries, maxVisible, autoScroll, scrollOffset]);

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (autoScroll && entries.length > prevEntryCountRef.current) {
      setScrollOffset(Math.max(0, filteredEntries.length - maxVisible));
    }
    prevEntryCountRef.current = entries.length;
  }, [entries.length, autoScroll, filteredEntries.length, maxVisible]);

  // Toggle level filter
  const toggleLevel = (level: LogLevel) => {
    const newLevels = enabledLevels.includes(level)
      ? enabledLevels.filter((l) => l !== level)
      : [...enabledLevels, level];

    // Don't allow disabling all levels
    if (newLevels.length === 0) return;

    setEnabledLevels(newLevels);
    onFilterChange?.(newLevels);
    emitLogFilter(id, newLevels, level, enabledLevels.includes(level) ? 'disable' : 'enable');
  };

  // Reset filters
  const resetFilters = () => {
    const allLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    setEnabledLevels(allLevels);
    onFilterChange?.(allLevels);
    emitLogFilter(id, allLevels, undefined, 'reset');
  };

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused) return;

      // Toggle filters
      if (input === 'd') {
        toggleLevel('debug');
        return;
      }
      if (input === 'i') {
        toggleLevel('info');
        return;
      }
      if (input === 'w') {
        toggleLevel('warn');
        return;
      }
      if (input === 'e') {
        toggleLevel('error');
        return;
      }

      // Reset filters
      if (input === 'r') {
        resetFilters();
        return;
      }

      // Toggle auto-scroll
      if (input === 'a') {
        const newAutoScroll = !autoScroll;
        setAutoScroll(newAutoScroll);
        onAutoScrollChange?.(newAutoScroll);
        emitLogScroll(id, newAutoScroll, scrollOffset);
        return;
      }

      // Manual scroll (only when auto-scroll is off)
      if (!autoScroll) {
        if (key.upArrow || input === 'k') {
          const newOffset = Math.max(0, scrollOffset - 1);
          if (newOffset !== scrollOffset) {
            setScrollOffset(newOffset);
            emitLogScroll(id, autoScroll, newOffset);
          }
          return;
        }
        if (key.downArrow || input === 'j') {
          const maxOffset = Math.max(0, filteredEntries.length - maxVisible);
          const newOffset = Math.min(maxOffset, scrollOffset + 1);
          if (newOffset !== scrollOffset) {
            setScrollOffset(newOffset);
            emitLogScroll(id, autoScroll, newOffset);
          }
          return;
        }
        if (input === 'g') {
          // Jump to top
          setScrollOffset(0);
          emitLogScroll(id, autoScroll, 0);
          return;
        }
        if (input === 'G') {
          // Jump to bottom
          const maxOffset = Math.max(0, filteredEntries.length - maxVisible);
          setScrollOffset(maxOffset);
          emitLogScroll(id, autoScroll, maxOffset);
          return;
        }
        if (key.pageUp) {
          const newOffset = Math.max(0, scrollOffset - maxVisible);
          setScrollOffset(newOffset);
          emitLogScroll(id, autoScroll, newOffset);
          return;
        }
        if (key.pageDown) {
          const maxOffset = Math.max(0, filteredEntries.length - maxVisible);
          const newOffset = Math.min(maxOffset, scrollOffset + maxVisible);
          setScrollOffset(newOffset);
          emitLogScroll(id, autoScroll, newOffset);
          return;
        }
      }
    },
    { isActive: focused }
  );

  if (!visible) {
    return null;
  }

  // Render filter bar
  const renderFilterBar = () => {
    if (!showFilterBar) return null;

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    return (
      <Box marginBottom={1}>
        <Text dimColor>Filters: </Text>
        {levels.map((level, index) => {
          const isEnabled = enabledLevels.includes(level);
          const color = isEnabled ? LEVEL_COLORS[level] : 'gray';

          return (
            <Text key={level}>
              {index > 0 && <Text> </Text>}
              <Text color={color} dimColor={!isEnabled} bold={isEnabled}>
                [{level.charAt(0).toUpperCase()}]{level.slice(1)}
              </Text>
            </Text>
          );
        })}
        <Text dimColor> | Auto: </Text>
        <Text color={autoScroll ? 'green' : 'gray'}>{autoScroll ? 'ON' : 'OFF'}</Text>
        <Text dimColor> | {filteredEntries.length}/{entries.length} entries</Text>
      </Box>
    );
  };

  // Render a single log entry
  const renderEntry = (entry: LogEntry) => {
    const color = LEVEL_COLORS[entry.level];
    const icon = LEVEL_ICONS[entry.level];

    return (
      <Box key={entry.id}>
        {/* Timestamp */}
        {showTimestamps && (
          <Text dimColor>{formatTimestamp(entry.timestamp, timestampFormat)} </Text>
        )}

        {/* Level icon */}
        {showLevelIcons && (
          <Text color={color} bold>
            {icon}{' '}
          </Text>
        )}

        {/* Source */}
        {showSource && entry.source && (
          <Text color="magenta">[{entry.source}] </Text>
        )}

        {/* Message */}
        <Text color={entry.level === 'error' ? 'red' : undefined}>{entry.message}</Text>
      </Box>
    );
  };

  // Render scroll indicators
  const canScrollUp = !autoScroll && scrollOffset > 0;
  const canScrollDown = !autoScroll && scrollOffset < filteredEntries.length - maxVisible;

  return (
    <Box flexDirection="column">
      {/* Filter bar */}
      {renderFilterBar()}

      {/* Scroll up indicator */}
      {canScrollUp && (
        <Text dimColor>
          {'  '}
          {'▲'} {scrollOffset} more above
        </Text>
      )}

      {/* Log entries */}
      {visibleEntries.map(renderEntry)}

      {/* Scroll down indicator */}
      {canScrollDown && (
        <Text dimColor>
          {'  '}
          {'▼'} {filteredEntries.length - scrollOffset - maxVisible} more below
        </Text>
      )}

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <Text dimColor>No log entries{entries.length > 0 ? ' matching current filters' : ''}</Text>
      )}

      {/* Help hints */}
      {showHelp && focused && (
        <Box marginTop={1}>
          <Text dimColor>
            d/i/w/e: toggle filters | a: auto-scroll | r: reset | j/k: scroll | g/G: top/bottom
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple log viewer with default settings
 */
export interface SimpleLogsProps {
  id: string;
  entries: LogEntry[];
  maxVisible?: number;
  focused?: boolean;
}

export const SimpleLogs: React.FC<SimpleLogsProps> = ({
  id,
  entries,
  maxVisible = 10,
  focused = false,
}) => {
  return (
    <Logs
      id={id}
      entries={entries}
      maxVisible={maxVisible}
      focused={focused}
      showFilterBar={false}
      showHelp={false}
      showSource={false}
      timestampFormat="short"
    />
  );
};

/**
 * Log stream component - append-only with limited history
 */
export interface LogStreamProps {
  id: string;
  maxEntries?: number;
  showTimestamps?: boolean;
  focused?: boolean;
}

export const LogStream: React.FC<LogStreamProps> = ({
  id,
  maxEntries = 100,
  showTimestamps = true,
  focused = false,
}) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);

  // Expose append method through ref
  const append = (level: LogLevel, message: string, source?: string) => {
    const newEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
      source,
    };

    setEntries((prev) => {
      const updated = [...prev, newEntry];
      // Trim to maxEntries
      if (updated.length > maxEntries) {
        return updated.slice(-maxEntries);
      }
      return updated;
    });
  };

  // Helper methods for each level
  const debug = (message: string, source?: string) => append('debug', message, source);
  const info = (message: string, source?: string) => append('info', message, source);
  const warn = (message: string, source?: string) => append('warn', message, source);
  const error = (message: string, source?: string) => append('error', message, source);
  const clear = () => setEntries([]);

  // Store methods on component for external access
  (LogStream as unknown as { append: typeof append }).append = append;
  (LogStream as unknown as { debug: typeof debug }).debug = debug;
  (LogStream as unknown as { info: typeof info }).info = info;
  (LogStream as unknown as { warn: typeof warn }).warn = warn;
  (LogStream as unknown as { error: typeof error }).error = error;
  (LogStream as unknown as { clear: typeof clear }).clear = clear;

  return (
    <Logs
      id={id}
      entries={entries}
      maxVisible={20}
      autoScroll={true}
      showTimestamps={showTimestamps}
      focused={focused}
    />
  );
};

/**
 * Create log entries from string array (utility function)
 */
export function createLogEntries(
  messages: Array<{ level: LogLevel; message: string; source?: string }>,
  baseTimestamp?: Date
): LogEntry[] {
  const base = baseTimestamp || new Date();

  return messages.map((msg, index) => ({
    id: `log-${index}`,
    timestamp: new Date(base.getTime() + index * 1000),
    level: msg.level,
    message: msg.message,
    source: msg.source,
  }));
}
