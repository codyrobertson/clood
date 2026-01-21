/**
 * Declarative DiffView Component (UOW-0818)
 *
 * Renders a unified diff view with line numbers, add/remove highlighting,
 * and hunk navigation.
 * Emits diff.navigate events on hunk navigation (n/p keys).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { UIEventEmitter } from './EventEmitter.js';

/**
 * Diff line type
 */
export type DiffLineType = 'context' | 'add' | 'remove' | 'header' | 'hunk';

/**
 * Diff line interface
 */
export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

/**
 * Diff hunk interface
 */
export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  header: string;
  lines: DiffLine[];
}

/**
 * Diff file interface
 */
export interface DiffFile {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  status?: 'added' | 'modified' | 'deleted' | 'renamed';
}

/**
 * Diff navigation UI event
 */
export interface DiffNavigateUIEvent {
  type: 'diff.navigate';
  componentId: string;
  timestamp: string;
  data: {
    hunkIndex: number;
    direction: 'next' | 'previous' | 'first' | 'last';
    hunkHeader?: string;
  };
}

/**
 * Diff select UI event
 */
export interface DiffSelectUIEvent {
  type: 'diff.select';
  componentId: string;
  timestamp: string;
  data: {
    lineIndex: number;
    line: DiffLine;
  };
}

/**
 * Emit diff navigate event
 */
export function emitDiffNavigate(
  componentId: string,
  hunkIndex: number,
  direction: 'next' | 'previous' | 'first' | 'last',
  hunkHeader?: string
): void {
  UIEventEmitter.emit({
    type: 'diff.navigate' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { hunkIndex, direction, hunkHeader },
  });
}

/**
 * Emit diff select event
 */
export function emitDiffSelect(
  componentId: string,
  lineIndex: number,
  line: DiffLine
): void {
  UIEventEmitter.emit({
    type: 'diff.select' as 'button.click', // Type workaround for extensibility
    componentId,
    data: { lineIndex, line },
  });
}

export interface DiffViewProps {
  /** Unique component ID */
  id: string;
  /** Diff content - either parsed or raw unified diff string */
  diff: DiffFile | DiffFile[] | string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Line number width */
  lineNumberWidth?: number;
  /** Show file headers */
  showFileHeaders?: boolean;
  /** Show hunk headers */
  showHunkHeaders?: boolean;
  /** Maximum visible lines */
  maxVisible?: number;
  /** Color for added lines */
  addColor?: string;
  /** Color for removed lines */
  removeColor?: string;
  /** Color for context lines */
  contextColor?: string;
  /** Color for hunk headers */
  hunkColor?: string;
  /** Whether component is visible */
  visible?: boolean;
  /** Whether component has focus */
  focused?: boolean;
  /** Show navigation help */
  showHelp?: boolean;
  /** Currently selected line index */
  selectedLine?: number;
  /** Called when hunk navigation occurs */
  onNavigate?: (hunkIndex: number, direction: 'next' | 'previous') => void;
  /** Called when line is selected */
  onSelectLine?: (lineIndex: number, line: DiffLine) => void;
}

/**
 * Parse a unified diff string into structured format
 */
