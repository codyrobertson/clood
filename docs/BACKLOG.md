# Claude Code Dynamic TUI - Product Backlog

**Version:** 1.0.0
**Last Updated:** 2026-01-21
**Status:** Active Development

## Overview

This document serves as the authoritative reference for the Claude Code Dynamic Terminal UI implementation. It follows PRD-style Agile backlog with Epics → Stories → Atomic UOW (Unit of Work) tasks.

### Atomic UOW Definition

A Unit of Work is considered atomic when it:
- Has one clearly testable deliverable
- Has minimal scope with no hidden dependencies
- Produces a verifiable output (code + tests/docs/config)
- Can be merged independently

---

## EPIC 0 — Program Setup, Guardrails, and Definition of Done

### Story 0.1 — Backlog conventions and DoD

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0001 | Create CONTRIBUTING.md with atomic-UOW rules, branch naming, PR template, and DoD checklist | ✅ Complete |
| UOW-0002 | Create ADR-0001 "Architecture: JSON event → reducer → Ink render" with constraints and non-goals | ✅ Complete |
| UOW-0003 | Create "Protocol surface" doc listing all supported inbound event types and outbound UI events | ✅ Complete |

### Story 0.2 — Repo scaffolding

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0004 | Initialize TypeScript project structure (src/core, src/ui, src/protocol, src/bin) with tsconfig + path aliases | ✅ Complete |
| UOW-0005 | Add eslint + prettier + lint-staged + husky pre-commit hooks | ✅ Complete |
| UOW-0006 | Add vitest/jest test runner and base config | ✅ Complete |
| UOW-0007 | Add CI workflow: install, lint, typecheck, test on Node 18+ | Pending |
| UOW-0008 | Add "demo harness" script that replays a fixture JSONL into stdin | ✅ Complete |

---

## EPIC 1 — Event Stream Ingestion (JSONL)

### Story 1.1 — Input sources

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0101 | Implement stdin JSONL reader (line-delimited) emitting raw strings | ✅ Complete |
| UOW-0102 | Implement file-tail JSONL reader with rotation handling | ✅ Complete |
| UOW-0103 | Implement "replay fixture" reader with deterministic timing controls | ✅ Complete |

### Story 1.2 — Parsing + validation

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0104 | Implement strict JSON parse with error capture (invalid line → error event, no crash) | ✅ Complete |
| UOW-0105 | Define TypeScript discriminated union for core event envelope | ✅ Complete |
| UOW-0106 | Add schema validation with Zod for envelope + known event types | ✅ Complete |
| UOW-0107 | Add unit tests for parser: valid/invalid JSON lines, partial lines, huge lines | ✅ Complete |

### Story 1.3 — Dispatch + backpressure

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0108 | Implement EventBus with subscribe/unsubscribe, typed handlers | ✅ Complete |
| UOW-0109 | Add buffering/backpressure: max queue size + drop policy configurable | Pending |
| UOW-0110 | Add metrics counters: lines read, parse errors, dropped events | Pending |
| UOW-0111 | Add integration test: replay fixture → handlers receive ordered events | Pending |

---

## EPIC 2 — App State Model (Reducers, Versioning, Patch)

### Story 2.1 — Canonical state

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0201 | Define AppState interface (conversation, documents, tasks, uiMode, focus, errors, metrics) | ✅ Complete |
| UOW-0202 | Implement root reducer with pure functions and exhaustive switch on event types | ✅ Complete |
| UOW-0203 | Add "state snapshot" serializer for debugging (redact large payloads) | Pending |
| UOW-0204 | Add reducer tests: each event type → expected state change | ✅ Complete |

### Story 2.2 — UI layout spec + JSON Patch

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0205 | Add UILayout schema v1.0 file (JSON Schema) under src/protocol/schema | Pending |
| UOW-0206 | Implement layout validator helper (validateLayout(layout) → ok/errors) | Pending |
| UOW-0207 | Implement RFC6902 patch apply with sequence/version checks | Pending |
| UOW-0208 | Add tests: patch apply add/replace/remove, conflict detection | Pending |

### Story 2.3 — Component state registry

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0209 | Implement componentStates map with typed per-component slices | ✅ Complete |
| UOW-0210 | Implement focus manager (focusedComponent id, focus trap for modals) | Partial |
| UOW-0211 | Add tests for focus transitions and modal focus trapping state | Pending |

---

## EPIC 3 — Rendering Core (Ink Host + Layout Engine)

### Story 3.1 — Ink host + app shell

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0301 | Create Ink renderer entrypoint (AppShell) with top-level regions | ✅ Complete |
| UOW-0302 | Implement hotkey registry (global keys: q quit, ? help, tab focus cycle) | ✅ Complete |
| UOW-0303 | Add "status bar" component stub (session, mode, hints) | ✅ Complete |
| UOW-0304 | Add snapshot test: AppShell renders with empty state | Pending |

