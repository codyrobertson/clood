/**
 * Core Type Definitions
 *
 * Defines the core types used throughout the Clood TUI application.
 * These types align with Claude Code's JSON protocol for UI updates.
 */

/** Message roles in the conversation */
export type MessageRole = 'user' | 'assistant' | 'system';

/** A single message in the conversation */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  metadata?: MessageMetadata;
}

/** Additional metadata for messages */
export interface MessageMetadata {
  /** Whether this message contains code */
  hasCode?: boolean;
  /** Whether this message contains an ASCII diagram */
  hasDiagram?: boolean;
  /** Tool invocations in this message */
  toolCalls?: ToolCall[];
}

/** A tool/function call made by the assistant */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

/** Task status values */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** A background task being managed */
export interface Task {
  id: string;
  command: string;
  description?: string;
  status: TaskStatus;
  startedAt: Date;
  completedAt?: Date;
  exitCode?: number;
  output?: string;
  error?: string;
}

/** Document being viewed */
export interface Document {
  path: string;
  title: string;
  content: string;
  language?: string;
  lineCount: number;
}

/** UI Panel types */
export type PanelType = 'conversation' | 'document' | 'tasks' | 'chart';

/** Current UI view mode */
export type ViewMode = 'normal' | 'document' | 'fullscreen-tasks';

/** Application configuration */
export interface AppConfig {
  /** Show tasks panel by default */
  showTasksPanel: boolean;
  /** Enable ASCII diagram detection */
  enableDiagramDetection: boolean;
  /** Auto-scroll to latest message */
  autoScroll: boolean;
  /** Number of messages to keep in memory */
  maxMessagesInMemory: number;
  /** Theme colors */
  theme: ThemeConfig;
}

/** Theme configuration */
export interface ThemeConfig {
  userMessageColor: string;
  assistantMessageColor: string;
  systemMessageColor: string;
  errorColor: string;
  successColor: string;
  warningColor: string;
  accentColor: string;
}

/** Default theme configuration */
export const DEFAULT_THEME: ThemeConfig = {
  userMessageColor: 'cyan',
  assistantMessageColor: 'green',
  systemMessageColor: 'gray',
  errorColor: 'red',
  successColor: 'green',
  warningColor: 'yellow',
  accentColor: 'blue',
};

/** Default application configuration */
export const DEFAULT_CONFIG: AppConfig = {
  showTasksPanel: true,
  enableDiagramDetection: true,
  autoScroll: true,
  maxMessagesInMemory: 500,
  theme: DEFAULT_THEME,
};
