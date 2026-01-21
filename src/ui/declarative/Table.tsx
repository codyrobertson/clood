/**
 * Declarative Table Component (UOW-0804, UOW-0814, UOW-0832)
 *
 * Renders a table from declarative UILayout schema.
 * Features:
 * - Row selection (emit table.select)
 * - Column sorting indicators
 * - Responsive column widths
 * - Row highlighting and striping
 * - Cell formatting
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import stringWidth from 'string-width';
import { emitTableSelect, emitTableActivate, UIEventEmitter } from './EventEmitter.js';

export type SortDirection = 'asc' | 'desc' | 'none';
export type ColumnAlign = 'left' | 'center' | 'right';

export interface TableColumn {
  id: string;
  header: string;
  /** Fixed width or 'auto' for responsive */
  width?: number | string;
  /** Minimum width when responsive */
  minWidth?: number;
  /** Maximum width when responsive */
  maxWidth?: number;
  /** Text alignment */
  align?: ColumnAlign;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Custom cell renderer key */
  format?: 'string' | 'number' | 'date' | 'boolean' | 'status';
  /** Hide column */
  hidden?: boolean;
}

export interface TableProps {
  /** Unique ID */
  id: string;
  /** Column definitions */
  columns: TableColumn[];
  /** Row data */
  rows: Array<Record<string, unknown>>;
  /** Currently selected row index (-1 for none) */
  selectedRowIndex?: number;
  /** Selected row indices for multi-select */
  selectedRowIndices?: number[];
  /** Enable multi-row selection */
  multiSelect?: boolean;
  /** Whether table has focus */
  focused?: boolean;
  /** Show row numbers */
  showRowNumbers?: boolean;
  /** Show header row */
  showHeader?: boolean;
  /** Enable zebra striping */
  striped?: boolean;
  /** Border style */
  borderStyle?: 'none' | 'single' | 'ascii' | 'double' | 'rounded';
  /** Maximum visible rows (enables scrolling) */
  maxRows?: number;
  /** Available width for responsive columns */
  availableWidth?: number;
  /** Page size for page navigation */
  pageSize?: number;
  /** Empty table message */
  emptyMessage?: string;
  /** Currently sorted column ID */
  sortColumn?: string;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Highlight row on hover (cursor) */
  highlightOnFocus?: boolean;
  /** Called when row selection changes */
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
  /** Called when row is activated (Enter) */
  onRowActivate?: (row: Record<string, unknown>, index: number) => void;
  /** Called when sort changes */
  onSort?: (columnId: string, direction: SortDirection) => void;
  /** Called when multi-selection changes */
  onSelectionChange?: (indices: number[]) => void;
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

const BORDER_CHARS: Record<'none' | 'single' | 'ascii' | 'double' | 'rounded', BorderChars> = {
  none: { h: '', v: '', tl: '', tr: '', bl: '', br: '', cross: '', t: '', b: '', l: '', r: '' },
  single: { h: '\u2500', v: '\u2502', tl: '\u250C', tr: '\u2510', bl: '\u2514', br: '\u2518', cross: '\u253C', t: '\u252C', b: '\u2534', l: '\u251C', r: '\u2524' },
  ascii: { h: '-', v: '|', tl: '+', tr: '+', bl: '+', br: '+', cross: '+', t: '+', b: '+', l: '+', r: '+' },
  double: { h: '\u2550', v: '\u2551', tl: '\u2554', tr: '\u2557', bl: '\u255A', br: '\u255D', cross: '\u256C', t: '\u2566', b: '\u2569', l: '\u2560', r: '\u2563' },
  rounded: { h: '\u2500', v: '\u2502', tl: '\u256D', tr: '\u256E', bl: '\u2570', br: '\u256F', cross: '\u253C', t: '\u252C', b: '\u2534', l: '\u251C', r: '\u2524' },
};

/**
 * Sort direction indicators
 */
const SORT_INDICATORS: Record<SortDirection, string> = {
  asc: ' \u25B2',
  desc: ' \u25BC',
  none: '',
};

/**
 * Format a cell value based on format type
 */
function formatCellValue(value: unknown, format?: TableColumn['format']): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (format) {
    case 'number':
      return typeof value === 'number' ? value.toLocaleString() : String(value);
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
      }
      return String(value);
    case 'boolean':
      return value ? '\u2713' : '\u2717';
    case 'status':
      // Map common status values to indicators
      const status = String(value).toLowerCase();
      if (['success', 'done', 'complete', 'active', 'ok'].includes(status)) {
        return '\u25CF ' + value;
      }
      if (['error', 'failed', 'failure'].includes(status)) {
        return '\u25CF ' + value;
      }
      if (['warning', 'pending', 'waiting'].includes(status)) {
        return '\u25CF ' + value;
      }
      return '\u25CB ' + value;
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Get status color for a value
 */
function getStatusColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const status = value.toLowerCase();
  if (['success', 'done', 'complete', 'active', 'ok', 'true'].includes(status)) {
    return 'green';
  }
  if (['error', 'failed', 'failure', 'false'].includes(status)) {
    return 'red';
  }
  if (['warning', 'pending', 'waiting'].includes(status)) {
    return 'yellow';
  }
  return undefined;
}

