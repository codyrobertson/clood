# ADR-0001: JSON Event → Reducer → Ink Render Architecture

## Status

Accepted

## Context

We need to build a dynamic terminal user interface (TUI) for Claude Code that can:

1. Display real-time conversation streams
2. Show background task status
3. Render documents and diagrams
4. Handle user input and keyboard navigation
5. Scale to long sessions with many messages

The UI must be driven by a JSON event stream (JSONL format) that Claude Code emits, rather than being tightly coupled to Claude's internal state.

## Decision

We adopt a **unidirectional data flow architecture** inspired by Redux/Flux patterns:

```
┌─────────────────┐
│   Event Stream  │
│    (JSONL)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   JSON Parser   │
│  + Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Event Bus     │
│  (Dispatch)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Reducers     │
│  (Pure Funcs)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   App State     │
│   (Zustand)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ink Renderer   │
│  (React TUI)    │
└─────────────────┘
```

### Key Components

1. **Event Stream Reader**
   - Reads JSONL from stdin, file tail, or WebSocket
   - Handles line-by-line parsing
   - Supports multiple input sources

2. **JSON Parser + Validator**
   - Parses JSON with error recovery (invalid lines → error events)
   - Validates against Zod schemas
   - Produces typed events

3. **Event Bus**
   - Dispatches events to registered handlers
   - Supports subscribe/unsubscribe
   - Provides backpressure control

4. **Reducers**
   - Pure functions: (state, event) → newState
   - Exhaustive handling of event types
   - Immutable state updates

5. **App State (Zustand)**
   - Single source of truth
   - Typed state slices (messages, tasks, documents, UI)
   - React hooks for component subscriptions

6. **Ink Renderer**
   - React-based terminal rendering
   - Flexbox layout via Yoga
   - Component composition

### Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| UI Framework | Ink (React for CLI) | React paradigm, good ecosystem |
| State Management | Zustand | Lightweight, React hooks, good DX |
| Schema Validation | Zod | TypeScript-first, good inference |
| Layout Engine | Yoga (via Ink) | Flexbox model, well-tested |
| File Watching | Chokidar | Cross-platform, efficient |

## Constraints

1. **No direct Claude Code coupling** - UI only reads events, never writes to Claude internals
2. **Graceful degradation** - Invalid events should not crash the UI
3. **Memory bounded** - Message list trimmed to configurable max
4. **Single-threaded rendering** - All rendering on main thread
5. **Terminal-first** - No graphics/images (ASCII only)

## Non-Goals

1. **GUI/Electron wrapper** - Terminal only
2. **Real-time collaboration** - Single user
3. **Plugin system** - Fixed component set (for now)
4. **Image rendering** - ASCII art only
5. **Sixel/Kitty graphics** - Not in initial scope

## Consequences

### Positive

- **Testable** - Pure reducers easy to unit test
- **Debuggable** - State snapshots, event replay
- **Extensible** - New event types easy to add
- **Decoupled** - UI independent of Claude internals
- **Performant** - Efficient React reconciliation

### Negative

- **Learning curve** - React/hooks paradigm required
- **Overhead** - JSON parsing on every event
- **Memory** - State duplication (event + derived state)

### Mitigations

- Comprehensive documentation and examples
- Schema-based code generation where possible
- Memory-efficient state management (trimming, lazy loading)

## References

- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zod Documentation](https://zod.dev)
- [Redux Architecture](https://redux.js.org/tutorials/fundamentals/part-2-concepts-data-flow)
