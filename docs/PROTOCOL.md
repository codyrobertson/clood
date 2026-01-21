# Claude Code TUI - Protocol Surface

This document defines all supported inbound event types and outbound UI events for the Claude Code Dynamic Terminal UI.

## Overview

The TUI communicates via JSON Lines (JSONL) format:
- **Inbound**: Events received from Claude Code
- **Outbound**: Events emitted by the UI (future)

## Inbound Event Types

### Session Events

Control session lifecycle.

```typescript
interface SessionEvent {
  type: 'session';
  action: 'start' | 'end' | 'pause' | 'resume';
  sessionId?: string;
}
```

### Message Events

Conversation messages from user or assistant.

```typescript
interface MessageEvent {
  type: 'message';
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string; // ISO 8601
}
```

### Stream Events

Partial content for streaming responses.

```typescript
interface StreamEvent {
  type: 'stream';
  messageId: string;
  content: string;
  done?: boolean;
}
```

### Task Events

Background task status updates.

```typescript
interface TaskEvent {
  type: 'task';
  id: string;
  command?: string;
  description?: string;
  status: 'pending' | 'started' | 'running' | 'completed' | 'failed' | 'cancelled';
  exitCode?: number;
  output?: string;
  error?: string;
}
```

### Document Events

Document viewing requests.

```typescript
interface DocumentEvent {
  type: 'document';
  action: 'open' | 'close' | 'update';
  path?: string;
  title?: string;
  content?: string;
  language?: string;
}
```

### Tool Call Events

Tool invocations by the assistant.

```typescript
interface ToolCallEvent {
  type: 'tool_call';
  id: string;
  name: string;
  arguments?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: string;
  error?: string;
}
```

### Notification Events

User-facing notifications.

```typescript
interface NotificationEvent {
  type: 'notify';
  level?: 'info' | 'warning' | 'error' | 'success';
  message: string;
  duration?: number; // ms
}
```

### Chart Events

ASCII chart rendering requests.

```typescript
interface ChartEvent {
  type: 'chart';
  chartType: 'bar' | 'line' | 'scatter' | 'sparkline';
  title?: string;
  data: number[];
  labels?: string[];
  content?: string; // Pre-rendered ASCII
}
```

### Hook Events

Lifecycle hook triggers.

```typescript
interface HookEvent {
  type: 'hook';
  hook: string;
  data?: Record<string, unknown>;
}
```

## Outbound Event Types (Future)

These events will be emitted by the UI for bidirectional communication.

### UI Event Envelope

```typescript
interface UIEvent {
  type: 'ui_event';
  eventType: string;
  timestamp: string;
  componentId?: string;
  payload: unknown;
}
```

### Button Click

```typescript
interface ButtonClickEvent {
  type: 'ui_event';
  eventType: 'button.click';
  componentId: string;
  payload: {
    buttonId: string;
    shortcut?: string;
  };
}
```

### List Selection

```typescript
interface ListSelectEvent {
  type: 'ui_event';
  eventType: 'list.select';
  componentId: string;
  payload: {
    selectedIndex: number;
    selectedValue: unknown;
    multi?: boolean;
  };
}
```

### Task Control

```typescript
interface TaskControlEvent {
  type: 'ui_event';
  eventType: 'task.cancel';
  payload: {
    taskId: string;
  };
}
```

### Document Navigation

```typescript
interface DocumentNavEvent {
  type: 'ui_event';
  eventType: 'document.navigate';
  payload: {
    action: 'scroll' | 'close';
    offset?: number;
  };
}
```

## Event Flow Examples

### Simple Chat Flow

```jsonl
{"type":"session","action":"start","sessionId":"abc123"}
{"type":"message","role":"user","content":"Hello!"}
{"type":"stream","messageId":"msg1","content":"Hi there!","done":false}
{"type":"stream","messageId":"msg1","content":" How can I help?","done":true}
{"type":"message","id":"msg1","role":"assistant","content":"Hi there! How can I help?"}
```

### Task Monitoring Flow

```jsonl
{"type":"task","id":"t1","command":"npm test","status":"started"}
{"type":"task","id":"t1","status":"running","output":"Running 10 tests..."}
{"type":"task","id":"t1","status":"completed","exitCode":0}
{"type":"notify","level":"success","message":"Tests passed!"}
```

### Document Viewing Flow

```jsonl
{"type":"document","action":"open","path":"README.md","content":"# Title\n..."}
{"type":"document","action":"close"}
```

## Validation

All events are validated using Zod schemas at runtime. Invalid events:
1. Are logged for debugging
2. Generate an internal error event
3. Do not crash the application
4. May trigger a notification (configurable)

## Versioning

Event schema versions are tracked in `src/protocol/schema/` directory.
Breaking changes require a major version bump of the protocol.

Current Version: **1.0.0**