export function parseUnifiedDiff(diffText: string): DiffFile[] {
  const files: DiffFile[] = [];
  const lines = diffText.split('\n');
  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // File header: --- a/path/to/file
    if (line.startsWith('--- ')) {
      if (currentFile && currentFile.hunks.length > 0) {
        files.push(currentFile);
      }
      currentFile = {
        oldPath: line.slice(4).replace(/^a\//, ''),
        newPath: '',
        hunks: [],
        status: 'modified',
      };
      currentHunk = null;
      continue;
    }

    // File header: +++ b/path/to/file
    if (line.startsWith('+++ ') && currentFile) {
      currentFile.newPath = line.slice(4).replace(/^b\//, '');

      // Detect file status
      if (currentFile.oldPath === '/dev/null') {
        currentFile.status = 'added';
      } else if (currentFile.newPath === '/dev/null') {
        currentFile.status = 'deleted';
      } else if (currentFile.oldPath !== currentFile.newPath) {
        currentFile.status = 'renamed';
      }
      continue;
    }

    // Hunk header: @@ -1,5 +1,6 @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
    if (hunkMatch && currentFile) {
      if (currentHunk) {
        currentFile.hunks.push(currentHunk);
      }

      oldLine = parseInt(hunkMatch[1] ?? '1', 10);
      newLine = parseInt(hunkMatch[3] ?? '1', 10);

      currentHunk = {
        oldStart: oldLine,
        oldCount: parseInt(hunkMatch[2] ?? '1', 10),
        newStart: newLine,
        newCount: parseInt(hunkMatch[4] ?? '1', 10),
        header: line,
        lines: [],
      };

      currentHunk.lines.push({
        type: 'hunk',
        content: line,
      });
      continue;
    }

    // Diff lines
    if (currentHunk) {
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++,
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        });
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1) || '',
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }
  }

  // Push final file and hunk
  if (currentHunk && currentFile) {
    currentFile.hunks.push(currentHunk);
  }
  if (currentFile && currentFile.hunks.length > 0) {
    files.push(currentFile);
  }

  return files;
}

/**
 * Flatten diff files into a single array of lines with indices
 */
interface FlattenedLine {
  line: DiffLine;
  fileIndex: number;
  hunkIndex: number;
  lineIndex: number;
  isHunkStart: boolean;
}

function flattenDiff(files: DiffFile[]): FlattenedLine[] {
  const result: FlattenedLine[] = [];

  files.forEach((file, fileIndex) => {
    // Add file header
    result.push({
      line: {
        type: 'header',
        content: file.status === 'renamed'
          ? `${file.oldPath} -> ${file.newPath}`
          : file.newPath || file.oldPath,
      },
      fileIndex,
      hunkIndex: -1,
      lineIndex: result.length,
      isHunkStart: false,
    });

    file.hunks.forEach((hunk, hunkIndex) => {
      hunk.lines.forEach((line, lineInHunk) => {
        result.push({
          line,
          fileIndex,
          hunkIndex,
          lineIndex: result.length,
          isHunkStart: lineInHunk === 0,
        });
      });
    });
  });

  return result;
}

