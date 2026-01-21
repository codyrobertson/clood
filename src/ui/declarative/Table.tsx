/**
 * Declarative Table Component (UOW-0804)
 *
 * Renders a table from declarative UILayout schema.
 */

import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';

export interface TableColumn {
  id: string;
  header: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps {
  /** Unique ID */
  id: string;
  /** Column definitions */
  columns: TableColumn[];
  /** Row data */
  rows: Array<Record<string, unknown>>;
  /** Currently selected row index */
  selectedRowIndex?: number;
  /** Whether table has focus */
  focused?: boolean;
  /** Show row numbers */
  showRowNumbers?: boolean;
  /** Show header row */
  showHeader?: boolean;
  /** Border style */
  borderStyle?: 'none' | 'single' | 'ascii';
  /** Called when row selection changes */
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
  /** Called when row is activated (Enter) */
  onRowActivate?: (row: Record<string, unknown>, index: number) => void;
}

interface BorderChars {
  h: string;
  v: string;
  tl: string;
  tr: string;
  bl: string;
  br: string;
  cross: string;
  t: string;
  b: string;
  l: string;
  r: string;
}

const BORDER_CHARS: Record<'none' | 'single' | 'ascii', BorderChars> = {
  none: { h: '', v: '', tl: '', tr: '', bl: '', br: '', cross: '', t: '', b: '', l: '', r: '' },
  single: { h: '─', v: '│', tl: '┌', tr: '┐', bl: '└', br: '┘', cross: '┼', t: '┬', b: '┴', l: '├', r: '┤' },
  ascii: { h: '-', v: '|', tl: '+', tr: '+', bl: '+', br: '+', cross: '+', t: '+', b: '+', l: '+', r: '+' },
};

export const Table: React.FC<TableProps> = ({
  id: _id,
  columns,
  rows,
  selectedRowIndex = -1,
  focused = false,
  showRowNumbers: _showRowNumbers = false,
  showHeader = true,
  borderStyle = 'single',
  onRowSelect,
  onRowActivate,
}) => {
  // Calculate column widths
  const columnWidths = useMemo(() => {
    return columns.map((col) => {
      if (typeof col.width === 'number') return col.width;

      // Auto-size based on content
      let maxWidth = col.header.length;
      for (const row of rows) {
        const value = String(row[col.id] ?? '');
        maxWidth = Math.max(maxWidth, value.length);
      }
      return Math.min(maxWidth + 2, 30); // Cap at 30
    });
  }, [columns, rows]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || rows.length === 0) return;

      if (key.upArrow || input === 'k') {
        const newIndex = Math.max(0, selectedRowIndex - 1);
        const newRow = rows[newIndex];
        if (newIndex !== selectedRowIndex && newRow) {
          onRowSelect?.(newRow, newIndex);
        }
        return;
      }

      if (key.downArrow || input === 'j') {
        const newIndex = Math.min(rows.length - 1, selectedRowIndex + 1);
        const newRow = rows[newIndex];
        if (newIndex !== selectedRowIndex && newRow) {
          onRowSelect?.(newRow, newIndex);
        }
        return;
      }

      if (input === 'g') {
        const firstRow = rows[0];
        if (firstRow) {
          onRowSelect?.(firstRow, 0);
        }
        return;
      }

      if (input === 'G') {
        const lastIndex = rows.length - 1;
        const lastRow = rows[lastIndex];
        if (lastRow) {
          onRowSelect?.(lastRow, lastIndex);
        }
        return;
      }

      if (key.return) {
        const selectedRow = rows[selectedRowIndex];
        if (selectedRowIndex >= 0 && selectedRowIndex < rows.length && selectedRow) {
          onRowActivate?.(selectedRow, selectedRowIndex);
        }
      }
    },
    { isActive: focused }
  );

  const border = BORDER_CHARS[borderStyle];

  const renderCell = (value: unknown, width: number, align: 'left' | 'center' | 'right' = 'left') => {
    const str = String(value ?? '');
    const truncated = str.length > width ? str.slice(0, width - 1) + '…' : str;
    const padding = width - truncated.length;

    switch (align) {
      case 'right':
        return ' '.repeat(padding) + truncated;
      case 'center':
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + truncated + ' '.repeat(right);
      default:
        return truncated + ' '.repeat(padding);
    }
  };

  const renderHorizontalBorder = (left: string, mid: string, right: string) => {
    if (borderStyle === 'none') return null;
    const segments = columnWidths.map((w) => border.h.repeat(w));
    return (
      <Text dimColor>
        {left}
        {segments.join(mid)}
        {right}
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      {/* Top border */}
      {borderStyle !== 'none' && renderHorizontalBorder(border.tl, border.t, border.tr)}

      {/* Header */}
      {showHeader && (
        <>
          <Box>
            {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
            {columns.map((col, i) => (
              <React.Fragment key={col.id}>
                <Text bold color="cyan">
                  {renderCell(col.header, columnWidths[i] ?? 10, col.align)}
                </Text>
                {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
              </React.Fragment>
            ))}
          </Box>
          {borderStyle !== 'none' && renderHorizontalBorder(border.l, border.cross, border.r)}
        </>
      )}

      {/* Rows */}
      {rows.map((row, rowIndex) => {
        const isSelected = rowIndex === selectedRowIndex && focused;

        return (
          <Box key={rowIndex}>
            {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
            {columns.map((col, colIndex) => (
              <React.Fragment key={col.id}>
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                  backgroundColor={isSelected ? 'blue' : undefined}
                >
                  {renderCell(row[col.id], columnWidths[colIndex] ?? 10, col.align)}
                </Text>
                {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
              </React.Fragment>
            ))}
          </Box>
        );
      })}

      {/* Bottom border */}
      {borderStyle !== 'none' && renderHorizontalBorder(border.bl, border.b, border.br)}

      {/* Empty state */}
      {rows.length === 0 && (
        <Box paddingX={1}>
          <Text dimColor italic>No data</Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Simple data table (auto-generates columns from data)
 */
export interface SimpleTableProps {
  id: string;
  data: Array<Record<string, unknown>>;
  focused?: boolean;
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
}

export const SimpleTable: React.FC<SimpleTableProps> = ({
  id,
  data,
  focused = false,
  onRowSelect,
}) => {
  // Auto-generate columns from data keys
  const columns = useMemo(() => {
    const firstRow = data[0];
    if (!firstRow) return [];
    const keys = Object.keys(firstRow);
    return keys.map((key) => ({
      id: key,
      header: key.charAt(0).toUpperCase() + key.slice(1),
    }));
  }, [data]);

  return (
    <Table
      id={id}
      columns={columns}
      rows={data}
      focused={focused}
      onRowSelect={onRowSelect}
    />
  );
};
