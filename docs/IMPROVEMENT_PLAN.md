# Clood TUI — Comprehensive Improvement Plan

**Generated:** 2026-01-21
**Status:** Draft - Pending Team Review
**Version:** 1.0

---

## Executive Summary

Full codebase assessment of Clood TUI (a React/Ink terminal UI for Claude Code) to identify gaps, technical debt, and create a prioritized improvement roadmap. The codebase is well-architected but has several unimplemented features (outbound events, chart rendering, input handling), incomplete test coverage, lint configuration issues, and opportunities for operational hardening.

**Backlog Status:** 158 total UOWs, 59 complete (37%), 99 pending. See `docs/BACKLOG.md` for authoritative UOW breakdown.

**Prioritization:** Fix broken tooling first (ESLint), then complete missing core features (input, charts), add comprehensive testing, and finally implement the bidirectional protocol.

---

## Table of Contents

1. [Current State Snapshot](#1-current-state-snapshot)
2. [Requirements & Constraints](#2-requirements--constraints)
3. [Risks / Unknowns](#3-risks--unknowns)
4. [Sprint Plan](#4-sprint-plan)
5. [Verification & Rollout](#5-verification--rollout)
6. [Retro & Next Steps](#6-retro--next-steps)
7. [Critic Review & Revisions](#7-critic-review--revisions)

---

## 1. Current State Snapshot

### Architecture Map

```
JSONL Events → EventStream.ts (Zod) → useEventStream.ts →
Zustand Store → React/Ink Components → Terminal
```

### Key Files & Functions

| Area | Path | Key Functions/Classes |
|------|------|----------------------|
| Entry | `src/index.tsx` | CLI bootstrap, renders `<App>` |
| CLI Args | `src/cli/args.ts` | `parseArgs()` |
| Event Parser | `src/core/EventStream.ts` | `parseEvent()`, `parseEvents()`, type guards |
| Event Hook | `src/core/useEventStream.ts` | `useEventStream()`, `handleEvent()` |
| State | `src/store/index.ts` | `useStore`, 30+ actions, helper hooks |
| Types | `src/types/events.ts` | 9 Zod schemas |
| Types | `src/types/index.ts` | Core types, `DEFAULT_CONFIG` |
| Root UI | `src/ui/App.tsx` | Layout orchestration, keyboard handling |
| Components | `src/ui/components/*.tsx` | 11 components |
| Keyboard | `src/ui/hooks/useKeyboardNavigation.ts` | Vim-style bindings |
| Utils | `src/utils/formatting.ts` | Formatting utilities |

### Test & Tooling Status

| Item | Status | Notes |
|------|--------|-------|
| Unit Tests | 39 passing | Store (24) + Parser (15) |
| Component Tests | None | ink-testing-library present but unused |
| Integration Tests | None | — |
| ESLint | 5 errors | tsconfig exclusion + no-case-declarations |
| TypeScript | Compiles clean | — |
| Build | Working | `tsc` outputs to `dist/` |

### Data Flow

1. **Input:** JSONL file (tailed via chokidar) or stdin
2. **Parse:** JSON parsed line-by-line, validated via Zod
3. **Dispatch:** Events dispatched to Zustand store actions
4. **State:** Zustand store holds messages/tasks/documents/UI state
5. **Render:** Ink React components subscribe via hooks

---

## 2. Requirements & Constraints

### Functional Requirements (Gap Analysis)

| ID | Requirement | Status | Gap |
|----|-------------|--------|-----|
| FR1 | Display conversation messages | Done | — |
| FR2 | Stream partial responses | Done | — |
| FR3 | Monitor background tasks | Done | — |
| FR4 | View documents | Done | — |
| FR5 | Keyboard navigation | Done | — |
| FR6 | **User text input** | Missing | `ink-text-input` imported but unused |
| FR7 | **Chart rendering** | Missing | Schema exists, no renderer |
| FR8 | **Outbound events** | Missing | Protocol defined, not implemented |
| FR9 | **Session lifecycle** | Partial | Events parsed but no UI |
| FR10 | **Tool call display** | Partial | Events logged, no UI |

### Nonfunctional Requirements

| ID | Requirement | Target | Current |
|----|-------------|--------|---------|
| NFR1 | Memory bounded | ≤500 messages | Working |
| NFR2 | Graceful degradation | No crashes on invalid events | Working |
| NFR3 | Terminal compatibility | Node 18+, 80x24 min | Working |
| NFR4 | Test coverage | >80% | ~40% |
| NFR5 | CI-ready | Lint + test pass | Lint errors |

### Assumptions

1. Claude Code will emit JSONL to a file; this UI tails it
2. Bidirectional communication will use same file or separate channel
3. No sixel/image graphics required (ASCII only)
4. Single-user, single-session
5. No persistent storage beyond session file

---

## 3. Risks / Unknowns

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R1 | Bidirectional protocol not finalized | High | Medium | Feature-flag; design for change |
| R2 | Ink terminal compatibility issues | Medium | Low | Test on multiple terminals |
| R3 | Memory leaks in long sessions | Medium | Medium | Add memory profiling |
| R4 | chokidar issues on network filesystems | Medium | Low | Document; offer stdin |
| R5 | React re-render performance | Low | Low | Virtualization if needed |
| R6 | Claude Code event format changes | High | Low | Zod validation; version negotiation |

---

## 4. Sprint Plan

### Sprint 1: Tooling & Foundation

**Goal:** CI-ready codebase with passing lint and tests

#### Ticket 1.1: Fix ESLint Configuration

- **Why:** Lint errors block CI
- **Backlog Ref:** UOW-0005 (partial), UOW-0007 (CI workflow)
- **Files:** `tsconfig.json`, `tsconfig.test.json` (new), `.eslintrc.json`
- **Steps:**
  1. Create `tsconfig.test.json` extending base config with test file includes
  2. Update `.eslintrc.json` with overrides for test files
  3. Fix `no-case-declarations` in `src/utils/formatting.ts`
  4. Address `no-console` in `src/cli/args.ts`
- **Acceptance:** `npm run lint` exits 0
- **Complexity:** 2/10
- **Parallelizable with:** 1.2

#### Ticket 1.2: Add Component Tests (Subset)

- **Why:** Components untested
- **Files:** `src/ui/components/*.test.tsx` (new)
- **Steps:**
  1. Create test for `MessageItem` (user/assistant/system roles, streaming indicator)
  2. Create test for `StatusBar` (status transitions)
- **Acceptance:** Tests pass; >60% coverage on tested components
- **Complexity:** 3/10
- **Parallelizable with:** 1.1

#### Ticket 1.3: Add Outbound Event Emitter Stub

- **Why:** De-risk Sprint 3 early
- **Backlog Ref:** UOW-1001, UOW-1002 (Event transport)
- **Files:** `src/core/EventEmitter.ts` (new)
- **Steps:**
  1. Create `OutboundEventEmitter` interface
  2. Implement stub emitter (logs to console/memory)
  3. Add to store config
- **Acceptance:** Stub emitter can be called; events logged
- **Complexity:** 3/10
- **Parallelizable with:** 1.1, 1.2

#### Ticket 1.4: Add Integration Test for Inbound Event Flow

- **Why:** No end-to-end test
- **Files:** `src/integration/event-flow.test.tsx` (new)
- **Steps:**
  1. Create fixture with session start, messages, task
  2. Test store state after processing
- **Acceptance:** Integration test passes
- **Complexity:** 4/10
- **Parallelizable with:** 1.1, 1.2

**Sprint 1 Demo:** `npm test` and `npm run lint` both pass

---

### Sprint 2: Core Features (No Outbound Dependencies)

**Goal:** Chart rendering and input bar visual complete

#### Ticket 2.1a: InputBar Component (Visual Only)

- **Why:** Input exists in deps but unused
- **Files:** `src/ui/components/InputBar.tsx` (new), `src/ui/App.tsx`
- **Steps:**
  1. Create InputBar using `ink-text-input`
  2. Props: `value`, `placeholder`, `disabled`, `onSubmit`
  3. Render at bottom of App
- **Acceptance:** Input bar renders; user can type
- **Complexity:** 3/10
- **Parallelizable with:** 2.2

#### Ticket 2.1b: InputBar Focus Management

- **Why:** Keyboard conflicts need resolution
- **Files:** `src/store/index.ts`, `src/ui/hooks/useKeyboardNavigation.ts`
- **Steps:**
  1. Add `focusedPanel` state to store
  2. Implement Tab key to cycle focus
  3. Update keyboard hook to respect focus
- **Acceptance:** Tab cycles focus; input captures keys when focused
- **Complexity:** 4/10
- **Parallelizable with:** 2.2

#### Ticket 2.2: Implement Chart Rendering

- **Why:** ChartEvent schema exists; no renderer
- **Backlog Ref:** UOW-0704, UOW-0705, UOW-0706 (Charts integration)
- **Files:** `src/ui/components/Chart.tsx` (new), `src/core/useEventStream.ts`
- **Steps:**
  1. Add `charts` to store
  2. Create Chart component (render ASCII bar/sparkline)
  3. Handle `chart` event in useEventStream
  4. If `content` present, use pre-rendered; else generate
- **Acceptance:** Chart event renders ASCII chart
- **Complexity:** 5/10
- **Parallelizable with:** 2.1a, 2.1b

#### Ticket 2.3: Enhance Tool Call Display

- **Why:** Tool calls logged but not visible
- **Files:** `src/ui/components/ToolCallBadge.tsx` (new), `src/ui/components/MessageItem.tsx`
- **Steps:**
  1. Create ToolCallBadge showing name + status icon
  2. Track tool calls per message
  3. Render badges on messages
- **Acceptance:** Tool calls display as badges
- **Complexity:** 4/10
- **Parallelizable with:** 2.1, 2.2

**Sprint 2 Demo:** Charts render; input bar visible (submission deferred)

---

### Sprint 3: Bidirectional Protocol

**Goal:** Outbound events emitted; full integration possible

#### Ticket 3.1: Implement Real Outbound Transport

- **Why:** Stub needs real implementation
- **Backlog Ref:** UOW-1001-1004 (Event transport), UOW-1003 (Batching/debouncing)
- **Files:** `src/core/EventEmitter.ts`
- **Steps:**
  1. Implement stdout/file transport
  2. Add queue with backpressure (max 100)
  3. Add emitter status to store
  4. Error handling and recovery
- **Acceptance:** Events write to configured output; backpressure works
- **Complexity:** 5/10
- **Parallelizable with:** None

#### Ticket 3.2: Wire Input Submission

- **Why:** Input needs to emit event
- **Files:** `src/ui/components/InputBar.tsx`, `src/core/EventEmitter.ts`
- **Steps:**
  1. onSubmit dispatches `input.submit` event
  2. Clear input on success
  3. Show notification on error
- **Acceptance:** Enter emits event; error shows notification
- **Complexity:** 3/10
- **Parallelizable with:** 3.3, 3.4

#### Ticket 3.3: Wire Task Cancel

- **Why:** No cancel action
- **Backlog Ref:** UOW-0608, UOW-0609, UOW-0610 (Task control actions)
- **Files:** `src/ui/components/TasksPanel.tsx`
- **Steps:**
  1. Add cancel shortcut to task item
  2. Emit `task.cancel` event
  3. Update UI optimistically
- **Acceptance:** Cancel emits event
- **Complexity:** 3/10
- **Parallelizable with:** 3.2, 3.4

#### Ticket 3.4: Add Session Control UI

- **Why:** Session events parsed but no control
- **Files:** `src/ui/components/SessionBar.tsx` (new), `src/ui/App.tsx`
- **Steps:**
  1. Create SessionBar showing session ID, status
  2. Add pause/resume emitting session events
- **Acceptance:** Session status visible; control functional
- **Complexity:** 4/10
- **Parallelizable with:** 3.2, 3.3

#### Ticket 3.5: Event Batching & Debouncing

- **Why:** High-frequency events need optimization
- **Files:** `src/core/EventEmitter.ts`
- **Steps:**
  1. Implement batching (100ms window)
  2. Implement debouncing for scroll events
- **Acceptance:** Batch and debounce work; tests pass
- **Complexity:** 4/10
- **Parallelizable with:** None (after 3.1)

**Sprint 3 Demo:** Full bidirectional; input emits; task cancel works

---

### Sprint 4: Hardening & Polish

**Goal:** Production-ready quality

#### Ticket 4.1: Add Error Boundary

- **Why:** React errors can crash TUI
- **Backlog Ref:** UOW-1201, UOW-1203 (Error handling UX)
- **Files:** `src/ui/components/ErrorBoundary.tsx` (new), `src/ui/App.tsx`
- **Steps:**
  1. Create ErrorBoundary with retry
  2. Wrap App content
  3. Log to debug panel
- **Acceptance:** Errors render error screen, not crash
- **Complexity:** 3/10
- **Parallelizable with:** 4.2, 4.3

#### Ticket 4.2: Remaining Component Tests

- **Why:** Coverage incomplete
- **Files:** `src/ui/components/ConversationPanel.test.tsx`, `TasksPanel.test.tsx`
- **Steps:**
  1. Test ConversationPanel (empty state, scroll bounds, >max messages)
  2. Test TasksPanel (all states)
- **Acceptance:** >70% component coverage
- **Complexity:** 4/10
- **Parallelizable with:** 4.1, 4.3

#### Ticket 4.3: Performance Monitoring

- **Why:** Long sessions may degrade
- **Backlog Ref:** UOW-1210, UOW-1211, UOW-1212 (Telemetry), UOW-0308 (Perf test)
- **Files:** `src/utils/performance.ts` (new), `src/store/index.ts`
- **Steps:**
  1. Track event processing time, render time
  2. Add metrics to debug panel
  3. Add performance test (10K events in <5s)
- **Acceptance:** Metrics visible; performance test passes
- **Complexity:** 4/10
- **Parallelizable with:** 4.1, 4.2

#### Ticket 4.4: Documentation Update

- **Why:** Docs need updating
- **Files:** `README.md`, `docs/PROTOCOL.md`, `docs/USAGE.md` (new)
- **Steps:**
  1. Update README with new features
  2. Document outbound events
  3. Create USAGE.md with shortcuts, config
- **Acceptance:** Docs complete and accurate
- **Complexity:** 2/10
- **Parallelizable with:** All

**Sprint 4 Demo:** Error recovery; performance visible; docs complete

---

## 5. Verification & Rollout

### Tests by Layer

| Layer | Coverage | Tools | Sprint |
|-------|----------|-------|--------|
| Unit (store/parser) | >90% | Vitest | S1 |
| Unit (components) | >70% | Vitest + ink-testing-library | S1, S4 |
| Integration | Key flows | Vitest | S1, S3 |
| Performance | 10K events <5s | Vitest | S4 |

### QA Checklist

- [ ] All keyboard shortcuts work
- [ ] Auto-scroll toggles correctly
- [ ] Streaming messages render progressively
- [ ] Task status icons display correctly
- [ ] Document viewer opens/closes/scrolls
- [ ] Notifications appear and dismiss
- [ ] Input bar accepts text
- [ ] Charts render correctly
- [ ] Long sessions (>500 messages) don't crash
- [ ] Invalid JSONL doesn't crash

### Security Checks

- [ ] No shell injection in task commands (display only)
- [ ] File paths sanitized
- [ ] No secrets logged
- [ ] Input sanitized for terminal injection (ANSI codes)

### Rollout Plan

1. **Alpha:** Manual testing with fixtures
2. **Beta:** Integration with Claude Code dev build
3. **GA:** npm publish

### Rollback Path

- Single binary with no migrations
- Revert to previous npm version
- No persistent state

---

## 6. Retro & Next Steps

### What Will Be Hardest

1. Bidirectional protocol finalization (needs Claude Code team)
2. Terminal compatibility testing
3. Performance at scale (>500 messages)

### Likely Failure Points

| Failure | Signal | Response |
|---------|--------|----------|
| Protocol mismatch | Zod failures spike | Version negotiation |
| Memory leak | Memory grows unbounded | Trim more aggressively |
| Render blocking | UI freezes | Profile, optimize |
| chokidar issues | Events not received | Fall back to polling |

### Follow-ups / Backlog

- Virtualized message list for >1000 messages
- Sixel image support
- Plugin system
- WebSocket input source
- Session persistence/replay
- Multi-session support

### Kill Criteria

Stop and reassess if:
1. Claude Code changes protocol incompatibly
2. Ink abandons React 18 support
3. Requirements change to require graphics
4. Scope exceeds 2x estimate

---

## 7. Critic Review & Revisions

### Top Issues Identified

1. **Sprint 3 underscoped** — Backlog has 14 UOWs for bidirectional; plan had 4 tickets
2. **No transport layer defined** — Where do outbound events go?
3. **Ticket 2.1 too large** — Split into 3 tickets (visual, focus, submission)
4. **Acceptance criteria vague** — Made specific
5. **Lint count wrong** — Fixed to 5 errors
6. **No rollback strategy** — Added graceful degradation
7. **Missing concurrency edge cases** — Documented
8. **Chart rendering underspecified** — Clarified
9. **Performance monitoring vague** — Defined metrics
10. **Integration test undefined** — Made specific

### Red Flags (Block Until Resolved)

| Flag | Question | Action |
|------|----------|--------|
| Outbound destination | Where does InputBar submission go? | Confirm Claude Code accepts events |
| Task cancel authority | Can TUI actually cancel tasks? | Architectural clarity needed |
| No CI workflow | How is quality enforced? | Add to Sprint 1 or accept risk |
| Session path hardcoded | What if Claude Code changes? | Add config override |
| No feature flags | What if charts crash but rest works? | Define feature flag strategy |

### Revised Sequencing

Original: Tooling → Features → Protocol → Polish

**Revised:**
```
Sprint 1: Tooling + Protocol Stub (de-risk early)
Sprint 2: Core Features (no outbound deps)
Sprint 3: Full Bidirectional Protocol
Sprint 4: Hardening + Remaining Tests + Polish
```

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | Claude | 2026-01-21 | Draft |
| Reviewer | — | — | Pending |
| Tech Lead | — | — | Pending |

---

*This document should be treated as living and updated as implementation proceeds.*
