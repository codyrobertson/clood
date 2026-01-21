/**
 * E2E Test Runner Tests (UOW-1223)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  runE2ETest,
  compareSnapshots,
  loadSnapshot,
  saveSnapshot,
  captureAt,
  captureAfter,
  captureAtPercentage,
  captureWhen,
  type Snapshot,
  type E2EState,
  type E2ETestResult,
} from './E2ERunner.js';
import { FixtureBuilder } from './FixtureReplay.js';

describe('E2ERunner', () => {
  const testSnapshotDir = '/tmp/clood-e2e-test-snapshots';

  beforeEach(() => {
    // Clean up test snapshot directory
    if (existsSync(testSnapshotDir)) {
      rmSync(testSnapshotDir, { recursive: true });
    }
    mkdirSync(testSnapshotDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testSnapshotDir)) {
      rmSync(testSnapshotDir, { recursive: true });
    }
  });

  describe('runE2ETest', () => {
    it('should process events from fixture content', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .message('msg-2', 'assistant', 'Hi there!')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
      });

      expect(result.eventsProcessed).toBe(2);
      expect(result.finalState.messages).toHaveLength(2);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should capture screens at specified indices', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'First message')
        .message('msg-2', 'assistant', 'Second message')
        .message('msg-3', 'user', 'Third message')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(0, 'first'), captureAt(2, 'third')],
      });

      expect(result.captures).toHaveLength(2);
      expect(result.captures[0].id).toBe('first');
      expect(result.captures[1].id).toBe('third');
    });

    it('should capture screens after specific event types', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .task('task-1', 'started', 'Running tests')
        .task('task-1', 'completed', 'Running tests')
        .notification('success', 'Done!')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAfter('task', 'after-task')],
      });

      // Should capture after both task events
      expect(result.captures.length).toBeGreaterThanOrEqual(1);
      expect(result.captures[0].id).toBe('after-task');
    });

    it('should capture screens at percentage points', async () => {
      const fixture = new FixtureBuilder()
        .message('1', 'user', 'One')
        .message('2', 'assistant', 'Two')
        .message('3', 'user', 'Three')
        .message('4', 'assistant', 'Four')
        .message('5', 'user', 'Five')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [
          captureAtPercentage(50, 'halfway'),
          captureAtPercentage(100, 'end'),
        ],
      });

      const halfwayCapture = result.captures.find((c) => c.id === 'halfway');
      const endCapture = result.captures.find((c) => c.id === 'end');

      expect(halfwayCapture).toBeDefined();
      expect(endCapture).toBeDefined();
    });

    it('should capture screens with custom conditions', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .message('msg-2', 'assistant', 'IMPORTANT: This is special')
        .message('msg-3', 'user', 'Bye')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [
          captureWhen(
            (event) =>
              event.type === 'message' &&
              (event as any).content?.includes('IMPORTANT'),
            'important-message'
          ),
        ],
      });

      const capture = result.captures.find((c) => c.id === 'important-message');
      expect(capture).toBeDefined();
    });

    it('should handle streaming events correctly', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .streamStart('msg-2')
        .streamDelta('msg-2', 'Part 1 ')
        .streamDelta('msg-2', 'Part 2')
        .streamEnd('msg-2')
        .message('msg-2', 'assistant', 'Part 1 Part 2')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(3, 'during-stream')],
      });

      expect(result.eventsProcessed).toBe(6);
      const capture = result.captures.find((c) => c.id === 'during-stream');
      expect(capture).toBeDefined();
    });

    it('should handle document events', async () => {
      const fixture = new FixtureBuilder()
        .custom({
          type: 'document',
          action: 'open',
          path: '/test/file.ts',
          title: 'Test File',
          content: 'const x = 1;',
        })
        .custom({
          type: 'document',
          action: 'close',
        })
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(0, 'doc-open')],
      });

      const capture = result.captures.find((c) => c.id === 'doc-open');
      expect(capture).toBeDefined();
      expect(result.finalState.currentDocument).toBeUndefined();
    });

    it('should track tasks in state', async () => {
      const fixture = new FixtureBuilder()
        .task('task-1', 'started', 'Task One')
        .task('task-2', 'started', 'Task Two')
        .task('task-1', 'completed', 'Task One')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
      });

      expect(result.finalState.tasks).toHaveLength(2);
      expect(result.finalState.tasks[0].status).toBe('completed');
      expect(result.finalState.tasks[1].status).toBe('started');
    });

    it('should track notifications', async () => {
      const fixture = new FixtureBuilder()
        .notification('info', 'First')
        .notification('warning', 'Second')
        .notification('error', 'Third')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
      });

      expect(result.finalState.notifications).toHaveLength(3);
      expect(result.finalState.notifications[0].level).toBe('info');
      expect(result.finalState.notifications[2].level).toBe('error');
    });

    it('should call progress callback', async () => {
      const fixture = new FixtureBuilder()
        .message('1', 'user', 'One')
        .message('2', 'assistant', 'Two')
        .message('3', 'user', 'Three')
        .build();

      const progressUpdates: number[] = [];

      await runE2ETest({
        fixtureContent: fixture,
        onProgress: (progress) => {
          progressUpdates.push(progress.percentage);
        },
      });

      expect(progressUpdates.length).toBe(3);
    });

    it('should respect timeout option', async () => {
      const fixture = new FixtureBuilder()
        .message('1', 'user', 'One')
        .message('2', 'assistant', 'Two')
        .message('3', 'user', 'Three')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        eventDelay: 100, // 100ms per event
        timeout: 50, // 50ms total timeout
      });

      // Should timeout before processing all events
      expect(result.errors.some((e) => e.message.includes('timed out'))).toBe(true);
    });

    it('should support custom state reducers', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .build();

      const result = await runE2ETest({
        fixtureContent: fixture,
        stateReducer: (state, event) => ({
          ...state,
          eventCount: state.eventCount + 1,
          custom: {
            ...state.custom,
            lastEventType: event.type,
          },
        }),
      });

      expect(result.finalState.custom.lastEventType).toBe('message');
    });

    it('should handle errors in events gracefully', async () => {
      const fixture = '{"type":"message","id":"1","role":"user","content":"Hello"}\n' +
        '{"type":"unknown","invalid":true}\n' +
        '{"type":"message","id":"2","role":"assistant","content":"Hi"}';

      const result = await runE2ETest({
        fixtureContent: fixture,
      });

      // Should continue processing despite unknown event
      expect(result.eventsProcessed).toBe(3);
      expect(result.finalState.messages).toHaveLength(2);
    });

    it('should error when no fixture is provided', async () => {
      const result = await runE2ETest({});

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('fixturePath or fixtureContent');
    });
  });

  describe('Snapshot comparison', () => {
    it('should identify matching snapshots', () => {
      const snapshot1: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: Date.now(),
      };

      const snapshot2: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: Date.now(),
      };

      const result = compareSnapshots(snapshot1, snapshot2);
      expect(result.matches).toBe(true);
      expect(result.differences).toBeUndefined();
    });

    it('should identify different snapshots', () => {
      const snapshot1: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: Date.now(),
      };

      const snapshot2: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine CHANGED\nLine 3',
        createdAt: Date.now(),
      };

      const result = compareSnapshots(snapshot1, snapshot2);
      expect(result.matches).toBe(false);
      expect(result.differences).toHaveLength(1);
      expect(result.differences![0].line).toBe(2);
      expect(result.differences![0].type).toBe('changed');
    });

    it('should handle added lines', () => {
      const snapshot1: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2',
        createdAt: Date.now(),
      };

      const snapshot2: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: Date.now(),
      };

      const result = compareSnapshots(snapshot1, snapshot2);
      expect(result.matches).toBe(false);
      expect(result.differences![0].type).toBe('added');
    });

    it('should handle removed lines', () => {
      const snapshot1: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2\nLine 3',
        createdAt: Date.now(),
      };

      const snapshot2: Snapshot = {
        id: 'test',
        content: 'Line 1\nLine 2',
        createdAt: Date.now(),
      };

      const result = compareSnapshots(snapshot1, snapshot2);
      expect(result.matches).toBe(false);
      expect(result.differences![0].type).toBe('removed');
    });
  });

  describe('Snapshot persistence', () => {
    it('should save and load snapshots', () => {
      const snapshot: Snapshot = {
        id: 'test-snapshot',
        content: 'Test content\nLine 2',
        createdAt: Date.now(),
        testRunId: 'run-123',
      };

      const path = join(testSnapshotDir, 'test.json');
      saveSnapshot(path, snapshot);

      const loaded = loadSnapshot(path);
      expect(loaded).toEqual(snapshot);
    });

    it('should return null for non-existent snapshot', () => {
      const loaded = loadSnapshot('/non/existent/path.json');
      expect(loaded).toBeNull();
    });

    it('should create directory when saving snapshot', () => {
      const snapshot: Snapshot = {
        id: 'test',
        content: 'Content',
        createdAt: Date.now(),
      };

      const nestedPath = join(testSnapshotDir, 'deep', 'nested', 'snapshot.json');
      saveSnapshot(nestedPath, snapshot);

      expect(existsSync(nestedPath)).toBe(true);
    });
  });

  describe('Snapshot integration with E2E test', () => {
    it('should create snapshots when updateSnapshots is true', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .message('msg-2', 'assistant', 'Hi there!')
        .build();

      await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(1, 'snapshot-test')],
        snapshotDir: testSnapshotDir,
        updateSnapshots: true,
      });

      const snapshotPath = join(testSnapshotDir, 'snapshot-test.json');
      expect(existsSync(snapshotPath)).toBe(true);

      const snapshot = loadSnapshot(snapshotPath);
      expect(snapshot).not.toBeNull();
      expect(snapshot!.id).toBe('snapshot-test');
    });

    it('should compare against existing snapshots', async () => {
      const fixture = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .message('msg-2', 'assistant', 'Hi!')
        .build();

      // First run to create snapshot
      await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(1, 'compare-test')],
        snapshotDir: testSnapshotDir,
        updateSnapshots: true,
      });

      // Second run to compare
      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [captureAt(1, 'compare-test')],
        snapshotDir: testSnapshotDir,
        updateSnapshots: false,
      });

      expect(result.comparisons).toHaveLength(1);
      expect(result.comparisons[0].matches).toBe(true);
      expect(result.passed).toBe(true);
    });

    it('should fail when snapshots do not match', async () => {
      const fixture1 = new FixtureBuilder()
        .message('msg-1', 'user', 'Hello')
        .build();

      const fixture2 = new FixtureBuilder()
        .message('msg-1', 'user', 'Different message')
        .build();

      // First run to create snapshot
      await runE2ETest({
        fixtureContent: fixture1,
        capturePoints: [captureAt(0, 'mismatch-test')],
        snapshotDir: testSnapshotDir,
        updateSnapshots: true,
      });

      // Second run with different content
      const result = await runE2ETest({
        fixtureContent: fixture2,
        capturePoints: [captureAt(0, 'mismatch-test')],
        snapshotDir: testSnapshotDir,
        updateSnapshots: false,
      });

      expect(result.comparisons).toHaveLength(1);
      expect(result.comparisons[0].matches).toBe(false);
      expect(result.passed).toBe(false);
    });
  });

  describe('Capture point helpers', () => {
    it('captureAt should create correct capture point', () => {
      const point = captureAt(5, 'my-capture');
      expect(point.atIndex).toBe(5);
      expect(point.id).toBe('my-capture');
    });

    it('captureAt should generate default id', () => {
      const point = captureAt(10);
      expect(point.id).toBe('capture-at-10');
    });

    it('captureAfter should create correct capture point', () => {
      const point = captureAfter('task', 'after-task');
      expect(point.afterEventType).toBe('task');
      expect(point.id).toBe('after-task');
    });

    it('captureAtPercentage should create correct capture point', () => {
      const point = captureAtPercentage(75, 'three-quarters');
      expect(point.atPercentage).toBe(75);
      expect(point.id).toBe('three-quarters');
    });

    it('captureWhen should create correct capture point', () => {
      const condition = (event: any) => event.type === 'test';
      const point = captureWhen(condition, 'conditional');
      expect(point.condition).toBe(condition);
      expect(point.id).toBe('conditional');
    });
  });

  describe('Performance with large fixtures', () => {
    it('should handle large number of events efficiently', async () => {
      // Create a fixture with 500 messages
      const builder = new FixtureBuilder();
      for (let i = 0; i < 500; i++) {
        builder.message(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`);
      }
      const fixture = builder.build();

      const startTime = Date.now();
      const result = await runE2ETest({
        fixtureContent: fixture,
        capturePoints: [
          captureAtPercentage(25, 'q1'),
          captureAtPercentage(50, 'q2'),
          captureAtPercentage(75, 'q3'),
          captureAtPercentage(100, 'q4'),
        ],
      });
      const duration = Date.now() - startTime;

      expect(result.eventsProcessed).toBe(500);
      expect(result.captures.length).toBeGreaterThanOrEqual(4);
      expect(result.passed).toBe(true);
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });
});
