/**
 * Store Tests
 *
 * Tests for the Zustand state management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './index.js';

describe('Store', () => {
  // Reset store before each test
  beforeEach(() => {
    useStore.setState({
      messages: [],
      streamingMessageId: null,
      tasks: [],
      currentDocument: null,
      viewMode: 'normal',
      showTasksPanel: true,
      conversationScrollOffset: 0,
      documentScrollOffset: 0,
      notifications: [],
      debug: false,
      debugLogs: [],
    });
  });

  describe('Message actions', () => {
    it('should add a message', () => {
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello!',
        timestamp: new Date(),
      };

      useStore.getState().addMessage(message);

      expect(useStore.getState().messages).toHaveLength(1);
      expect(useStore.getState().messages[0]).toEqual(message);
    });

    it('should update a message', () => {
      const message = {
        id: 'msg-1',
        role: 'assistant' as const,
        content: 'Initial',
        timestamp: new Date(),
      };

      useStore.getState().addMessage(message);
      useStore.getState().updateMessage('msg-1', { content: 'Updated' });

      expect(useStore.getState().messages[0]?.content).toBe('Updated');
    });

    it('should append to a message', () => {
      const message = {
        id: 'msg-1',
        role: 'assistant' as const,
        content: 'Hello',
        timestamp: new Date(),
      };

      useStore.getState().addMessage(message);
      useStore.getState().appendToMessage('msg-1', ' World!');

      expect(useStore.getState().messages[0]?.content).toBe('Hello World!');
    });

    it('should set streaming message', () => {
      useStore.getState().setStreamingMessage('msg-1');
      expect(useStore.getState().streamingMessageId).toBe('msg-1');

      useStore.getState().setStreamingMessage(null);
      expect(useStore.getState().streamingMessageId).toBeNull();
    });

    it('should clear messages', () => {
      useStore.getState().addMessage({
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: new Date(),
      });
      useStore.getState().setStreamingMessage('msg-1');

      useStore.getState().clearMessages();

      expect(useStore.getState().messages).toHaveLength(0);
      expect(useStore.getState().streamingMessageId).toBeNull();
    });

    it('should trim messages when exceeding max', () => {
      // Set low max for testing
      useStore.getState().updateConfig({ maxMessagesInMemory: 3 });

      for (let i = 0; i < 5; i++) {
        useStore.getState().addMessage({
          id: `msg-${i}`,
          role: 'user' as const,
          content: `Message ${i}`,
          timestamp: new Date(),
        });
      }

      expect(useStore.getState().messages).toHaveLength(3);
      expect(useStore.getState().messages[0]?.id).toBe('msg-2');
      expect(useStore.getState().messages[2]?.id).toBe('msg-4');
    });
  });

  describe('Task actions', () => {
    it('should add a task', () => {
      const task = {
        id: 'task-1',
        command: 'npm test',
        status: 'running' as const,
        startedAt: new Date(),
      };

      useStore.getState().addTask(task);

      expect(useStore.getState().tasks).toHaveLength(1);
      expect(useStore.getState().tasks[0]).toEqual(task);
    });

    it('should update task status', () => {
      useStore.getState().addTask({
        id: 'task-1',
        command: 'npm test',
        status: 'running' as const,
        startedAt: new Date(),
      });

      useStore.getState().updateTaskStatus('task-1', 'completed', 0);

      const task = useStore.getState().tasks[0];
      expect(task?.status).toBe('completed');
      expect(task?.exitCode).toBe(0);
      expect(task?.completedAt).toBeDefined();
    });

    it('should remove a task', () => {
      useStore.getState().addTask({
        id: 'task-1',
        command: 'npm test',
        status: 'completed' as const,
        startedAt: new Date(),
      });

      useStore.getState().removeTask('task-1');

      expect(useStore.getState().tasks).toHaveLength(0);
    });

    it('should clear completed tasks', () => {
      useStore.getState().addTask({
        id: 'task-1',
        command: 'npm test',
        status: 'completed' as const,
        startedAt: new Date(),
      });
      useStore.getState().addTask({
        id: 'task-2',
        command: 'npm build',
        status: 'running' as const,
        startedAt: new Date(),
      });

      useStore.getState().clearCompletedTasks();

      expect(useStore.getState().tasks).toHaveLength(1);
      expect(useStore.getState().tasks[0]?.id).toBe('task-2');
    });
  });

  describe('Document actions', () => {
    it('should open a document', () => {
      const doc = {
        path: '/path/to/file.md',
        title: 'README',
        content: '# Hello',
        lineCount: 1,
      };

      useStore.getState().openDocument(doc);

      expect(useStore.getState().currentDocument).toEqual(doc);
      expect(useStore.getState().viewMode).toBe('document');
      expect(useStore.getState().documentScrollOffset).toBe(0);
    });

    it('should close a document', () => {
      useStore.getState().openDocument({
        path: '/path/to/file.md',
        title: 'README',
        content: '# Hello',
        lineCount: 1,
      });

      useStore.getState().closeDocument();

      expect(useStore.getState().currentDocument).toBeNull();
      expect(useStore.getState().viewMode).toBe('normal');
    });

    it('should update document content', () => {
      useStore.getState().openDocument({
        path: '/path/to/file.md',
        title: 'README',
        content: '# Hello',
        lineCount: 1,
      });

      useStore.getState().updateDocumentContent('# Hello\n## World');

      expect(useStore.getState().currentDocument?.content).toBe('# Hello\n## World');
      expect(useStore.getState().currentDocument?.lineCount).toBe(2);
    });
  });

  describe('UI actions', () => {
    it('should set view mode', () => {
      useStore.getState().setViewMode('document');
      expect(useStore.getState().viewMode).toBe('document');

      useStore.getState().setViewMode('normal');
      expect(useStore.getState().viewMode).toBe('normal');
    });

    it('should toggle tasks panel', () => {
      expect(useStore.getState().showTasksPanel).toBe(true);

      useStore.getState().toggleTasksPanel();
      expect(useStore.getState().showTasksPanel).toBe(false);

      useStore.getState().toggleTasksPanel();
      expect(useStore.getState().showTasksPanel).toBe(true);
    });

    it('should set conversation scroll', () => {
      useStore.getState().setConversationScroll(10);
      expect(useStore.getState().conversationScrollOffset).toBe(10);
    });

    it('should set document scroll', () => {
      useStore.getState().setDocumentScroll(20);
      expect(useStore.getState().documentScrollOffset).toBe(20);
    });
  });

  describe('Notification actions', () => {
    it('should add a notification', () => {
      useStore.getState().addNotification({
        level: 'info',
        message: 'Test notification',
      });

      expect(useStore.getState().notifications).toHaveLength(1);
      expect(useStore.getState().notifications[0]?.message).toBe('Test notification');
      expect(useStore.getState().notifications[0]?.id).toBeDefined();
      expect(useStore.getState().notifications[0]?.timestamp).toBeDefined();
    });

    it('should remove a notification', () => {
      useStore.getState().addNotification({
        level: 'info',
        message: 'Test',
      });

      const id = useStore.getState().notifications[0]?.id;
      useStore.getState().removeNotification(id!);

      expect(useStore.getState().notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      useStore.getState().addNotification({ level: 'info', message: 'Test 1' });
      useStore.getState().addNotification({ level: 'warning', message: 'Test 2' });

      useStore.getState().clearNotifications();

      expect(useStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('Debug actions', () => {
    it('should set debug mode', () => {
      useStore.getState().setDebug(true);
      expect(useStore.getState().debug).toBe(true);

      useStore.getState().setDebug(false);
      expect(useStore.getState().debug).toBe(false);
    });

    it('should add debug logs', () => {
      useStore.getState().addDebugLog('Test log 1');
      useStore.getState().addDebugLog('Test log 2');

      expect(useStore.getState().debugLogs).toHaveLength(2);
      expect(useStore.getState().debugLogs[0]).toContain('Test log 1');
    });

    it('should trim debug logs to last 100', () => {
      for (let i = 0; i < 150; i++) {
        useStore.getState().addDebugLog(`Log ${i}`);
      }

      expect(useStore.getState().debugLogs).toHaveLength(100);
    });

    it('should clear debug logs', () => {
      useStore.getState().addDebugLog('Test');
      useStore.getState().clearDebugLogs();

      expect(useStore.getState().debugLogs).toHaveLength(0);
    });
  });
});