### Story 3.2 — Incremental rendering + perf knobs

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0305 | Implement render throttling for streaming updates (configurable 16–33ms) | Pending |
| UOW-0306 | Implement batching: coalesce multiple events into one state update tick | Pending |
| UOW-0307 | Add config for maxFrameRate and incrementalRendering flags | Pending |
| UOW-0308 | Add perf test: replay 10k events → renderer remains responsive | Pending |

---

## EPIC 4 — Conversation View (Chat UX)

### Story 4.1 — Message model

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0401 | Define Message model (id, role, content, streaming, createdAt, metadata) | ✅ Complete |
| UOW-0402 | Implement append message event handler (user/assistant) | ✅ Complete |
| UOW-0403 | Implement streaming token update handler | ✅ Complete |
| UOW-0404 | Tests: message append order, streaming merges correctly | ✅ Complete |

### Story 4.2 — Conversation rendering

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0405 | Implement ChatMessage component with role styling and borders | ✅ Complete |
| UOW-0406 | Implement ConversationPanel with Static for completed messages | ✅ Complete |
| UOW-0407 | Implement scrollback for conversation (manual scroll mode + auto-follow) | ✅ Complete |
| UOW-0408 | Add tests: scroll logic (auto-follow on new msg unless manual) | Pending |

### Story 4.3 — Markdown/code fidelity

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0409 | Integrate ink-markdown (or marked-terminal wrapper) behind a renderer interface | Pending |
| UOW-0410 | Implement code block rendering with no wrapping and preserved whitespace | Pending |
| UOW-0411 | Implement "wide content" detection (ASCII diagrams) → disable wrap | ✅ Complete |
| UOW-0412 | Tests: markdown rendering baseline, code block preservation | Pending |

### Story 4.4 — Slash commands UX

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0413 | Render slash command hints (known commands list) in help modal | ✅ Complete |
| UOW-0414 | Implement /history view as document panel rendering transcript | Pending |

---

## EPIC 5 — Document Viewer (Files, Markdown, PDF text)

### Story 5.1 — Viewer core

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0501 | Implement DocumentPanel with header, scroll, and close keybinding | ✅ Complete |
| UOW-0502 | Add state: currentDocument {path, title, content, kind} | ✅ Complete |
| UOW-0503 | Add routing: openDocument event toggles UI mode to document | ✅ Complete |
| UOW-0504 | Tests: open/close transitions, scroll bounds, focus isolation | Pending |

### Story 5.2 — File type rendering adapters

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0505 | Implement renderer adapter interface (render(kind, content) → lines) | Pending |
| UOW-0506 | Markdown adapter using ink-markdown | Pending |
| UOW-0507 | Plaintext/code adapter with optional syntax highlighting flag | Pending |
| UOW-0508 | Tests: adapter selection matrix by file extension/kind | Pending |

### Story 5.3 — PDF text fallback path

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0509 | Implement external command runner wrapper (safe exec) for pdftotext | Pending |
| UOW-0510 | Implement PDF-to-text pipeline | Pending |
| UOW-0511 | Add "PDF unsupported" message when tool missing | Pending |
| UOW-0512 | Integration test: mock pdftotext output → DocumentPanel renders | Pending |

---

## EPIC 6 — Tasks Panel (Background task monitoring)

### Story 6.1 — Task model + reducer

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0601 | Define Task model (id, title, command, status, start, end, exitCode) | ✅ Complete |
| UOW-0602 | Reducer: task.start, task.update, task.complete, task.fail | ✅ Complete |
| UOW-0603 | Tests: status transitions, multiple tasks, out-of-order updates | ✅ Complete |

### Story 6.2 — Panel UI

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0604 | Implement TasksPanel list with statuses + timestamps | ✅ Complete |
| UOW-0605 | Implement toggle keybinding (t) + responsive layout | ✅ Complete |
| UOW-0606 | Implement task selection navigation (up/down) within panel | ✅ Complete |
| UOW-0607 | Tests: toggle behavior, selection boundaries, empty state | Pending |

### Story 6.3 — Optional control actions

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0608 | Implement "cancel task" UI action (k) emits event | Pending |
| UOW-0609 | Implement outbound event envelope for task control | Pending |
| UOW-0610 | Tests: correct event payload emitted on cancel | Pending |

---

## EPIC 7 — Diagrams + Charts (ASCII-first)

### Story 7.1 — ASCII diagrams

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0701 | Implement robust "diagram block" detection (box drawing + arrow density) | ✅ Complete |
| UOW-0702 | Add "open in viewer" action for diagram blocks (d) to DocumentPanel | Pending |
| UOW-0703 | Tests: detection false positives/negatives with fixtures | Pending |

