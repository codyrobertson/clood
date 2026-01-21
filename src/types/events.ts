/**
 * Event Type Definitions
 *
 * Defines the JSON protocol event types that the UI receives
 * from Claude Code's event stream.
 */

import { z } from 'zod';

/** Message event - a conversation message */
export const MessageEventSchema = z.object({
  type: z.literal('message'),
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().optional(),
});

/** Streaming content event - partial message content */
export const StreamEventSchema = z.object({
  type: z.literal('stream'),
  messageId: z.string(),
  content: z.string(),
  done: z.boolean().optional(),
});

/** Task event - background task status update */
export const TaskEventSchema = z.object({
  type: z.literal('task'),
  id: z.string(),
  command: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'started', 'running', 'completed', 'failed', 'cancelled']),
  exitCode: z.number().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
});

/** Document event - request to open/display a document */
export const DocumentEventSchema = z.object({
  type: z.literal('document'),
  action: z.enum(['open', 'close', 'update']),
  path: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional(),
});

/** Tool call event - tool invocation by the assistant */
export const ToolCallEventSchema = z.object({
  type: z.literal('tool_call'),
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'running', 'completed', 'error']),
  result: z.string().optional(),
  error: z.string().optional(),
});

/** Notification event - UI notification */
export const NotificationEventSchema = z.object({
  type: z.literal('notify'),
  level: z.enum(['info', 'warning', 'error', 'success']).optional(),
  message: z.string(),
  duration: z.number().optional(),
});

/** Chart event - request to display a chart */
export const ChartEventSchema = z.object({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'line', 'scatter', 'sparkline']),
  title: z.string().optional(),
  data: z.array(z.number()),
  labels: z.array(z.string()).optional(),
  content: z.string().optional(), // Pre-rendered ASCII chart
});

/** Hook event - lifecycle hook trigger */
export const HookEventSchema = z.object({
  type: z.literal('hook'),
  hook: z.string(),
  data: z.record(z.unknown()).optional(),
});

/** Session event - session lifecycle */
export const SessionEventSchema = z.object({
  type: z.literal('session'),
  action: z.enum(['start', 'end', 'pause', 'resume']),
  sessionId: z.string().optional(),
});

/** Union of all event types */
export const EventSchema = z.discriminatedUnion('type', [
  MessageEventSchema,
  StreamEventSchema,
  TaskEventSchema,
  DocumentEventSchema,
  ToolCallEventSchema,
  NotificationEventSchema,
  ChartEventSchema,
  HookEventSchema,
  SessionEventSchema,
]);

/** TypeScript types derived from schemas */
export type MessageEvent = z.infer<typeof MessageEventSchema>;
export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type TaskEvent = z.infer<typeof TaskEventSchema>;
export type DocumentEvent = z.infer<typeof DocumentEventSchema>;
export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;
export type ChartEvent = z.infer<typeof ChartEventSchema>;
export type HookEvent = z.infer<typeof HookEventSchema>;
export type SessionEvent = z.infer<typeof SessionEventSchema>;
export type AppEvent = z.infer<typeof EventSchema>;

/** Unknown event for graceful handling */
export interface UnknownEvent {
  type: 'unknown';
  originalType: string;
  raw: unknown;
}
