/**
 * Event Stream Hook
 *
 * React hook that connects to Claude Code's event stream
 * and dispatches events to the application state.
 */

import { useEffect, useRef, useCallback } from 'react';
import { watch } from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { useStore } from '../store/index.js';
import {
  parseEvent,
  type ParsedEvent,
  isMessageEvent,
  isStreamEvent,
  isTaskEvent,
  isDocumentEvent,
  isToolCallEvent,
  isNotificationEvent,
  isUnknownEvent,
} from './EventStream.js';
import { generateId } from '../utils/formatting.js';
import type { TaskStatus } from '../types/index.js';

/**
 * Default session log path - follows Claude Code's conventions.
 */
function getDefaultSessionPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.claude', 'projects', 'session.jsonl');
}

/**
 * Hook to connect to and process the event stream.
 */
export function useEventStream(sessionPath?: string): void {
  const addMessage = useStore((s) => s.addMessage);
  const appendToMessage = useStore((s) => s.appendToMessage);
  const setStreamingMessage = useStore((s) => s.setStreamingMessage);
  const addTask = useStore((s) => s.addTask);
  const updateTaskStatus = useStore((s) => s.updateTaskStatus);
  const openDocument = useStore((s) => s.openDocument);
  const closeDocument = useStore((s) => s.closeDocument);
  const addNotification = useStore((s) => s.addNotification);
  const addDebugLog = useStore((s) => s.addDebugLog);
  const debug = useStore((s) => s.debug);

  // Track file position for tailing
  const filePositionRef = useRef<number>(0);
  const streamingMessageRef = useRef<string | null>(null);

  /**
   * Process a single parsed event and update state accordingly.
   */
  const handleEvent = useCallback(
    (event: ParsedEvent) => {
      if (debug) {
        addDebugLog(`Event: ${event.type}`);
      }

      // Handle message events
      if (isMessageEvent(event)) {
        const messageId = event.id || generateId();
        addMessage({
          id: messageId,
          role: event.role,
          content: event.content,
          timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
          isStreaming: false,
        });
        return;
      }

      // Handle streaming events
      if (isStreamEvent(event)) {
        if (event.done) {
          // Streaming complete
          setStreamingMessage(null);
          streamingMessageRef.current = null;
        } else {
          // If this is a new streaming message, create it
          if (streamingMessageRef.current !== event.messageId) {
            streamingMessageRef.current = event.messageId;
            addMessage({
              id: event.messageId,
              role: 'assistant',
              content: event.content,
              timestamp: new Date(),
              isStreaming: true,
            });
            setStreamingMessage(event.messageId);
          } else {
            // Append to existing message
            appendToMessage(event.messageId, event.content);
          }
        }
        return;
      }

      // Handle task events
      if (isTaskEvent(event)) {
        // Map task status
        const statusMap: Record<string, TaskStatus> = {
          pending: 'pending',
          started: 'running',
          running: 'running',
          completed: 'completed',
          failed: 'failed',
          cancelled: 'cancelled',
        };
        const status = statusMap[event.status] || 'pending';

        if (event.status === 'started' || event.status === 'pending') {
          // New task
          addTask({
            id: event.id,
            command: event.command || 'Unknown command',
            description: event.description,
            status,
            startedAt: new Date(),
          });
        } else {
          // Update existing task
          updateTaskStatus(event.id, status, event.exitCode);
        }
        return;
      }

      // Handle document events
      if (isDocumentEvent(event)) {
        if (event.action === 'open' && event.content) {
          openDocument({
            path: event.path || 'untitled',
            title: event.title || event.path || 'Document',
            content: event.content,
            language: event.language,
            lineCount: event.content.split('\n').length,
          });
        } else if (event.action === 'close') {
          closeDocument();
        }
        return;
      }

      // Handle tool call events
      if (isToolCallEvent(event)) {
        // Tool calls are associated with messages - could enhance message display
        if (debug) {
          addDebugLog(`Tool: ${event.name} (${event.status})`);
        }
        return;
      }

      // Handle notification events
      if (isNotificationEvent(event)) {
        addNotification({
          level: event.level || 'info',
          message: event.message,
        });
        return;
      }

      // Handle unknown events
      if (isUnknownEvent(event)) {
        if (debug) {
          addDebugLog(`Unknown event type: ${event.originalType}`);
        }
        return;
      }
    },
    [
      addMessage,
      appendToMessage,
      setStreamingMessage,
      addTask,
      updateTaskStatus,
      openDocument,
      closeDocument,
      addNotification,
      addDebugLog,
      debug,
    ]
  );

  /**
   * Read new lines from the session file.
   */
  const readNewLines = useCallback(
    (filePath: string) => {
      try {
        const stats = fs.statSync(filePath);
        const currentSize = stats.size;

        if (currentSize <= filePositionRef.current) {
          // File was truncated or no new data
          if (currentSize < filePositionRef.current) {
            filePositionRef.current = 0;
          }
          return;
        }

        // Read new content
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(currentSize - filePositionRef.current);
        fs.readSync(fd, buffer, 0, buffer.length, filePositionRef.current);
        fs.closeSync(fd);

        filePositionRef.current = currentSize;

        // Process each line
        const content = buffer.toString('utf-8');
        for (const line of content.split('\n')) {
          const event = parseEvent(line);
          if (event) {
            handleEvent(event);
          }
        }
      } catch (error) {
        if (debug) {
          addDebugLog(`Error reading file: ${error}`);
        }
      }
    },
    [handleEvent, debug, addDebugLog]
  );

  /**
   * Set up file watching.
   */
  useEffect(() => {
    const filePath = sessionPath || getDefaultSessionPath();

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      if (debug) {
        addDebugLog(`Session file not found: ${filePath}`);
      }
      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return;
    }

    // Initial read
    readNewLines(filePath);

    // Watch for changes
    const watcher = watch(filePath, {
      persistent: true,
      usePolling: false,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('change', () => {
      readNewLines(filePath);
    });

    watcher.on('error', (error) => {
      if (debug) {
        addDebugLog(`Watcher error: ${error}`);
      }
    });

    return () => {
      watcher.close();
    };
  }, [sessionPath, readNewLines, debug, addDebugLog]);
}
