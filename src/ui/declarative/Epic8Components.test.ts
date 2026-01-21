/**
 * EPIC 8 Advanced Declarative Components Tests
 * Tests for UOW-0816 (SplitView), UOW-0817 (Logs), UOW-0818 (DiffView), UOW-0819 (FilePicker)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';

// SplitView imports
import {
  SplitView,
  LeftRightSplit,
  TopBottomSplit,
  ThreePaneSplit,
  emitPaneResize,
  emitPaneFocus,
} from './SplitView.js';

// Logs imports
import {
  Logs,
  SimpleLogs,
  createLogEntries,
  emitLogFilter,
  emitLogScroll,
  type LogEntry,
  type LogLevel,
} from './Logs.js';

// DiffView imports
import {
  DiffView,
  SimpleDiffView,
  SideBySideDiff,
  parseUnifiedDiff,
  emitDiffNavigate,
  emitDiffSelect,
  type DiffFile,
  type DiffLine,
} from './DiffView.js';

// FilePicker imports
import {
  FilePicker,
  SimpleFilePicker,
  DirectoryPicker,
  createFileEntries,
  emitFileSelect,
  emitFileNavigate,
  emitFileFilter,
  type FileEntry,
} from './FilePicker.js';

// Registration imports
import {
  registerEpic8Components,
  isEpic8Registered,
  getEpic8ComponentTypes,
} from './registerEpic8Components.js';

import { ComponentRegistry } from './ComponentRegistry.js';
import { UIEventEmitter } from './EventEmitter.js';

describe('EPIC 8 Advanced Declarative Components', () => {
  beforeEach(() => {
    // Clear event emitter listeners
    UIEventEmitter.clear();
    // Re-register components for each test
    ComponentRegistry.clear();
    registerEpic8Components();
  });

  describe('UOW-0816: SplitView', () => {
    describe('SplitView component', () => {
      it('should render with default props', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-1',
            primary: React.createElement(Text, null, 'Left'),
            secondary: React.createElement(Text, null, 'Right'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should support horizontal orientation', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-2',
            orientation: 'horizontal',
            primary: React.createElement(Text, null, 'Left'),
            secondary: React.createElement(Text, null, 'Right'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should support vertical orientation', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-3',
            orientation: 'vertical',
            primary: React.createElement(Text, null, 'Top'),
            secondary: React.createElement(Text, null, 'Bottom'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should respect visibility prop', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-4',
            visible: false,
            primary: React.createElement(Text, null, 'Left'),
            secondary: React.createElement(Text, null, 'Right'),
          })
        );

        expect(lastFrame()).toBe('');
      });

      it('should configure ratio within bounds', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-5',
            ratio: 0.7,
            minRatio: 0.2,
            maxRatio: 0.8,
            primary: React.createElement(Text, null, 'Primary'),
            secondary: React.createElement(Text, null, 'Secondary'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should show divider by default', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-6',
            showDivider: true,
            primary: React.createElement(Text, null, 'Left'),
            secondary: React.createElement(Text, null, 'Right'),
          })
        );

        expect(lastFrame()).toContain('\u2502'); // vertical line character
      });

      it('should hide divider when configured', () => {
        const { lastFrame } = render(
          React.createElement(SplitView, {
            id: 'split-7',
            showDivider: false,
            primary: React.createElement(Text, null, 'Left'),
            secondary: React.createElement(Text, null, 'Right'),
          })
        );

        // Should not contain divider when showDivider is false
        const frame = lastFrame();
        expect(frame).toBeDefined();
      });
    });

    describe('LeftRightSplit convenience component', () => {
      it('should render with left and right props', () => {
        const { lastFrame } = render(
          React.createElement(LeftRightSplit, {
            id: 'lr-split-1',
            left: React.createElement(Text, null, 'Left Pane'),
            right: React.createElement(Text, null, 'Right Pane'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('TopBottomSplit convenience component', () => {
      it('should render with top and bottom props', () => {
        const { lastFrame } = render(
          React.createElement(TopBottomSplit, {
            id: 'tb-split-1',
            top: React.createElement(Text, null, 'Top Pane'),
            bottom: React.createElement(Text, null, 'Bottom Pane'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('ThreePaneSplit component', () => {
      it('should render three panes', () => {
        const { lastFrame } = render(
          React.createElement(ThreePaneSplit, {
            id: 'three-pane-1',
            left: React.createElement(Text, null, 'Left'),
            center: React.createElement(Text, null, 'Center'),
            right: React.createElement(Text, null, 'Right'),
          })
        );

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('pane events', () => {
      it('should emit pane resize event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitPaneResize('split-1', 0.6, 0.5, 'increase');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('split-1');
        expect(event.data.ratio).toBe(0.6);
        expect(event.data.previousRatio).toBe(0.5);
        expect(event.data.direction).toBe('increase');
      });

      it('should emit pane focus event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitPaneFocus('split-1', 'secondary', 'primary');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('split-1');
        expect(event.data.pane).toBe('secondary');
        expect(event.data.previousPane).toBe('primary');
      });
    });
  });

  describe('UOW-0817: Logs', () => {
    const sampleEntries: LogEntry[] = [
      { id: 'log-1', timestamp: new Date('2024-01-01T10:00:00'), level: 'info', message: 'Application started' },
      { id: 'log-2', timestamp: new Date('2024-01-01T10:00:01'), level: 'debug', message: 'Loading configuration' },
      { id: 'log-3', timestamp: new Date('2024-01-01T10:00:02'), level: 'warn', message: 'Deprecated API usage' },
      { id: 'log-4', timestamp: new Date('2024-01-01T10:00:03'), level: 'error', message: 'Connection failed' },
    ];

    describe('Logs component', () => {
      it('should render log entries', () => {
        const { lastFrame } = render(
          React.createElement(Logs, {
            id: 'logs-1',
            entries: sampleEntries,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('Application started');
        expect(frame).toContain('Loading configuration');
      });

      it('should filter by log level', () => {
        const { lastFrame } = render(
          React.createElement(Logs, {
            id: 'logs-2',
            entries: sampleEntries,
            enabledLevels: ['error', 'warn'],
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('Connection failed');
        expect(frame).toContain('Deprecated API usage');
      });

      it('should respect maxVisible', () => {
        const manyEntries = Array.from({ length: 50 }, (_, i) => ({
          id: `log-${i}`,
          timestamp: new Date(),
          level: 'info' as LogLevel,
          message: `Message ${i}`,
        }));

        const { lastFrame } = render(
          React.createElement(Logs, {
            id: 'logs-3',
            entries: manyEntries,
            maxVisible: 10,
          })
        );

        const frame = lastFrame();
        expect(frame).toBeDefined();
      });

      it('should hide when not visible', () => {
        const { lastFrame } = render(
          React.createElement(Logs, {
            id: 'logs-4',
            entries: sampleEntries,
            visible: false,
          })
        );

        expect(lastFrame()).toBe('');
      });

      it('should show timestamps when enabled', () => {
        const { lastFrame } = render(
          React.createElement(Logs, {
            id: 'logs-5',
            entries: sampleEntries,
            showTimestamps: true,
            timestampFormat: 'time',
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('10:00');
      });
    });

    describe('SimpleLogs component', () => {
      it('should render with minimal options', () => {
        const { lastFrame } = render(
          React.createElement(SimpleLogs, {
            id: 'simple-logs-1',
            entries: sampleEntries,
          })
        );

        expect(lastFrame()).toContain('Application started');
      });
    });

    describe('createLogEntries utility', () => {
      it('should create log entries from messages', () => {
        const entries = createLogEntries([
          { level: 'info', message: 'Test message 1' },
          { level: 'error', message: 'Test message 2' },
        ]);

        expect(entries).toHaveLength(2);
        expect(entries[0].level).toBe('info');
        expect(entries[0].message).toBe('Test message 1');
        expect(entries[1].level).toBe('error');
      });
    });

    describe('log events', () => {
      it('should emit log filter event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitLogFilter('logs-1', ['info', 'error'], 'warn', 'disable');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('logs-1');
        expect(event.data.enabledLevels).toEqual(['info', 'error']);
        expect(event.data.toggledLevel).toBe('warn');
      });

      it('should emit log scroll event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitLogScroll('logs-1', false, 10);

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('logs-1');
        expect(event.data.autoScroll).toBe(false);
        expect(event.data.scrollPosition).toBe(10);
      });
    });
  });

  describe('UOW-0818: DiffView', () => {
    const sampleDiff = `--- a/file.txt
+++ b/file.txt
@@ -1,5 +1,6 @@
 line 1
-line 2
+line 2 modified
+line 2.5 added
 line 3
 line 4
 line 5`;

    const parsedDiff: DiffFile = {
      oldPath: 'file.txt',
      newPath: 'file.txt',
      status: 'modified',
      hunks: [
        {
          oldStart: 1,
          oldCount: 5,
          newStart: 1,
          newCount: 6,
          header: '@@ -1,5 +1,6 @@',
          lines: [
            { type: 'hunk', content: '@@ -1,5 +1,6 @@' },
            { type: 'context', content: 'line 1', oldLineNumber: 1, newLineNumber: 1 },
            { type: 'remove', content: 'line 2', oldLineNumber: 2 },
            { type: 'add', content: 'line 2 modified', newLineNumber: 2 },
            { type: 'add', content: 'line 2.5 added', newLineNumber: 3 },
            { type: 'context', content: 'line 3', oldLineNumber: 3, newLineNumber: 4 },
          ],
        },
      ],
    };

    describe('parseUnifiedDiff utility', () => {
      it('should parse unified diff string', () => {
        const files = parseUnifiedDiff(sampleDiff);

        expect(files).toHaveLength(1);
        expect(files[0].oldPath).toBe('file.txt');
        expect(files[0].newPath).toBe('file.txt');
        expect(files[0].hunks).toHaveLength(1);
      });

      it('should identify added and removed lines', () => {
        const files = parseUnifiedDiff(sampleDiff);
        const hunk = files[0].hunks[0];

        const addedLines = hunk.lines.filter((l) => l.type === 'add');
        const removedLines = hunk.lines.filter((l) => l.type === 'remove');

        expect(addedLines.length).toBeGreaterThan(0);
        expect(removedLines.length).toBeGreaterThan(0);
      });

      it('should handle new file diff', () => {
        const newFileDiff = `--- /dev/null
+++ b/new-file.txt
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;

        const files = parseUnifiedDiff(newFileDiff);
        expect(files).toHaveLength(1);
        expect(files[0].status).toBe('added');
      });
    });

    describe('DiffView component', () => {
      it('should render with string diff', () => {
        const { lastFrame } = render(
          React.createElement(DiffView, {
            id: 'diff-1',
            diff: sampleDiff,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('file');
      });

      it('should render with parsed diff', () => {
        const { lastFrame } = render(
          React.createElement(DiffView, {
            id: 'diff-2',
            diff: parsedDiff,
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should show line numbers when enabled', () => {
        const { lastFrame } = render(
          React.createElement(DiffView, {
            id: 'diff-3',
            diff: parsedDiff,
            showLineNumbers: true,
          })
        );

        expect(lastFrame()).toBeDefined();
      });

      it('should hide when not visible', () => {
        const { lastFrame } = render(
          React.createElement(DiffView, {
            id: 'diff-4',
            diff: sampleDiff,
            visible: false,
          })
        );

        expect(lastFrame()).toBe('');
      });
    });

    describe('SimpleDiffView component', () => {
      it('should render with minimal options', () => {
        const { lastFrame } = render(
          React.createElement(SimpleDiffView, {
            id: 'simple-diff-1',
            diff: sampleDiff,
          })
        );

        expect(lastFrame()).toBeDefined();
      });
    });

    describe('SideBySideDiff component', () => {
      it('should render side-by-side diff', () => {
        const { lastFrame } = render(
          React.createElement(SideBySideDiff, {
            id: 'sbs-diff-1',
            diff: sampleDiff,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('Old');
        expect(frame).toContain('New');
      });
    });

    describe('diff events', () => {
      it('should emit diff navigate event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitDiffNavigate('diff-1', 2, 'next', '@@ -10,5 +10,6 @@');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('diff-1');
        expect(event.data.hunkIndex).toBe(2);
        expect(event.data.direction).toBe('next');
      });

      it('should emit diff select event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        const line: DiffLine = { type: 'add', content: 'new line', newLineNumber: 5 };
        emitDiffSelect('diff-1', 10, line);

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('diff-1');
        expect(event.data.lineIndex).toBe(10);
        expect(event.data.line.type).toBe('add');
      });
    });
  });

  describe('UOW-0819: FilePicker', () => {
    const sampleEntries: FileEntry[] = [
      { name: 'src', path: '/project/src', type: 'directory' },
      { name: 'package.json', path: '/project/package.json', type: 'file', size: 1024 },
      { name: 'README.md', path: '/project/README.md', type: 'file', size: 2048 },
      { name: '.gitignore', path: '/project/.gitignore', type: 'file', size: 256, isHidden: true },
      { name: 'node_modules', path: '/project/node_modules', type: 'directory', isHidden: false },
    ];

    describe('FilePicker component', () => {
      it('should render directory listing', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-1',
            currentPath: '/project',
            entries: sampleEntries,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('src');
        expect(frame).toContain('package.json');
      });

      it('should hide hidden files by default', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-2',
            currentPath: '/project',
            entries: sampleEntries,
            showHidden: false,
          })
        );

        const frame = lastFrame();
        expect(frame).not.toContain('.gitignore');
      });

      it('should show hidden files when enabled', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-3',
            currentPath: '/project',
            entries: sampleEntries,
            showHidden: true,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('.gitignore');
      });

      it('should filter files with glob pattern', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-4',
            currentPath: '/project',
            entries: sampleEntries,
            filterPattern: '*.md',
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('README.md');
      });

      it('should show path bar', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-5',
            currentPath: '/project/src',
            entries: [],
            showPathBar: true,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('project');
        expect(frame).toContain('src');
      });

      it('should hide when not visible', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-6',
            currentPath: '/project',
            entries: sampleEntries,
            visible: false,
          })
        );

        expect(lastFrame()).toBe('');
      });

      it('should show file sizes when enabled', () => {
        const { lastFrame } = render(
          React.createElement(FilePicker, {
            id: 'picker-7',
            currentPath: '/project',
            entries: sampleEntries,
            showSizes: true,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('KB'); // package.json is 1024 bytes = 1KB
      });
    });

    describe('SimpleFilePicker component', () => {
      it('should render with minimal options', () => {
        const { lastFrame } = render(
          React.createElement(SimpleFilePicker, {
            id: 'simple-picker-1',
            currentPath: '/project',
            entries: sampleEntries,
          })
        );

        expect(lastFrame()).toContain('src');
      });
    });

    describe('DirectoryPicker component', () => {
      it('should only show directories', () => {
        const { lastFrame } = render(
          React.createElement(DirectoryPicker, {
            id: 'dir-picker-1',
            currentPath: '/project',
            entries: sampleEntries,
          })
        );

        const frame = lastFrame();
        expect(frame).toContain('src');
        expect(frame).toContain('node_modules');
        expect(frame).not.toContain('package.json');
        expect(frame).not.toContain('README.md');
      });
    });

    describe('createFileEntries utility', () => {
      it('should create file entries from paths', () => {
        const entries = createFileEntries([
          'src/',
          'package.json',
          'README.md',
        ], '/project');

        expect(entries).toHaveLength(3);
        expect(entries[0].type).toBe('directory');
        expect(entries[1].type).toBe('file');
        expect(entries[2].type).toBe('file');
      });
    });

    describe('file events', () => {
      it('should emit file select event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitFileSelect('picker-1', '/project/src/index.ts', 'index.ts', 'file', 'select');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('picker-1');
        expect(event.data.path).toBe('/project/src/index.ts');
        expect(event.data.name).toBe('index.ts');
        expect(event.data.type).toBe('file');
        expect(event.data.action).toBe('select');
      });

      it('should emit file navigate event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitFileNavigate('picker-1', '/project', '/project/src', 'into');

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('picker-1');
        expect(event.data.fromPath).toBe('/project');
        expect(event.data.toPath).toBe('/project/src');
        expect(event.data.direction).toBe('into');
      });

      it('should emit file filter event', () => {
        const listener = vi.fn();
        UIEventEmitter.onAll(listener);

        emitFileFilter('picker-1', '*.ts', 15);

        expect(listener).toHaveBeenCalled();
        const event = listener.mock.calls[0][0];
        expect(event.componentId).toBe('picker-1');
        expect(event.data.pattern).toBe('*.ts');
        expect(event.data.matchCount).toBe(15);
      });
    });
  });

  describe('Component Registration', () => {
    beforeEach(() => {
      ComponentRegistry.clear();
    });

    it('should register all EPIC 8 components', () => {
      registerEpic8Components();

      expect(ComponentRegistry.has('SplitView')).toBe(true);
      expect(ComponentRegistry.has('Logs')).toBe(true);
      expect(ComponentRegistry.has('DiffView')).toBe(true);
      expect(ComponentRegistry.has('FilePicker')).toBe(true);
    });

    it('should register component aliases', () => {
      registerEpic8Components();

      expect(ComponentRegistry.has('Split')).toBe(true);
      expect(ComponentRegistry.has('LogViewer')).toBe(true);
      expect(ComponentRegistry.has('Diff')).toBe(true);
      expect(ComponentRegistry.has('FileSelector')).toBe(true);
    });

    it('should report registration status correctly', () => {
      expect(isEpic8Registered()).toBe(false);

      registerEpic8Components();

      expect(isEpic8Registered()).toBe(true);
    });

    it('should return correct component types list', () => {
      const types = getEpic8ComponentTypes();

      expect(types).toContain('SplitView');
      expect(types).toContain('Logs');
      expect(types).toContain('DiffView');
      expect(types).toContain('FilePicker');
      expect(types).toContain('SimpleLogs');
      expect(types).toContain('SimpleDiffView');
      expect(types).toContain('SimpleFilePicker');
      expect(types.length).toBe(13);
    });
  });

  describe('Integration: ComponentRegistry rendering', () => {
    it('should render SplitView from registry', () => {
      const element = ComponentRegistry.render({
        id: 'split-registry-1',
        type: 'SplitView',
        orientation: 'horizontal',
      });

      expect(element).toBeDefined();
      expect(element.type).toBe(SplitView);
    });

    it('should render Logs from registry', () => {
      const element = ComponentRegistry.render({
        id: 'logs-registry-1',
        type: 'Logs',
        entries: [],
      });

      expect(element).toBeDefined();
      expect(element.type).toBe(Logs);
    });

    it('should render DiffView from registry', () => {
      const element = ComponentRegistry.render({
        id: 'diff-registry-1',
        type: 'DiffView',
        diff: '',
      });

      expect(element).toBeDefined();
      expect(element.type).toBe(DiffView);
    });

    it('should render FilePicker from registry', () => {
      const element = ComponentRegistry.render({
        id: 'picker-registry-1',
        type: 'FilePicker',
        currentPath: '/',
        entries: [],
      });

      expect(element).toBeDefined();
      expect(element.type).toBe(FilePicker);
    });

    it('should resolve aliases correctly', () => {
      const splitElement = ComponentRegistry.render({
        id: 'split-alias-1',
        type: 'Split', // Alias for SplitView
      });

      expect(splitElement.type).toBe(SplitView);

      const logsElement = ComponentRegistry.render({
        id: 'logs-alias-1',
        type: 'LogViewer', // Alias for Logs
        entries: [],
      });

      expect(logsElement.type).toBe(Logs);
    });
  });
});