### Story 7.2 — Charts integration (ASCII)

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0704 | Define chart event type (chart.render) with title + ascii payload | ✅ Complete |
| UOW-0705 | Render chart blocks with no wrap + optional color passthrough | Pending |
| UOW-0706 | Add fixture + integration test rendering bar/line charts | Pending |

---

## EPIC 8 — Declarative UI Spec Rendering (Component Catalog)

### Story 8.1 — Base component system

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0801 | Implement UIComponent registry keyed by type string | Pending |
| UOW-0802 | Implement Container rendering (direction, gap, border, children) | Pending |
| UOW-0803 | Implement Dimension + Spacing utilities | Pending |
| UOW-0804 | Tests: registry resolves component types; unknown → fallback | Pending |

### Story 8.2 — Implement core components

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0810 | TextBlock renderer (ANSI safe, unicode width aware) | Pending |
| UOW-0811 | ProgressBar renderer | ✅ Complete |
| UOW-0812 | ButtonRow renderer + shortcut legend | Pending |
| UOW-0813 | List renderer | Pending |
| UOW-0814 | Table renderer | Pending |
| UOW-0815 | Modal renderer (overlay, backdrop, focus trap) | ✅ Complete |
| UOW-0816 | SplitView renderer | Pending |
| UOW-0817 | Logs renderer | Pending |
| UOW-0818 | DiffView renderer (unified mode only) | Pending |
| UOW-0819 | FilePicker renderer | Pending |

### Story 8.3 — Interactivity + events

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0830 | ButtonRow: capture shortcut keys → emit button.click event | Pending |
| UOW-0831 | List: keyboard nav + select single → emit list.select | Pending |
| UOW-0832 | List: multi-select toggle → emit list.select | Pending |
| UOW-0833 | Table: row selection → emit table.select | Pending |
| UOW-0834 | Logs: level filter toggle UI → emit log.filter | Pending |
| UOW-0835 | Modal: escape close → emit modal.close | ✅ Complete |
| UOW-0836 | SplitView: resize handle (keyboard) → emit pane.resize | Pending |

### Story 8.4 — DiffView full feature

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0840 | Add split diff mode rendering | Pending |
| UOW-0841 | Add diff hunk navigation keys (n/p) → emit diff.navigate | Pending |
| UOW-0842 | Add syntax highlight integration by filePath | Pending |
| UOW-0843 | Tests: diff rendering fixtures and navigation events | Pending |

### Story 8.5 — FilePicker full feature

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0850 | Implement filesystem adapter abstraction | Pending |
| UOW-0851 | Implement FilePicker navigation (enter dir/up) | Pending |
| UOW-0852 | Implement filtering by glob patterns | Pending |
| UOW-0853 | Implement preview pane (uses Document renderer adapters) | Pending |
| UOW-0854 | Tests: virtual FS adapter + navigation/selection | Pending |

---

## EPIC 9 — Hooks Integration (PreToolUse/PostToolUse/etc.)

### Story 9.1 — Hook runner scripts

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0901 | Create ui-interceptor.js hook script | Pending |
| UOW-0902 | Create result-renderer.js hook script | Pending |
| UOW-0903 | Create notification-handler.js hook script | Pending |
| UOW-0904 | Create completion-ui.js hook script | Pending |

### Story 9.2 — Hook configuration templates

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0910 | Produce .claude/settings.json hook config templates for PreToolUse | Pending |
| UOW-0911 | Produce PostToolUse matcher template | Pending |
| UOW-0912 | Produce Notification + Stop hook templates | Pending |
| UOW-0913 | Docs: install steps, file paths, permissions | Pending |

### Story 9.3 — AskUserQuestion → Rich UI transformation

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-0920 | Implement transformToUISpec for AskUserQuestion | Pending |
| UOW-0921 | Implement mapping from List selection back to output format | Pending |
| UOW-0922 | Tests: given AskUserQuestion input → emitted valid UILayout | Pending |

---

## EPIC 10 — Outbound UI Events → Claude (Bidirectional Protocol)

### Story 10.1 — Event transport

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1001 | Define UIEvent envelope (eventType, timestamp, componentId, payload) | Pending |
| UOW-1002 | Implement event sink to stdout (or IPC) with configurable channel | Pending |
| UOW-1003 | Implement event batching and debouncing for high-frequency events | Pending |
| UOW-1004 | Tests: emitted JSON conforms to schema; ordering preserved | Pending |

### Story 10.2 — Action bindings

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1010 | Implement ActionBinding parser with templating support | Pending |
| UOW-1011 | Implement sendMessage action (emit message.request) | Pending |
| UOW-1012 | Implement updateState action (apply patch locally) | Pending |
| UOW-1013 | Implement dismiss/navigate actions (local UI state) | Pending |
| UOW-1014 | Tests: bindings fire on events; templating resolves | Pending |

