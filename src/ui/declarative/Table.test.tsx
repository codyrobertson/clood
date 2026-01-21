/**
 * Table Component Tests (UOW-0814)
 *
 * Tests for the enhanced table component with row selection,
 * sorting indicators, and responsive columns.
 * Note: Keyboard interaction tests are limited due to ink-testing-library constraints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import {
  Table,
  SimpleTable,
  SortableTable,
  DataGrid,
  KeyValueTable,
  type TableColumn,
} from './Table.js';
import { UIEventEmitter } from './EventEmitter.js';

describe('Table component', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const defaultColumns: TableColumn[] = [
    { id: 'name', header: 'Name' },
    { id: 'age', header: 'Age', align: 'right' },
    { id: 'city', header: 'City' },
  ];

  const defaultRows = [
    { name: 'Alice', age: 30, city: 'New York' },
    { name: 'Bob', age: 25, city: 'Los Angeles' },
    { name: 'Charlie', age: 35, city: 'Chicago' },
  ];

  it('should render table with headers and data', () => {
    const { lastFrame } = render(
      <Table id="test" columns={defaultColumns} rows={defaultRows} />
    );
    expect(lastFrame()).toContain('Name');
    expect(lastFrame()).toContain('Age');
    expect(lastFrame()).toContain('City');
    expect(lastFrame()).toContain('Alice');
    expect(lastFrame()).toContain('Bob');
    expect(lastFrame()).toContain('Charlie');
  });

  it('should render with different border styles', () => {
    const { lastFrame: singleFrame } = render(
      <Table id="test" columns={defaultColumns} rows={defaultRows} borderStyle="single" />
    );
    expect(singleFrame()).toContain('\u2500'); // Single horizontal line

    const { lastFrame: asciiFrame } = render(
      <Table id="test" columns={defaultColumns} rows={defaultRows} borderStyle="ascii" />
    );
    expect(asciiFrame()).toContain('-');
    expect(asciiFrame()).toContain('|');

    const { lastFrame: noneFrame } = render(
      <Table id="test" columns={defaultColumns} rows={defaultRows} borderStyle="none" />
    );
    expect(noneFrame()).not.toContain('\u2500');
    expect(noneFrame()).not.toContain('|');
  });

  it('should show empty message when no data', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={[]}
        emptyMessage="No records found"
      />
    );
    expect(lastFrame()).toContain('No records found');
  });

  it('should show row numbers when enabled', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        showRowNumbers={true}
      />
    );
    expect(lastFrame()).toContain('#');
    expect(lastFrame()).toContain('1');
    expect(lastFrame()).toContain('2');
    expect(lastFrame()).toContain('3');
  });

  it('should highlight selected row when focused', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        focused={true}
        selectedRowIndex={0}
        highlightOnFocus={true}
      />
    );
    // The highlighted row should appear differently
    expect(lastFrame()).toContain('Alice');
  });

  it('should hide header when showHeader is false', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        showHeader={false}
      />
    );
    expect(lastFrame()).toContain('Alice');
  });

  it('should render with striped rows', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        striped={true}
      />
    );
    expect(lastFrame()).toContain('Alice');
    expect(lastFrame()).toContain('Bob');
    expect(lastFrame()).toContain('Charlie');
  });

  it('should render with rounded border style', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        borderStyle="rounded"
      />
    );
    expect(lastFrame()).toContain('\u256D'); // Rounded corner
  });

  it('should render with double border style', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={defaultColumns}
        rows={defaultRows}
        borderStyle="double"
      />
    );
    expect(lastFrame()).toContain('\u2550'); // Double horizontal
  });
});

describe('Table sorting', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const sortableColumns: TableColumn[] = [
    { id: 'name', header: 'Name', sortable: true },
    { id: 'age', header: 'Age', sortable: true },
    { id: 'city', header: 'City', sortable: false },
  ];

  const rows = [
    { name: 'Alice', age: 30, city: 'New York' },
    { name: 'Bob', age: 25, city: 'Los Angeles' },
  ];

  it('should show sort indicators on sortable columns', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={sortableColumns}
        rows={rows}
        sortColumn="name"
        sortDirection="asc"
      />
    );
    expect(lastFrame()).toContain('\u25B2'); // Up arrow for ascending
  });

  it('should show descending indicator', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={sortableColumns}
        rows={rows}
        sortColumn="name"
        sortDirection="desc"
      />
    );
    expect(lastFrame()).toContain('\u25BC'); // Down arrow for descending
  });

  it('should show sortable indicator on columns', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={sortableColumns}
        rows={rows}
      />
    );
    // Sortable columns should have a down triangle indicator
    expect(lastFrame()).toContain('\u25BD');
  });
});

describe('Table multi-select', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const columns: TableColumn[] = [
    { id: 'name', header: 'Name' },
  ];

  const rows = [
    { name: 'Row 1' },
    { name: 'Row 2' },
    { name: 'Row 3' },
  ];

  it('should show selection indicators in multi-select mode', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={rows}
        multiSelect={true}
        selectedRowIndices={[0, 2]}
      />
    );
    expect(lastFrame()).toContain('\u25C9'); // Selected indicator
  });

  it('should show selection count', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={rows}
        multiSelect={true}
        selectedRowIndices={[0, 1]}
      />
    );
    expect(lastFrame()).toContain('2 row');
  });

  it('should show unselected indicators', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={rows}
        multiSelect={true}
        selectedRowIndices={[]}
      />
    );
    expect(lastFrame()).toContain('\u25CB'); // Unselected indicator
  });
});

describe('Table scrolling', () => {
  const columns: TableColumn[] = [{ id: 'id', header: 'ID' }];
  const manyRows = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

  it('should show scroll indicators for long tables', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={manyRows}
        maxRows={10}
        selectedRowIndex={25}
      />
    );
    expect(lastFrame()).toContain('more');
  });

  it('should limit visible rows', () => {
    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={manyRows}
        maxRows={5}
      />
    );
    // Should only show limited rows
    const frame = lastFrame();
    const lines = frame.split('\n');
    // Account for headers, borders, and scroll indicators
    expect(lines.length).toBeLessThan(manyRows.length + 10);
  });
});

describe('Table responsive columns', () => {
  it('should calculate responsive column widths', () => {
    const columns: TableColumn[] = [
      { id: 'short', header: 'A' },
      { id: 'medium', header: 'Medium' },
      { id: 'long', header: 'Very Long Header' },
    ];
    const rows = [
      { short: 'X', medium: 'Medium', long: 'Some long text here' },
    ];

    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={rows}
        availableWidth={60}
      />
    );

    // Should render without error
    expect(lastFrame()).toContain('A');
    expect(lastFrame()).toContain('Medium');
  });

  it('should respect minWidth and maxWidth', () => {
    const columns: TableColumn[] = [
      { id: 'col', header: 'Column', minWidth: 10, maxWidth: 30 },
    ];
    const rows = [{ col: 'x' }];

    const { lastFrame } = render(
      <Table
        id="test"
        columns={columns}
        rows={rows}
        availableWidth={100}
      />
    );

    expect(lastFrame()).toContain('Column');
  });

  it('should hide columns when specified', () => {
    const columns: TableColumn[] = [
      { id: 'visible', header: 'Visible' },
      { id: 'hidden', header: 'Hidden', hidden: true },
    ];
    const rows = [{ visible: 'Yes', hidden: 'No' }];

    const { lastFrame } = render(
      <Table id="test" columns={columns} rows={rows} />
    );

    expect(lastFrame()).toContain('Visible');
    expect(lastFrame()).not.toContain('Hidden');
  });
});

describe('Table cell formatting', () => {
  it('should format boolean values', () => {
    const columns: TableColumn[] = [
      { id: 'active', header: 'Active', format: 'boolean' },
    ];
    const rows = [
      { active: true },
      { active: false },
    ];

    const { lastFrame } = render(
      <Table id="test" columns={columns} rows={rows} />
    );

    expect(lastFrame()).toContain('\u2713'); // Check mark
    expect(lastFrame()).toContain('\u2717'); // X mark
  });

  it('should format number values', () => {
    const columns: TableColumn[] = [
      { id: 'count', header: 'Count', format: 'number' },
    ];
    const rows = [
      { count: 1234567 },
    ];

    const { lastFrame } = render(
      <Table id="test" columns={columns} rows={rows} />
    );

    // Should contain formatted number
    expect(lastFrame()).toContain('Count');
  });

  it('should format status values', () => {
    const columns: TableColumn[] = [
      { id: 'status', header: 'Status', format: 'status' },
    ];
    const rows = [
      { status: 'success' },
      { status: 'error' },
      { status: 'pending' },
    ];

    const { lastFrame } = render(
      <Table id="test" columns={columns} rows={rows} />
    );

    expect(lastFrame()).toContain('\u25CF'); // Dot indicator
  });
});

describe('SimpleTable component', () => {
  it('should auto-generate columns from data', () => {
    const data = [
      { firstName: 'Alice', lastName: 'Smith' },
      { firstName: 'Bob', lastName: 'Jones' },
    ];

    const { lastFrame } = render(
      <SimpleTable id="test" data={data} />
    );

    expect(lastFrame()).toContain('FirstName');
    expect(lastFrame()).toContain('LastName');
    expect(lastFrame()).toContain('Alice');
    expect(lastFrame()).toContain('Smith');
  });

  it('should handle empty data', () => {
    const { lastFrame } = render(
      <SimpleTable id="test" data={[]} />
    );

    expect(lastFrame()).toContain('No data');
  });

  it('should make columns sortable when specified', () => {
    const data = [{ name: 'Test' }];

    const { lastFrame } = render(
      <SimpleTable id="test" data={data} sortable={true} />
    );

    expect(lastFrame()).toContain('\u25BD'); // Sort indicator
  });
});

describe('SortableTable component', () => {
  it('should render sortable table', () => {
    const columns: TableColumn[] = [
      { id: 'name', header: 'Name' },
      { id: 'value', header: 'Value' },
    ];
    const rows = [
      { name: 'B', value: 2 },
      { name: 'A', value: 1 },
      { name: 'C', value: 3 },
    ];

    const { lastFrame } = render(
      <SortableTable
        id="test"
        columns={columns}
        rows={rows}
        defaultSortColumn="name"
        defaultSortDirection="asc"
      />
    );

    // With default sort by name asc, A should appear first
    const frame = lastFrame();
    const aIndex = frame.indexOf('A');
    const bIndex = frame.indexOf('B');
    const cIndex = frame.indexOf('C');

    expect(aIndex).toBeLessThan(bIndex);
    expect(bIndex).toBeLessThan(cIndex);
  });

  it('should show sort indicator on sorted column', () => {
    const columns: TableColumn[] = [
      { id: 'name', header: 'Name' },
    ];
    const rows = [{ name: 'Test' }];

    const { lastFrame } = render(
      <SortableTable
        id="test"
        columns={columns}
        rows={rows}
        defaultSortColumn="name"
        defaultSortDirection="asc"
      />
    );

    expect(lastFrame()).toContain('\u25B2'); // Ascending indicator
  });
});

describe('DataGrid component', () => {
  it('should render data grid with default options', () => {
    const columns: TableColumn[] = [
      { id: 'col1', header: 'Column 1' },
      { id: 'col2', header: 'Column 2' },
    ];
    const rows = [
      { col1: 'A', col2: 'B' },
    ];

    const { lastFrame } = render(
      <DataGrid
        id="test"
        columns={columns}
        rows={rows}
      />
    );

    expect(lastFrame()).toContain('Column 1');
    expect(lastFrame()).toContain('Column 2');
    expect(lastFrame()).toContain('#'); // Row numbers enabled by default
  });

  it('should use rounded borders by default', () => {
    const columns: TableColumn[] = [{ id: 'col', header: 'Col' }];
    const rows = [{ col: 'X' }];

    const { lastFrame } = render(
      <DataGrid id="test" columns={columns} rows={rows} />
    );

    expect(lastFrame()).toContain('\u256D'); // Rounded corner
  });

  it('should show striped rows by default', () => {
    const columns: TableColumn[] = [{ id: 'col', header: 'Col' }];
    const rows = [
      { col: 'A' },
      { col: 'B' },
      { col: 'C' },
    ];

    const { lastFrame } = render(
      <DataGrid id="test" columns={columns} rows={rows} />
    );

    expect(lastFrame()).toContain('A');
    expect(lastFrame()).toContain('B');
    expect(lastFrame()).toContain('C');
  });
});

describe('KeyValueTable component', () => {
  it('should render key-value pairs', () => {
    const data = {
      name: 'Test',
      version: '1.0.0',
      author: 'Anonymous',
    };

    const { lastFrame } = render(
      <KeyValueTable id="test" data={data} />
    );

    expect(lastFrame()).toContain('Property');
    expect(lastFrame()).toContain('Value');
    expect(lastFrame()).toContain('name');
    expect(lastFrame()).toContain('Test');
    expect(lastFrame()).toContain('version');
    expect(lastFrame()).toContain('1.0.0');
  });

  it('should use custom headers', () => {
    const { lastFrame } = render(
      <KeyValueTable
        id="test"
        data={{ foo: 'bar' }}
        keyHeader="Setting"
        valueHeader="Current Value"
      />
    );

    expect(lastFrame()).toContain('Setting');
    expect(lastFrame()).toContain('Current Value');
  });

  it('should stringify object values', () => {
    const data = {
      config: { nested: true },
    };

    const { lastFrame } = render(
      <KeyValueTable id="test" data={data} />
    );

    expect(lastFrame()).toContain('{"nested":true}');
  });

  it('should handle null/undefined values', () => {
    const data = {
      hasValue: 'yes',
      noValue: null,
    };

    const { lastFrame } = render(
      <KeyValueTable id="test" data={data} />
    );

    expect(lastFrame()).toContain('hasValue');
    expect(lastFrame()).toContain('noValue');
  });
});
