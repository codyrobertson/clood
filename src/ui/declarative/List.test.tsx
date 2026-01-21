/**
 * List Component Tests (UOW-0813)
 *
 * Tests for the enhanced list component with keyboard navigation,
 * single/multi select, and visual indicators.
 * Note: Keyboard interaction tests are limited due to ink-testing-library constraints.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import {
  List,
  SelectList,
  CheckboxList,
  MenuList,
  FileList,
  SearchableList,
  type ListItem,
} from './List.js';
import { UIEventEmitter } from './EventEmitter.js';

describe('List component', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const defaultItems: ListItem[] = [
    { id: 'item1', label: 'Item 1', value: 1 },
    { id: 'item2', label: 'Item 2', value: 2 },
    { id: 'item3', label: 'Item 3', value: 3 },
  ];

  it('should render all items', () => {
    const { lastFrame } = render(
      <List id="test-list" items={defaultItems} />
    );
    expect(lastFrame()).toContain('Item 1');
    expect(lastFrame()).toContain('Item 2');
    expect(lastFrame()).toContain('Item 3');
  });

  it('should show cursor on selected item when focused', () => {
    const { lastFrame } = render(
      <List id="test-list" items={defaultItems} focused={true} selectedIndex={0} />
    );
    expect(lastFrame()).toContain('\u25B8');
  });

  it('should show cursor at correct position', () => {
    const { lastFrame } = render(
      <List id="test-list" items={defaultItems} focused={true} selectedIndex={1} />
    );
    expect(lastFrame()).toContain('\u25B8');
    expect(lastFrame()).toContain('Item 2');
  });

  it('should show scroll indicators for long lists', () => {
    const manyItems: ListItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: `item${i}`,
      label: `Item ${i}`,
    }));

    const { lastFrame } = render(
      <List
        id="test-list"
        items={manyItems}
        maxHeight={5}
        selectedIndex={10}
      />
    );

    expect(lastFrame()).toContain('more');
  });

  it('should show empty message when no items', () => {
    const { lastFrame } = render(
      <List id="test-list" items={[]} emptyMessage="Nothing here" />
    );
    expect(lastFrame()).toContain('Nothing here');
  });

  it('should show item numbers when enabled', () => {
    const { lastFrame } = render(
      <List id="test-list" items={defaultItems} showNumbers={true} />
    );
    expect(lastFrame()).toContain('1.');
    expect(lastFrame()).toContain('2.');
    expect(lastFrame()).toContain('3.');
  });

  it('should show icons when provided', () => {
    const itemsWithIcons: ListItem[] = [
      { id: 'file', label: 'File', icon: '\uD83D\uDCC4' },
      { id: 'folder', label: 'Folder', icon: '\uD83D\uDCC1' },
    ];
    const { lastFrame } = render(
      <List id="test-list" items={itemsWithIcons} />
    );
    expect(lastFrame()).toContain('File');
    expect(lastFrame()).toContain('Folder');
  });

  it('should show descriptions when enabled', () => {
    const itemsWithDesc: ListItem[] = [
      { id: 'a', label: 'Option A', description: 'Description for A' },
      { id: 'b', label: 'Option B', description: 'Description for B' },
    ];
    const { lastFrame } = render(
      <List
        id="test-list"
        items={itemsWithDesc}
        showDescriptions={true}
      />
    );
    expect(lastFrame()).toContain('Description for A');
    expect(lastFrame()).toContain('Description for B');
  });

  it('should display disabled items differently', () => {
    const itemsWithDisabled: ListItem[] = [
      { id: 'enabled', label: 'Enabled' },
      { id: 'disabled', label: 'Disabled', disabled: true },
    ];

    const { lastFrame } = render(
      <List id="test-list" items={itemsWithDisabled} />
    );
    expect(lastFrame()).toContain('Enabled');
    expect(lastFrame()).toContain('Disabled');
  });

  it('should show suffix when provided', () => {
    const items: ListItem[] = [
      { id: 'file', label: 'document.txt', suffix: '1.2KB' },
    ];
    const { lastFrame } = render(
      <List id="test-list" items={items} />
    );
    expect(lastFrame()).toContain('document.txt');
    expect(lastFrame()).toContain('1.2KB');
  });

  it('should show custom cursor character', () => {
    const { lastFrame } = render(
      <List
        id="test-list"
        items={defaultItems}
        focused={true}
        selectedIndex={0}
        cursorChar=">"
      />
    );
    expect(lastFrame()).toContain('>');
  });
});

describe('List multi-select', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const items: ListItem[] = [
    { id: 'a', label: 'Option A' },
    { id: 'b', label: 'Option B' },
    { id: 'c', label: 'Option C' },
  ];

  it('should show checkboxes in multi-select mode', () => {
    const { lastFrame } = render(
      <List id="test-list" items={items} multiSelect={true} />
    );
    // Should contain selection indicators
    expect(lastFrame()).toContain('\u25CB'); // Unselected
  });

  it('should show selected items with different indicator', () => {
    const { lastFrame } = render(
      <List
        id="test-list"
        items={items}
        multiSelect={true}
        selectedIds={['a', 'c']}
      />
    );
    expect(lastFrame()).toContain('\u25C9'); // Selected
  });

  it('should show selection count', () => {
    const { lastFrame } = render(
      <List
        id="test-list"
        items={items}
        multiSelect={true}
        selectedIds={['a', 'b']}
      />
    );
    expect(lastFrame()).toContain('2 selected');
  });

  it('should show custom selection indicators', () => {
    const { lastFrame } = render(
      <List
        id="test-list"
        items={items}
        multiSelect={true}
        selectedIds={['a']}
        selectedChar="[x]"
        unselectedChar="[ ]"
      />
    );
    expect(lastFrame()).toContain('[x]');
    expect(lastFrame()).toContain('[ ]');
  });
});

describe('List with variants', () => {
  it('should render items with different variants', () => {
    const items: ListItem[] = [
      { id: 'success', label: 'Success Item', variant: 'success' },
      { id: 'error', label: 'Error Item', variant: 'error' },
      { id: 'warning', label: 'Warning Item', variant: 'warning' },
    ];
    const { lastFrame } = render(
      <List id="test-list" items={items} />
    );
    expect(lastFrame()).toContain('Success Item');
    expect(lastFrame()).toContain('Error Item');
    expect(lastFrame()).toContain('Warning Item');
  });
});

describe('SelectList component', () => {
  it('should render selection list', () => {
    const items = [
      { id: 'opt1', label: 'Option 1' },
      { id: 'opt2', label: 'Option 2' },
    ];
    const { lastFrame } = render(
      <SelectList id="test" items={items} value="opt1" />
    );
    expect(lastFrame()).toContain('Option 1');
    expect(lastFrame()).toContain('Option 2');
  });

  it('should highlight selected value', () => {
    const items = [
      { id: 'opt1', label: 'Option 1' },
      { id: 'opt2', label: 'Option 2' },
    ];
    const { lastFrame } = render(
      <SelectList id="test" items={items} value="opt2" focused={true} />
    );
    expect(lastFrame()).toContain('Option 2');
  });

  it('should show numbers when enabled', () => {
    const items = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const { lastFrame } = render(
      <SelectList id="test" items={items} showNumbers={true} />
    );
    expect(lastFrame()).toContain('1.');
    expect(lastFrame()).toContain('2.');
  });
});

describe('CheckboxList component', () => {
  it('should render checkbox list', () => {
    const items = [
      { id: 'a', label: 'Check A' },
      { id: 'b', label: 'Check B' },
    ];
    const { lastFrame } = render(
      <CheckboxList id="test" items={items} selectedIds={['a']} />
    );
    expect(lastFrame()).toContain('Check A');
    expect(lastFrame()).toContain('Check B');
    expect(lastFrame()).toContain('\u25C9'); // Selected
    expect(lastFrame()).toContain('\u25CB'); // Unselected
  });

  it('should handle empty selection', () => {
    const items = [
      { id: 'a', label: 'Check A' },
    ];
    const { lastFrame } = render(
      <CheckboxList id="test" items={items} selectedIds={[]} />
    );
    expect(lastFrame()).toContain('\u25CB');
  });
});

describe('MenuList component', () => {
  it('should render menu items with descriptions', () => {
    const items = [
      { id: 'new', label: 'New File', icon: '\u2795', description: 'Create a new file', shortcut: 'Ctrl+N' },
      { id: 'open', label: 'Open File', icon: '\uD83D\uDCC2', description: 'Open existing file', shortcut: 'Ctrl+O' },
    ];
    const { lastFrame } = render(
      <MenuList id="test" items={items} />
    );
    expect(lastFrame()).toContain('New File');
    expect(lastFrame()).toContain('Open File');
    expect(lastFrame()).toContain('Create a new file');
  });

  it('should show shortcuts as suffix', () => {
    const items = [
      { id: 'save', label: 'Save', shortcut: 'Ctrl+S' },
    ];
    const { lastFrame } = render(
      <MenuList id="test" items={items} />
    );
    expect(lastFrame()).toContain('Ctrl+S');
  });

  it('should show disabled items', () => {
    const items = [
      { id: 'enabled', label: 'Enabled' },
      { id: 'disabled', label: 'Disabled', disabled: true },
    ];
    const { lastFrame } = render(
      <MenuList id="test" items={items} />
    );
    expect(lastFrame()).toContain('Enabled');
    expect(lastFrame()).toContain('Disabled');
  });
});

describe('FileList component', () => {
  it('should render file list with icons', () => {
    const files = [
      { name: 'folder', path: '/folder', isDirectory: true },
      { name: 'file.txt', path: '/file.txt', isDirectory: false, size: '1KB' },
    ];
    const { lastFrame } = render(
      <FileList id="test" files={files} />
    );
    expect(lastFrame()).toContain('folder');
    expect(lastFrame()).toContain('file.txt');
    expect(lastFrame()).toContain('1KB');
  });

  it('should use folder icon for directories', () => {
    const files = [
      { name: 'mydir', path: '/mydir', isDirectory: true },
    ];
    const { lastFrame } = render(
      <FileList id="test" files={files} />
    );
    expect(lastFrame()).toContain('\uD83D\uDCC1'); // Folder icon
  });

  it('should use file icon for files', () => {
    const files = [
      { name: 'doc.txt', path: '/doc.txt', isDirectory: false },
    ];
    const { lastFrame } = render(
      <FileList id="test" files={files} />
    );
    expect(lastFrame()).toContain('\uD83D\uDCC4'); // File icon
  });

  it('should highlight selected file', () => {
    const files = [
      { name: 'file1.txt', path: '/file1.txt' },
      { name: 'file2.txt', path: '/file2.txt' },
    ];
    const { lastFrame } = render(
      <FileList
        id="test"
        files={files}
        selectedPath="/file2.txt"
        focused={true}
      />
    );
    expect(lastFrame()).toContain('\u25B8');
  });
});

describe('SearchableList component', () => {
  it('should render searchable list', () => {
    const items: ListItem[] = [
      { id: 'apple', label: 'Apple' },
      { id: 'banana', label: 'Banana' },
      { id: 'cherry', label: 'Cherry' },
    ];
    const { lastFrame } = render(
      <SearchableList id="test" items={items} />
    );
    expect(lastFrame()).toContain('Apple');
    expect(lastFrame()).toContain('Banana');
    expect(lastFrame()).toContain('Cherry');
  });
});

describe('List grouping', () => {
  it('should show group headers when enabled', () => {
    const items: ListItem[] = [
      { id: 'a', label: 'Item A', group: 'Group 1' },
      { id: 'b', label: 'Item B', group: 'Group 1' },
      { id: 'c', label: 'Item C', group: 'Group 2' },
    ];
    const { lastFrame } = render(
      <List id="test" items={items} showGroupHeaders={true} />
    );
    expect(lastFrame()).toContain('Group 1');
    expect(lastFrame()).toContain('Group 2');
    expect(lastFrame()).toContain('Item A');
  });
});
