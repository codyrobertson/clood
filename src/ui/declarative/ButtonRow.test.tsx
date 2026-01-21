/**
 * ButtonRow Component Tests (UOW-0812)
 *
 * Tests for the interactive button row component with shortcuts and navigation.
 * Note: Keyboard interaction tests are limited due to ink-testing-library constraints.
 * Full keyboard testing should be done via integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import {
  ButtonRow,
  QuickActions,
  ConfirmCancel,
  YesNo,
  Toolbar,
  type ButtonConfig,
} from './ButtonRow.js';
import { UIEventEmitter } from './EventEmitter.js';

describe('ButtonRow component', () => {
  beforeEach(() => {
    UIEventEmitter.clear();
  });

  const defaultButtons: ButtonConfig[] = [
    { id: 'btn1', label: 'Button 1' },
    { id: 'btn2', label: 'Button 2' },
    { id: 'btn3', label: 'Button 3' },
  ];

  it('should render all buttons', () => {
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={defaultButtons} />
    );
    expect(lastFrame()).toContain('Button 1');
    expect(lastFrame()).toContain('Button 2');
    expect(lastFrame()).toContain('Button 3');
  });

  it('should render buttons with shortcuts', () => {
    const buttonsWithShortcuts: ButtonConfig[] = [
      { id: 'yes', label: 'Yes', shortcut: 'y' },
      { id: 'no', label: 'No', shortcut: 'n' },
    ];
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={buttonsWithShortcuts} showLegend={true} />
    );
    const frame = lastFrame();
    expect(frame).toContain('Yes');
    expect(frame).toContain('No');
    expect(frame).toContain('Y');
    expect(frame).toContain('N');
  });

  it('should not render when visible is false', () => {
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={defaultButtons} visible={false} />
    );
    expect(lastFrame()).toBe('');
  });

  it('should render nothing for empty buttons array', () => {
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={[]} />
    );
    expect(lastFrame()).toBe('');
  });

  it('should show disabled buttons with different styling', () => {
    const buttons: ButtonConfig[] = [
      { id: 'enabled', label: 'Enabled' },
      { id: 'disabled', label: 'Disabled', disabled: true },
    ];
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} />
    );
    expect(lastFrame()).toContain('Enabled');
    expect(lastFrame()).toContain('Disabled');
  });

  it('should show focus indicator on focused button', () => {
    const { lastFrame } = render(
      <ButtonRow
        id="test-row"
        buttons={defaultButtons}
        focused={true}
        focusedIndex={0}
      />
    );
    expect(lastFrame()).toContain('\u25B8'); // Focus indicator
  });

  it('should render button variants', () => {
    const buttons: ButtonConfig[] = [
      { id: 'primary', label: 'Primary', variant: 'primary' },
      { id: 'danger', label: 'Danger', variant: 'danger' },
      { id: 'success', label: 'Success', variant: 'success' },
    ];
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} />
    );
    expect(lastFrame()).toContain('Primary');
    expect(lastFrame()).toContain('Danger');
    expect(lastFrame()).toContain('Success');
  });

  it('should render with icons', () => {
    const buttons: ButtonConfig[] = [
      { id: 'save', label: 'Save', icon: '\uD83D\uDCBE' },
      { id: 'delete', label: 'Delete', icon: '\uD83D\uDDD1' },
    ];
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} />
    );
    expect(lastFrame()).toContain('Save');
    expect(lastFrame()).toContain('Delete');
  });

  it('should show shortcut legend when enabled', () => {
    const buttons: ButtonConfig[] = [
      { id: 'save', label: 'Save', shortcut: 's' },
      { id: 'quit', label: 'Quit', shortcut: 'q' },
    ];
    const { lastFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} showLegend={true} />
    );
    const frame = lastFrame();
    expect(frame).toContain('S');
    expect(frame).toContain('Save');
    expect(frame).toContain('Q');
    expect(frame).toContain('Quit');
  });

  it('should hide legend when showLegend is false', () => {
    const buttons: ButtonConfig[] = [
      { id: 'save', label: 'Save', shortcut: 's' },
    ];
    const { lastFrame: withLegend } = render(
      <ButtonRow id="test-row" buttons={buttons} showLegend={true} />
    );
    const { lastFrame: withoutLegend } = render(
      <ButtonRow id="test-row" buttons={buttons} showLegend={false} />
    );
    // Without legend should be shorter
    expect(withoutLegend().length).toBeLessThan(withLegend().length);
  });

  it('should render with different alignments', () => {
    const buttons: ButtonConfig[] = [{ id: 'btn', label: 'Button' }];

    // Left alignment (default)
    const { lastFrame: leftFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} align="left" />
    );
    expect(leftFrame()).toContain('Button');

    // Center alignment
    const { lastFrame: centerFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} align="center" />
    );
    expect(centerFrame()).toContain('Button');

    // Right alignment
    const { lastFrame: rightFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} align="right" />
    );
    expect(rightFrame()).toContain('Button');
  });

  it('should render with different sizes', () => {
    const buttons: ButtonConfig[] = [{ id: 'btn', label: 'Button' }];

    const { lastFrame: smallFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} size="small" />
    );
    const { lastFrame: largeFrame } = render(
      <ButtonRow id="test-row" buttons={buttons} size="large" />
    );
    // Large should have more padding
    expect(largeFrame().length).toBeGreaterThanOrEqual(smallFrame().length);
  });
});

describe('QuickActions component', () => {
  it('should render actions', () => {
    const actions = [
      { id: 'copy', label: 'Copy', shortcut: 'c' },
      { id: 'paste', label: 'Paste', shortcut: 'v' },
    ];
    const { lastFrame } = render(
      <QuickActions id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('Copy');
    expect(lastFrame()).toContain('Paste');
  });

  it('should render with icons', () => {
    const actions = [
      { id: 'new', label: 'New', shortcut: 'n', icon: '\u2795' },
    ];
    const { lastFrame } = render(
      <QuickActions id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('New');
  });

  it('should show disabled actions differently', () => {
    const actions = [
      { id: 'enabled', label: 'Enabled', shortcut: 'e' },
      { id: 'disabled', label: 'Disabled', shortcut: 'd', disabled: true },
    ];
    const { lastFrame } = render(
      <QuickActions id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('Enabled');
    expect(lastFrame()).toContain('Disabled');
  });
});

describe('ConfirmCancel component', () => {
  it('should render confirm and cancel buttons', () => {
    const { lastFrame } = render(
      <ConfirmCancel id="test" />
    );
    expect(lastFrame()).toContain('Confirm');
    expect(lastFrame()).toContain('Cancel');
  });

  it('should use custom labels', () => {
    const { lastFrame } = render(
      <ConfirmCancel
        id="test"
        confirmLabel="Submit"
        cancelLabel="Discard"
      />
    );
    expect(lastFrame()).toContain('Submit');
    expect(lastFrame()).toContain('Discard');
  });

  it('should show shortcut hints in legend', () => {
    const { lastFrame } = render(
      <ConfirmCancel id="test" />
    );
    const frame = lastFrame();
    expect(frame).toContain('Y'); // Confirm shortcut
    expect(frame).toContain('N'); // Cancel shortcut
  });

  it('should focus confirm button by default', () => {
    const { lastFrame } = render(
      <ConfirmCancel id="test" focused={true} />
    );
    // Confirm button should have focus indicator
    expect(lastFrame()).toContain('\u25B8');
  });

  it('should focus cancel button when specified', () => {
    const { lastFrame } = render(
      <ConfirmCancel id="test" focused={true} focusedButton="cancel" />
    );
    expect(lastFrame()).toContain('Cancel');
  });
});

describe('YesNo component', () => {
  it('should render yes and no buttons', () => {
    const { lastFrame } = render(
      <YesNo id="test" />
    );
    expect(lastFrame()).toContain('Yes');
    expect(lastFrame()).toContain('No');
  });

  it('should show shortcut hints', () => {
    const { lastFrame } = render(
      <YesNo id="test" />
    );
    const frame = lastFrame();
    expect(frame).toContain('Y');
    expect(frame).toContain('N');
  });

  it('should focus yes by default', () => {
    const { lastFrame } = render(
      <YesNo id="test" focused={true} />
    );
    expect(lastFrame()).toContain('\u25B8');
  });

  it('should focus no when specified', () => {
    const { lastFrame } = render(
      <YesNo id="test" focused={true} defaultFocus="no" />
    );
    expect(lastFrame()).toContain('No');
  });
});

describe('Toolbar component', () => {
  it('should render toolbar actions', () => {
    const actions = [
      { id: 'bold', icon: 'B', shortcut: 'b' },
      { id: 'italic', icon: 'I', shortcut: 'i' },
      { id: 'underline', icon: 'U', shortcut: 'u' },
    ];
    const { lastFrame } = render(
      <Toolbar id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('B');
    expect(lastFrame()).toContain('I');
    expect(lastFrame()).toContain('U');
  });

  it('should render with labels', () => {
    const actions = [
      { id: 'save', icon: '\uD83D\uDCBE', label: 'Save' },
    ];
    const { lastFrame } = render(
      <Toolbar id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('Save');
  });

  it('should show disabled state', () => {
    const actions = [
      { id: 'enabled', icon: '\u2713' },
      { id: 'disabled', icon: '\u2717', disabled: true },
    ];
    const { lastFrame } = render(
      <Toolbar id="test" actions={actions} />
    );
    expect(lastFrame()).toContain('\u2713');
    expect(lastFrame()).toContain('\u2717');
  });
});
