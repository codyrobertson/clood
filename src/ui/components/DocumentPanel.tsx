/**
 * Document Panel Component
 *
 * Displays large text documents (code files, markdown, etc.)
 * with scrolling support and optional syntax highlighting.
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Document } from '../../types/index.js';
import { useStore } from '../../store/index.js';

export interface DocumentPanelProps {
  document: Document;
  width: number;
  height: number;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  document,
  width,
  height,
}) => {
  const scrollOffset = useStore((s) => s.documentScrollOffset);

  // Split content into lines
  const lines = useMemo(() => {
    return document.content.split('\n');
  }, [document.content]);

  // Calculate visible lines
  const visibleHeight = height - 3; // Account for header and footer
  const visibleLines = lines.slice(scrollOffset, scrollOffset + visibleHeight);
  const startLine = scrollOffset + 1;

  // Calculate line number width for padding
  const lineNumberWidth = String(lines.length).length;

  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="single"
      borderColor="blue"
    >
      {/* Document header */}
      <Box justifyContent="space-between" paddingX={1} borderBottom>
        <Text bold color="blue">{document.title}</Text>
        <Text dimColor>
          {document.language ? `[${document.language}] ` : ''}
          Line {startLine}-{Math.min(scrollOffset + visibleHeight, lines.length)} of {lines.length}
        </Text>
      </Box>

      {/* Document content */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {visibleLines.map((line, index) => {
          const lineNumber = scrollOffset + index + 1;
          const paddedLineNumber = String(lineNumber).padStart(lineNumberWidth, ' ');

          return (
            <Box key={lineNumber}>
              <Text dimColor>{paddedLineNumber} </Text>
              <Text>{line || ' '}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Scroll indicators */}
      <Box justifyContent="space-between" paddingX={1}>
        <Text dimColor>
          {scrollOffset > 0 ? '▲ More above' : ''}
        </Text>
        <Text dimColor>
          {scrollOffset + visibleHeight < lines.length ? '▼ More below' : ''}
        </Text>
      </Box>
    </Box>
  );
};