/**
 * Calculate responsive column widths
 */
function calculateResponsiveWidths(
  columns: TableColumn[],
  rows: Array<Record<string, unknown>>,
  availableWidth: number
): number[] {
  const visibleColumns = columns.filter(c => !c.hidden);

  // First pass: calculate natural widths
  const naturalWidths = visibleColumns.map(col => {
    if (typeof col.width === 'number') {
      return col.width;
    }

    // Calculate based on content
    let maxWidth = stringWidth(col.header) + (col.sortable ? 2 : 0);
    for (const row of rows) {
      const value = formatCellValue(row[col.id], col.format);
      maxWidth = Math.max(maxWidth, stringWidth(value));
    }

    // Apply min/max constraints
    maxWidth = Math.max(maxWidth, col.minWidth || 3);
    maxWidth = Math.min(maxWidth, col.maxWidth || 50);

    return maxWidth + 2; // Add padding
  });

  // Calculate total natural width
  const totalNatural = naturalWidths.reduce((sum, w) => sum + w, 0);
  const borderOverhead = visibleColumns.length + 1; // Vertical borders

  // If everything fits, use natural widths
  if (totalNatural + borderOverhead <= availableWidth) {
    return naturalWidths;
  }

  // Need to shrink columns proportionally
  const targetWidth = availableWidth - borderOverhead;
  const ratio = targetWidth / totalNatural;

  return naturalWidths.map((width, i) => {
    const col = visibleColumns[i];
    let newWidth = Math.floor(width * ratio);
    // Apply minimum constraints
    newWidth = Math.max(newWidth, col?.minWidth || 3);
    return newWidth;
  });
}

