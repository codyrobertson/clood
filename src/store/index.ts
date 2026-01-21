/**
 * Global State Management
 *
 * Uses Zustand for lightweight state management across the TUI.
 * This store holds all application state including messages, tasks,
 * documents, and UI state.
 */

import { create } from 'zustand';
import type {
  Message,
  Task,
  Document,
  ViewMode,
  AppConfig,
  TaskStatus,
} from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

/** Notification to display */
export interface Notification {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: Date;
}

/** Application state */
export interface AppState {
  // Conversation state
  messages: Message[];
  streamingMessageId: string | null;

  // Tasks state
  tasks: Task[];

  // Document state
  currentDocument: Document | null;

  // UI state
  viewMode: ViewMode;
  showTasksPanel: boolean;
  conversationScrollOffset: number;
  documentScrollOffset: number;
  notifications: Notification[];

  // Configuration
  config: AppConfig;

  // Debug mode
  debug: boolean;
  debugLogs: string[];

  // Actions - Messages
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  appendToMessage: (id: string, content: string) => void;
  setStreamingMessage: (id: string | null) => void;
  clearMessages: () => void;

  // Actions - Tasks
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: TaskStatus, exitCode?: number) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;

  // Actions - Document
  openDocument: (doc: Document) => void;
  closeDocument: () => void;
  updateDocumentContent: (content: string) => void;

  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  toggleTasksPanel: () => void;
  setConversationScroll: (offset: number) => void;
  setDocumentScroll: (offset: number) => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Config
  updateConfig: (updates: Partial<AppConfig>) => void;

  // Actions - Debug
  setDebug: (enabled: boolean) => void;
  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;
}

/** Generate unique IDs */
let idCounter = 0;
const generateId = (): string => `${Date.now()}-${++idCounter}`;

/** Create the Zustand store */
export const useStore = create<AppState>((set) => ({
  // Initial state
  messages: [],
  streamingMessageId: null,
  tasks: [],
  currentDocument: null,
  viewMode: 'normal',
  showTasksPanel: true,
  conversationScrollOffset: 0,
  documentScrollOffset: 0,
  notifications: [],
  config: DEFAULT_CONFIG,
  debug: false,
  debugLogs: [],

  // Message actions
  addMessage: (message) =>
    set((state) => {
      const messages = [...state.messages, message];
      // Trim messages if exceeding max
      if (messages.length > state.config.maxMessagesInMemory) {
        messages.splice(0, messages.length - state.config.maxMessagesInMemory);
      }
      return { messages };
    }),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  appendToMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content: msg.content + content } : msg
      ),
    })),

  setStreamingMessage: (id) => set({ streamingMessageId: id }),

  clearMessages: () => set({ messages: [], streamingMessageId: null }),

  // Task actions
  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),

  updateTaskStatus: (id, status, exitCode) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              exitCode,
              completedAt:
                status === 'completed' || status === 'failed' || status === 'cancelled'
                  ? new Date()
                  : task.completedAt,
            }
          : task
      ),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  clearCompletedTasks: () =>
    set((state) => ({
      tasks: state.tasks.filter(
        (task) => task.status !== 'completed' && task.status !== 'failed'
      ),
    })),

  // Document actions
  openDocument: (doc) =>
    set({
      currentDocument: doc,
      viewMode: 'document',
      documentScrollOffset: 0,
    }),

  closeDocument: () =>
    set({
      currentDocument: null,
      viewMode: 'normal',
      documentScrollOffset: 0,
    }),

  updateDocumentContent: (content) =>
    set((state) => ({
      currentDocument: state.currentDocument
        ? {
            ...state.currentDocument,
            content,
            lineCount: content.split('\n').length,
          }
        : null,
    })),

  // UI actions
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleTasksPanel: () =>
    set((state) => ({ showTasksPanel: !state.showTasksPanel })),

  setConversationScroll: (offset) => set({ conversationScrollOffset: offset }),

  setDocumentScroll: (offset) => set({ documentScrollOffset: offset }),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          ...notification,
          id: generateId(),
          timestamp: new Date(),
        },
      ],
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),

  // Config actions
  updateConfig: (updates) =>
    set((state) => ({
      config: { ...state.config, ...updates },
    })),

  // Debug actions
  setDebug: (enabled) => set({ debug: enabled }),

  addDebugLog: (log) =>
    set((state) => ({
      debugLogs: [...state.debugLogs.slice(-99), `[${new Date().toISOString()}] ${log}`],
    })),

  clearDebugLogs: () => set({ debugLogs: [] }),
}));

/** Helper hook to get message by ID */
export const useMessage = (id: string): Message | undefined => {
  return useStore((state) => state.messages.find((m) => m.id === id));
};

/** Helper hook to get running tasks */
export const useRunningTasks = (): Task[] => {
  return useStore((state) =>
    state.tasks.filter((t) => t.status === 'running' || t.status === 'pending')
  );
};

/** Helper hook to check if in document view */
export const useIsDocumentView = (): boolean => {
  return useStore((state) => state.viewMode === 'document');
};