---

## EPIC 11 — Configuration, Theming, and Compatibility

### Story 11.1 — Config loader

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1101 | Implement config resolution order (user → project → local) | Pending |
| UOW-1102 | Add JSON schema for config file and validator | Pending |
| UOW-1103 | Add tests: precedence and invalid config fallback | Pending |

### Story 11.2 — Theme system

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1110 | Implement theme tokens (primary, success, warning, error, etc.) | ✅ Complete |
| UOW-1111 | Implement auto-detect dark/light terminal background | Pending |
| UOW-1112 | Tests: theme applied to key components | Pending |

### Story 11.3 — Terminal capability detection

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1120 | Implement terminal capability detector (width/height, unicode, color) | ✅ Complete |
| UOW-1121 | Implement graphics protocol detection flags (kitty/iterm/sixel) | Pending |
| UOW-1122 | Tests: env-var based detection works | Pending |

---

## EPIC 12 — Reliability, Observability, and QA

### Story 12.1 — Error handling UX

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1201 | Implement global error banner (non-fatal errors) | ✅ Complete |
| UOW-1202 | Implement error log panel (toggle e) with recent errors | Pending |
| UOW-1203 | Tests: invalid JSON line shows banner but app continues | Pending |

### Story 12.2 — Telemetry (local)

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1210 | Implement metrics collection (events/sec, render/sec, memory) | Pending |
| UOW-1211 | Implement optional metrics display in status bar | Pending |
| UOW-1212 | Tests: metrics increment correctly under fixture replay | Pending |

### Story 12.3 — End-to-end fixtures

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1220 | Create fixture JSONL: simple chat + doc open + task start/end | ✅ Complete |
| UOW-1221 | Create fixture JSONL: large session (1000 messages) for perf regression | Pending |
| UOW-1222 | Create fixture JSONL: mixed tool calls + diagram + chart | ✅ Complete |
| UOW-1223 | Add E2E test runner: replay fixture → snapshot key screens | Pending |

---

## EPIC 13 — Packaging and Distribution

### Story 13.1 — CLI packaging

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1301 | Implement bin command (claude-tui) with flags | ✅ Complete |
| UOW-1302 | Add build pipeline (tsup/esbuild) producing single dist artifact | Pending |
| UOW-1303 | Add npm package metadata, files whitelist | ✅ Complete |
| UOW-1304 | Tests: CLI flags parse; help output correct | Pending |

### Story 13.2 — Installation guides

| UOW ID | Description | Status |
|--------|-------------|--------|
| UOW-1310 | Write install guide: npm i -g, config, hook setup | ✅ Complete |
| UOW-1311 | Write troubleshooting guide | Pending |
| UOW-1312 | Write "demo script" steps for a 5-minute recorded demo | Pending |

---

## Dependencies / Sequencing

```
Core spine: EPIC 0 → EPIC 1 → EPIC 2 → EPIC 3 → EPIC 4

Document (EPIC 5) and Tasks (EPIC 6) can run in parallel after EPIC 3

Declarative component catalog (EPIC 8) can start after EPIC 2, visible after EPIC 3

Hooks (EPIC 9) and outbound protocol (EPIC 10) should follow EPIC 8 interactivity
```

---

## Global Acceptance Criteria

1. ✅ Can replay a fixture JSONL and render a stable conversation view with streaming updates
2. ✅ Can open a document viewer with scroll + close
3. ✅ Can show background tasks with live status transitions
4. ✅ Can render ASCII diagrams/charts without wrapping distortion
5. ❌ Can render a JSON UILayout spec and accept JSON Patch updates with versioning
6. ❌ Interactions emit UIEvent envelopes deterministically (tested)
7. ⚠️ All UOWs have unit tests or integration tests (39 tests passing)

---

## Progress Summary

| Epic | Total UOWs | Completed | Pending |
|------|------------|-----------|---------|
| EPIC 0 | 8 | 7 | 1 |
| EPIC 1 | 11 | 10 | 1 |
| EPIC 2 | 11 | 5 | 6 |
| EPIC 3 | 8 | 3 | 5 |
| EPIC 4 | 14 | 10 | 4 |
| EPIC 5 | 12 | 3 | 9 |
| EPIC 6 | 10 | 6 | 4 |
| EPIC 7 | 6 | 2 | 4 |
| EPIC 8 | 30 | 4 | 26 |
| EPIC 9 | 13 | 0 | 13 |
| EPIC 10 | 14 | 0 | 14 |
| EPIC 11 | 9 | 2 | 7 |
| EPIC 12 | 13 | 3 | 10 |
| EPIC 13 | 9 | 4 | 5 |
| **TOTAL** | **158** | **59** | **99** |

**Overall Progress: 37%**