export const Table: React.FC<TableProps> = ({
  id,
  columns,
  rows,
  selectedRowIndex: controlledSelectedRowIndex,
  selectedRowIndices: controlledSelectedRowIndices,
  multiSelect = false,
  focused = false,
  showRowNumbers = false,
  showHeader = true,
  striped = false,
  borderStyle = 'single',
  maxRows,
  availableWidth = 80,
  pageSize = 10,
  emptyMessage = 'No data',
  sortColumn: controlledSortColumn,
  sortDirection: controlledSortDirection,
  highlightOnFocus = true,
  onRowSelect,
  onRowActivate,
  onSort,
  onSelectionChange,
}) => {
  // Internal state
  const [internalSelectedRowIndex, setInternalSelectedRowIndex] = useState(0);
  const [internalSelectedRowIndices, setInternalSelectedRowIndices] = useState<number[]>([]);
  const [internalSortColumn, setInternalSortColumn] = useState<string | undefined>();
  const [internalSortDirection, setInternalSortDirection] = useState<SortDirection>('none');
  const [scrollOffset, setScrollOffset] = useState(0);

  // Use controlled or internal state
  const selectedRowIndex = controlledSelectedRowIndex ?? internalSelectedRowIndex;
  const selectedRowIndices = controlledSelectedRowIndices ?? internalSelectedRowIndices;
  const sortColumn = controlledSortColumn ?? internalSortColumn;
  const sortDirection = controlledSortDirection ?? internalSortDirection;

  // Filter out hidden columns
  const visibleColumns = useMemo(() => {
    return columns.filter(c => !c.hidden);
  }, [columns]);

  // Calculate column widths (responsive)
  const columnWidths = useMemo(() => {
    const rowNumWidth = showRowNumbers ? String(rows.length).length + 2 : 0;
    const effectiveWidth = availableWidth - rowNumWidth;
    return calculateResponsiveWidths(visibleColumns, rows, effectiveWidth);
  }, [visibleColumns, rows, availableWidth, showRowNumbers]);

  // Calculate visible rows for scrolling
  const { visibleRows, effectiveScrollOffset } = useMemo(() => {
    if (!maxRows || rows.length <= maxRows) {
      return { visibleRows: rows, effectiveScrollOffset: 0 };
    }

    // Keep selected row in view
    let offset = scrollOffset;
    if (selectedRowIndex >= offset + maxRows) {
      offset = selectedRowIndex - maxRows + 1;
    }
    if (selectedRowIndex < offset) {
      offset = selectedRowIndex;
    }
    offset = Math.max(0, Math.min(offset, rows.length - maxRows));

    return {
      visibleRows: rows.slice(offset, offset + maxRows),
      effectiveScrollOffset: offset,
    };
  }, [rows, selectedRowIndex, maxRows, scrollOffset]);

  // Navigation helper
  const navigateTo = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(rows.length - 1, newIndex));
    const newRow = rows[clampedIndex];
    if (clampedIndex !== selectedRowIndex && newRow) {
      setInternalSelectedRowIndex(clampedIndex);
      emitTableSelect(id, clampedIndex, newRow);
      onRowSelect?.(newRow, clampedIndex);
    }
  }, [id, rows, selectedRowIndex, onRowSelect]);

  // Toggle row selection for multi-select
  const toggleRowSelection = useCallback((index: number) => {
    const newIndices = selectedRowIndices.includes(index)
      ? selectedRowIndices.filter(i => i !== index)
      : [...selectedRowIndices, index];
    setInternalSelectedRowIndices(newIndices);
    onSelectionChange?.(newIndices);
  }, [selectedRowIndices, onSelectionChange]);

  // Handle sort click
  const handleSortClick = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId);
    if (!col?.sortable) return;

    let newDirection: SortDirection = 'asc';
    if (sortColumn === columnId) {
      if (sortDirection === 'asc') newDirection = 'desc';
      else if (sortDirection === 'desc') newDirection = 'none';
    }

    setInternalSortColumn(newDirection === 'none' ? undefined : columnId);
    setInternalSortDirection(newDirection);

    // Emit sort event
    UIEventEmitter.emit({
      type: 'table.select',
      componentId: id,
      data: {
        action: 'sort',
        columnId,
        direction: newDirection,
      },
    });

    onSort?.(columnId, newDirection);
  }, [id, columns, sortColumn, sortDirection, onSort]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!focused || rows.length === 0) return;

      // Navigate up
      if (key.upArrow || input === 'k') {
        navigateTo(selectedRowIndex - 1);
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        navigateTo(selectedRowIndex + 1);
        return;
      }

      // Page up
      if (key.pageUp || (key.ctrl && input === 'u')) {
        navigateTo(selectedRowIndex - pageSize);
        setScrollOffset(Math.max(0, scrollOffset - pageSize));
        return;
      }

      // Page down
      if (key.pageDown || (key.ctrl && input === 'd')) {
        navigateTo(selectedRowIndex + pageSize);
        setScrollOffset(Math.min(rows.length - (maxRows || rows.length), scrollOffset + pageSize));
        return;
      }

      // Jump to start (vim 'g')
      if (input === 'g') {
        navigateTo(0);
        setScrollOffset(0);
        return;
      }

      // Jump to end (vim 'G')
      if (input === 'G') {
        navigateTo(rows.length - 1);
        return;
      }

      // Toggle row selection in multi-select mode
      if (multiSelect && input === ' ') {
        toggleRowSelection(selectedRowIndex);
        return;
      }

      // Select all (multi-select)
      if (multiSelect && key.ctrl && input === 'a') {
        const allIndices = rows.map((_, i) => i);
        setInternalSelectedRowIndices(allIndices);
        onSelectionChange?.(allIndices);
        return;
      }

      // Activate row
      if (key.return) {
        const selectedRow = rows[selectedRowIndex];
        if (selectedRowIndex >= 0 && selectedRowIndex < rows.length && selectedRow) {
          emitTableActivate(id, selectedRowIndex, selectedRow);
          onRowActivate?.(selectedRow, selectedRowIndex);
        }
        return;
      }

      // Sort by column (number keys 1-9)
      if (/^[1-9]$/.test(input)) {
        const colIndex = parseInt(input, 10) - 1;
        const col = visibleColumns[colIndex];
        if (col?.sortable) {
          handleSortClick(col.id);
        }
        return;
      }
    },
    { isActive: focused }
  );

  const border = BORDER_CHARS[borderStyle];

  const renderCell = (value: unknown, width: number, align: ColumnAlign = 'left', format?: TableColumn['format']) => {
    const str = formatCellValue(value, format);
    const visualWidth = stringWidth(str);

    if (visualWidth > width) {
      // Need to truncate
      let truncated = '';
      let currentWidth = 0;
      for (const char of str) {
        const charWidth = stringWidth(char);
        if (currentWidth + charWidth > width - 1) break;
        truncated += char;
        currentWidth += charWidth;
      }
      return truncated + '\u2026';
    }

    const padding = width - visualWidth;
    switch (align) {
      case 'right':
        return ' '.repeat(padding) + str;
      case 'center': {
        const left = Math.floor(padding / 2);
        const right = padding - left;
        return ' '.repeat(left) + str + ' '.repeat(right);
      }
      default:
        return str + ' '.repeat(padding);
    }
  };

  const renderHorizontalBorder = (left: string, mid: string, right: string, includeRowNum: boolean = true) => {
    if (borderStyle === 'none') return null;
    const rowNumWidth = showRowNumbers ? String(rows.length).length + 2 : 0;
    const segments: string[] = [];

    if (includeRowNum && showRowNumbers) {
      segments.push(border.h.repeat(rowNumWidth));
    }
    segments.push(...columnWidths.map((w) => border.h.repeat(w)));

    return (
      <Text dimColor>
        {left}
        {segments.join(mid)}
        {right}
      </Text>
    );
  };

  const isRowSelected = (index: number) => {
    if (multiSelect) {
      return selectedRowIndices.includes(index);
    }
    return index === selectedRowIndex;
  };

  const rowNumWidth = showRowNumbers ? String(rows.length).length + 2 : 0;

  return (
    <Box flexDirection="column">
      {/* Top border */}
      {borderStyle !== 'none' && renderHorizontalBorder(border.tl, border.t, border.tr)}

      {/* Header */}
      {showHeader && (
        <>
          <Box>
            {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
            {showRowNumbers && (
              <>
                <Text bold color="gray">
                  {renderCell('#', rowNumWidth)}
                </Text>
                {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
              </>
            )}
            {visibleColumns.map((col, i) => {
              const isSorted = sortColumn === col.id && sortDirection !== 'none';
              const sortIndicator = isSorted ? SORT_INDICATORS[sortDirection] : (col.sortable ? ' \u25BD' : '');
              const headerText = col.header + sortIndicator;

              return (
                <React.Fragment key={col.id}>
                  <Text
                    bold
                    color={isSorted ? 'cyan' : 'white'}
                  >
                    {renderCell(headerText, columnWidths[i] ?? 10, col.align)}
                  </Text>
                  {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
                </React.Fragment>
              );
            })}
          </Box>
          {borderStyle !== 'none' && renderHorizontalBorder(border.l, border.cross, border.r)}
        </>
      )}

      {/* Scroll indicator - top */}
      {maxRows && effectiveScrollOffset > 0 && (
        <Box justifyContent="center">
          <Text dimColor>\u25B2 {effectiveScrollOffset} more rows above</Text>
        </Box>
      )}

      {/* Rows */}
      {visibleRows.map((row, visibleIndex) => {
        const actualIndex = effectiveScrollOffset + visibleIndex;
        const isSelected = isRowSelected(actualIndex);
        const isCursor = actualIndex === selectedRowIndex && focused;
        const isStriped = striped && actualIndex % 2 === 1;

        return (
          <Box key={actualIndex}>
            {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}

            {/* Row number */}
            {showRowNumbers && (
              <>
                <Text
                  dimColor
                  backgroundColor={isCursor && highlightOnFocus ? 'blue' : undefined}
                >
                  {renderCell(actualIndex + 1, rowNumWidth, 'right')}
                </Text>
                {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
              </>
            )}

            {/* Multi-select checkbox */}
            {multiSelect && (
              <Text color={isSelected ? 'green' : 'gray'}>
                {isSelected ? '\u25C9' : '\u25CB'}
              </Text>
            )}

            {/* Cells */}
            {visibleColumns.map((col, colIndex) => {
              const cellValue = row[col.id];
              const statusColor = col.format === 'status' ? getStatusColor(cellValue) : undefined;

              return (
                <React.Fragment key={col.id}>
                  <Text
                    color={isCursor && highlightOnFocus ? 'cyan' : statusColor}
                    bold={isCursor && highlightOnFocus}
                    backgroundColor={
                      isCursor && highlightOnFocus
                        ? 'blue'
                        : isSelected
                          ? 'gray'
                          : isStriped
                            ? 'blackBright'
                            : undefined
                    }
                  >
                    {renderCell(cellValue, columnWidths[colIndex] ?? 10, col.align, col.format)}
                  </Text>
                  {borderStyle !== 'none' && <Text dimColor>{border.v}</Text>}
                </React.Fragment>
              );
            })}
          </Box>
        );
      })}

      {/* Scroll indicator - bottom */}
      {maxRows && effectiveScrollOffset + visibleRows.length < rows.length && (
        <Box justifyContent="center">
          <Text dimColor>
            \u25BC {rows.length - effectiveScrollOffset - visibleRows.length} more rows below
          </Text>
        </Box>
      )}

      {/* Bottom border */}
      {borderStyle !== 'none' && rows.length > 0 && renderHorizontalBorder(border.bl, border.b, border.br)}

      {/* Empty state */}
      {rows.length === 0 && (
        <Box paddingX={1}>
          <Text dimColor italic>{emptyMessage}</Text>
        </Box>
      )}

      {/* Selection summary for multi-select */}
      {multiSelect && selectedRowIndices.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {selectedRowIndices.length} row{selectedRowIndices.length !== 1 ? 's' : ''} selected
          </Text>
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
  maxRows?: number;
  sortable?: boolean;
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
  onRowActivate?: (row: Record<string, unknown>, index: number) => void;
}

export const SimpleTable: React.FC<SimpleTableProps> = ({
  id,
  data,
  focused = false,
  maxRows,
  sortable = false,
  onRowSelect,
  onRowActivate,
}) => {
  // Auto-generate columns from data keys
  const columns: TableColumn[] = useMemo(() => {
    const firstRow = data[0];
    if (!firstRow) return [];
    const keys = Object.keys(firstRow);
    return keys.map((key) => ({
      id: key,
      header: key.charAt(0).toUpperCase() + key.slice(1),
      sortable,
    }));
  }, [data, sortable]);

  return (
    <Table
      id={id}
      columns={columns}
      rows={data}
      focused={focused}
      maxRows={maxRows}
      onRowSelect={onRowSelect}
      onRowActivate={onRowActivate}
    />
  );
};

/**
 * Sortable data table with client-side sorting
 */
export interface SortableTableProps {
  id: string;
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  focused?: boolean;
  maxRows?: number;
  defaultSortColumn?: string;
  defaultSortDirection?: SortDirection;
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
  onRowActivate?: (row: Record<string, unknown>, index: number) => void;
}

export const SortableTable: React.FC<SortableTableProps> = ({
  id,
  columns,
  rows,
  focused = false,
  maxRows,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  onRowSelect,
  onRowActivate,
}) => {
  const [sortColumn, setSortColumn] = useState<string | undefined>(defaultSortColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn || sortDirection === 'none') {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (columnId: string, direction: SortDirection) => {
    setSortColumn(direction === 'none' ? undefined : columnId);
    setSortDirection(direction);
  };

  // Make columns sortable
  const sortableColumns = columns.map(col => ({
    ...col,
    sortable: col.sortable !== false, // Default to sortable
    sortDirection: sortColumn === col.id ? sortDirection : undefined,
  }));

  return (
    <Table
      id={id}
      columns={sortableColumns}
      rows={sortedRows}
      focused={focused}
      maxRows={maxRows}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      onRowSelect={onRowSelect}
      onRowActivate={onRowActivate}
    />
  );
};

/**
 * Data grid with column resizing indicators
 */
export interface DataGridProps {
  id: string;
  columns: TableColumn[];
  rows: Array<Record<string, unknown>>;
  focused?: boolean;
  showRowNumbers?: boolean;
  striped?: boolean;
  maxRows?: number;
  availableWidth?: number;
  onRowSelect?: (row: Record<string, unknown>, index: number) => void;
  onRowActivate?: (row: Record<string, unknown>, index: number) => void;
  onSort?: (columnId: string, direction: SortDirection) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  id,
  columns,
  rows,
  focused = false,
  showRowNumbers = true,
  striped = true,
  maxRows = 20,
  availableWidth = 120,
  onRowSelect,
  onRowActivate,
  onSort,
}) => {
  return (
    <Table
      id={id}
      columns={columns.map(c => ({ ...c, sortable: c.sortable !== false }))}
      rows={rows}
      focused={focused}
      showRowNumbers={showRowNumbers}
      striped={striped}
      maxRows={maxRows}
      availableWidth={availableWidth}
      borderStyle="rounded"
      onRowSelect={onRowSelect}
      onRowActivate={onRowActivate}
      onSort={onSort}
    />
  );
};

/**
 * Key-value table (two columns: property name and value)
 */
export interface KeyValueTableProps {
  id: string;
  data: Record<string, unknown>;
  keyHeader?: string;
  valueHeader?: string;
  focused?: boolean;
}

export const KeyValueTable: React.FC<KeyValueTableProps> = ({
  id,
  data,
  keyHeader = 'Property',
  valueHeader = 'Value',
  focused = false,
}) => {
  const columns: TableColumn[] = [
    { id: 'key', header: keyHeader, align: 'left', width: 20 },
    { id: 'value', header: valueHeader, align: 'left' },
  ];

  const rows = Object.entries(data).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : value,
  }));

  return (
    <Table
      id={id}
      columns={columns}
      rows={rows}
      focused={focused}
      borderStyle="single"
    />
  );
};