export const DiffView: React.FC<DiffViewProps> = ({
  id,
  diff,
  showLineNumbers = true,
  lineNumberWidth = 4,
  showFileHeaders = true,
  showHunkHeaders = true,
  maxVisible = 30,
  addColor = 'green',
  removeColor = 'red',
  contextColor,
  hunkColor = 'cyan',
  visible = true,
  focused = false,
  showHelp = true,
  selectedLine: controlledSelectedLine,
  onNavigate,
  onSelectLine,
}) => {
  // Parse diff if string
  const parsedFiles = useMemo(() => {
    if (typeof diff === 'string') {
      return parseUnifiedDiff(diff);
    }
    return Array.isArray(diff) ? diff : [diff];
  }, [diff]);

  // Flatten for display
  const flattenedLines = useMemo(() => flattenDiff(parsedFiles), [parsedFiles]);

  // Find hunk start indices
  const hunkStartIndices = useMemo(() => {
    return flattenedLines
      .map((fl, idx) => (fl.isHunkStart ? idx : -1))
      .filter((idx) => idx >= 0);
  }, [flattenedLines]);

  // State for selection and scrolling
  const [internalSelectedLine, setInternalSelectedLine] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const selectedLineIndex = controlledSelectedLine ?? internalSelectedLine;

  // Current hunk index
  const currentHunkIndex = useMemo(() => {
    for (let i = hunkStartIndices.length - 1; i >= 0; i--) {
      const hunkStartIdx = hunkStartIndices[i];
      if (hunkStartIdx !== undefined && selectedLineIndex >= hunkStartIdx) {
        return i;
      }
    }
    return 0;
  }, [selectedLineIndex, hunkStartIndices]);

  // Navigate to hunk
  const navigateToHunk = useCallback(
    (direction: 'next' | 'previous' | 'first' | 'last') => {
      let targetHunkIndex: number;

      switch (direction) {
        case 'next':
          targetHunkIndex = Math.min(currentHunkIndex + 1, hunkStartIndices.length - 1);
          break;
        case 'previous':
          targetHunkIndex = Math.max(currentHunkIndex - 1, 0);
          break;
        case 'first':
          targetHunkIndex = 0;
          break;
        case 'last':
          targetHunkIndex = hunkStartIndices.length - 1;
          break;
      }

      const targetLine = hunkStartIndices[targetHunkIndex];
      if (targetLine !== undefined && targetLine !== selectedLineIndex) {
        setInternalSelectedLine(targetLine);
        onNavigate?.(targetHunkIndex, direction === 'next' || direction === 'last' ? 'next' : 'previous');

        const hunkHeader = flattenedLines[targetLine]?.line.content;
        emitDiffNavigate(id, targetHunkIndex, direction, hunkHeader);

        // Adjust scroll to show the hunk
        if (targetLine < scrollOffset) {
          setScrollOffset(targetLine);
        } else if (targetLine >= scrollOffset + maxVisible) {
          setScrollOffset(targetLine - maxVisible + 1);
        }
      }
    },
    [currentHunkIndex, hunkStartIndices, selectedLineIndex, id, flattenedLines, onNavigate, scrollOffset, maxVisible]
  );

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused) return;

      // Hunk navigation
      if (input === 'n') {
        navigateToHunk('next');
        return;
      }
      if (input === 'p') {
        navigateToHunk('previous');
        return;
      }
      if (input === '[') {
        navigateToHunk('first');
        return;
      }
      if (input === ']') {
        navigateToHunk('last');
        return;
      }

      // Line navigation
      if (key.upArrow || input === 'k') {
        const newLine = Math.max(0, selectedLineIndex - 1);
        if (newLine !== selectedLineIndex) {
          setInternalSelectedLine(newLine);
          const fl = flattenedLines[newLine];
          if (fl) {
            onSelectLine?.(newLine, fl.line);
            emitDiffSelect(id, newLine, fl.line);
          }

          // Scroll up if needed
          if (newLine < scrollOffset) {
            setScrollOffset(newLine);
          }
        }
        return;
      }
      if (key.downArrow || input === 'j') {
        const newLine = Math.min(flattenedLines.length - 1, selectedLineIndex + 1);
        if (newLine !== selectedLineIndex) {
          setInternalSelectedLine(newLine);
          const fl = flattenedLines[newLine];
          if (fl) {
            onSelectLine?.(newLine, fl.line);
            emitDiffSelect(id, newLine, fl.line);
          }

          // Scroll down if needed
          if (newLine >= scrollOffset + maxVisible) {
            setScrollOffset(newLine - maxVisible + 1);
          }
        }
        return;
      }

      // Jump to top/bottom
      if (input === 'g') {
        setInternalSelectedLine(0);
        setScrollOffset(0);
        const fl = flattenedLines[0];
        if (fl) {
          onSelectLine?.(0, fl.line);
          emitDiffSelect(id, 0, fl.line);
        }
        return;
      }
      if (input === 'G') {
        const lastLine = flattenedLines.length - 1;
        setInternalSelectedLine(lastLine);
        setScrollOffset(Math.max(0, lastLine - maxVisible + 1));
        const fl = flattenedLines[lastLine];
        if (fl) {
          onSelectLine?.(lastLine, fl.line);
          emitDiffSelect(id, lastLine, fl.line);
        }
        return;
      }

      // Page up/down
      if (key.pageUp) {
        const newLine = Math.max(0, selectedLineIndex - maxVisible);
        setInternalSelectedLine(newLine);
        setScrollOffset(Math.max(0, scrollOffset - maxVisible));
        return;
      }
      if (key.pageDown) {
        const newLine = Math.min(flattenedLines.length - 1, selectedLineIndex + maxVisible);
        setInternalSelectedLine(newLine);
        setScrollOffset(Math.min(flattenedLines.length - maxVisible, scrollOffset + maxVisible));
        return;
      }
    },
    { isActive: focused }
  );

  if (!visible) {
    return null;
  }

  // Calculate visible lines
  const visibleLines = flattenedLines.slice(scrollOffset, scrollOffset + maxVisible);

  // Format line number
  const formatLineNumber = (num: number | undefined): string => {
    if (num === undefined) return ' '.repeat(lineNumberWidth);
    return String(num).padStart(lineNumberWidth, ' ');
  };

  // Render a single line
  const renderLine = (fl: FlattenedLine, displayIndex: number) => {
    const { line } = fl;
    const isSelected = fl.lineIndex === selectedLineIndex;
    const actualIndex = scrollOffset + displayIndex;

    // Determine colors and prefix
    let textColor: string | undefined;
    let prefix = ' ';

    switch (line.type) {
      case 'header':
        if (!showFileHeaders) return null;
        return (
          <Box key={actualIndex}>
            <Text color="yellow" bold>
              {line.content}
            </Text>
          </Box>
        );

      case 'hunk':
        if (!showHunkHeaders) return null;
        return (
          <Box key={actualIndex}>
            <Text color={hunkColor} dimColor={!focused} inverse={isSelected && focused}>
              {line.content}
            </Text>
          </Box>
        );

      case 'add':
        textColor = addColor;
        prefix = '+';
        break;

      case 'remove':
        textColor = removeColor;
        prefix = '-';
        break;

      case 'context':
        textColor = contextColor;
        prefix = ' ';
        break;
    }

    return (
      <Box key={actualIndex}>
        {/* Line numbers */}
        {showLineNumbers && (
          <>
            <Text dimColor inverse={isSelected && focused}>
              {formatLineNumber(line.oldLineNumber)}
            </Text>
            <Text dimColor> </Text>
            <Text dimColor inverse={isSelected && focused}>
              {formatLineNumber(line.newLineNumber)}
            </Text>
            <Text dimColor> </Text>
          </>
        )}

        {/* Prefix and content */}
        <Text color={textColor} bold={isSelected && focused} inverse={isSelected && focused}>
          {prefix}
        </Text>
        <Text color={textColor} inverse={isSelected && focused}>{line.content}</Text>
      </Box>
    );
  };

  // Scroll indicators
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + maxVisible < flattenedLines.length;

  return (
    <Box flexDirection="column">
      {/* Stats header */}
      <Box marginBottom={1}>
        <Text dimColor>
          {parsedFiles.length} file(s) | {hunkStartIndices.length} hunk(s) |{' '}
          {flattenedLines.filter((fl) => fl.line.type === 'add').length} additions |{' '}
          {flattenedLines.filter((fl) => fl.line.type === 'remove').length} deletions
        </Text>
      </Box>

      {/* Scroll up indicator */}
      {canScrollUp && (
        <Text dimColor>{'  '}{'▲'} {scrollOffset} more lines above</Text>
      )}

      {/* Diff lines */}
      {visibleLines.map((fl, idx) => renderLine(fl, idx))}

      {/* Scroll down indicator */}
      {canScrollDown && (
        <Text dimColor>
          {'  '}{'▼'} {flattenedLines.length - scrollOffset - maxVisible} more lines below
        </Text>
      )}

      {/* Empty state */}
      {flattenedLines.length === 0 && (
        <Text dimColor>No diff content</Text>
      )}

      {/* Help hints */}
      {showHelp && focused && (
        <Box marginTop={1}>
          <Text dimColor>
            n/p: next/prev hunk | j/k: scroll | [/]: first/last hunk | g/G: top/bottom
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple diff viewer with minimal options
 */
export interface SimpleDiffViewProps {
  id: string;
  diff: string;
  maxVisible?: number;
  focused?: boolean;
}

export const SimpleDiffView: React.FC<SimpleDiffViewProps> = ({
  id,
  diff,
  maxVisible = 20,
  focused = false,
}) => {
  return (
    <DiffView
      id={id}
      diff={diff}
      maxVisible={maxVisible}
      focused={focused}
      showHelp={false}
      showLineNumbers={true}
    />
  );
};

/**
 * Side-by-side diff view (two-column layout)
 */
export interface SideBySideDiffProps {
  id: string;
  diff: DiffFile | string;
  width?: number;
  maxVisible?: number;
  focused?: boolean;
  visible?: boolean;
}

export const SideBySideDiff: React.FC<SideBySideDiffProps> = ({
  id: _id,
  diff,
  width = 80,
  maxVisible = 20,
  focused = false,
  visible = true,
}) => {
  // Parse diff if string
  const parsedFiles = useMemo(() => {
    if (typeof diff === 'string') {
      return parseUnifiedDiff(diff);
    }
    return [diff];
  }, [diff]);

  const [scrollOffset, setScrollOffset] = useState(0);

  // Build side-by-side lines
  const sideBySideLines = useMemo(() => {
    const result: Array<{
      left: DiffLine | null;
      right: DiffLine | null;
    }> = [];

    for (const file of parsedFiles) {
      for (const hunk of file.hunks) {
        let leftLines: DiffLine[] = [];
        let rightLines: DiffLine[] = [];

        for (const line of hunk.lines) {
          if (line.type === 'hunk') {
            // Flush accumulated lines
            while (leftLines.length > 0 || rightLines.length > 0) {
              result.push({
                left: leftLines.shift() || null,
                right: rightLines.shift() || null,
              });
            }
            result.push({ left: line, right: line });
          } else if (line.type === 'remove') {
            leftLines.push(line);
          } else if (line.type === 'add') {
            rightLines.push(line);
          } else {
            // Context line - flush first
            while (leftLines.length > 0 || rightLines.length > 0) {
              result.push({
                left: leftLines.shift() || null,
                right: rightLines.shift() || null,
              });
            }
            result.push({ left: line, right: line });
          }
        }

        // Flush remaining
        while (leftLines.length > 0 || rightLines.length > 0) {
          result.push({
            left: leftLines.shift() || null,
            right: rightLines.shift() || null,
          });
        }
      }
    }

    return result;
  }, [parsedFiles]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!focused) return;

      if (key.upArrow || input === 'k') {
        setScrollOffset((o) => Math.max(0, o - 1));
      }
      if (key.downArrow || input === 'j') {
        setScrollOffset((o) => Math.min(sideBySideLines.length - maxVisible, o + 1));
      }
      if (input === 'g') {
        setScrollOffset(0);
      }
      if (input === 'G') {
        setScrollOffset(Math.max(0, sideBySideLines.length - maxVisible));
      }
    },
    { isActive: focused }
  );

  if (!visible) return null;

  const columnWidth = Math.floor((width - 3) / 2);
  const visibleLines = sideBySideLines.slice(scrollOffset, scrollOffset + maxVisible);

  const renderColumn = (line: DiffLine | null, colWidth: number) => {
    if (!line) {
      return <Text dimColor>{' '.repeat(colWidth)}</Text>;
    }

    if (line.type === 'hunk') {
      return (
        <Text color="cyan" dimColor>
          {line.content.slice(0, colWidth).padEnd(colWidth)}
        </Text>
      );
    }

    const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';
    const color = line.type === 'add' ? 'green' : line.type === 'remove' ? 'red' : undefined;
    const content = (prefix + line.content).slice(0, colWidth).padEnd(colWidth);

    return <Text color={color}>{content}</Text>;
  };

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text bold color="yellow">
          {'Old'.padEnd(columnWidth)}
        </Text>
        <Text dimColor> | </Text>
        <Text bold color="yellow">
          {'New'.padEnd(columnWidth)}
        </Text>
      </Box>
      <Text dimColor>{'─'.repeat(width)}</Text>

      {/* Lines */}
      {visibleLines.map((pair, idx) => (
        <Box key={scrollOffset + idx}>
          {renderColumn(pair.left, columnWidth)}
          <Text dimColor> | </Text>
          {renderColumn(pair.right, columnWidth)}
        </Box>
      ))}

      {/* Scroll indicators */}
      {scrollOffset > 0 && <Text dimColor>{'▲'} more above</Text>}
      {scrollOffset + maxVisible < sideBySideLines.length && (
        <Text dimColor>{'▼'} more below</Text>
      )}
    </Box>
  );
};
