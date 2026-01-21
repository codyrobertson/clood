/**
 * EPIC 8 Advanced Declarative Components Registration (UOW-0816, UOW-0817, UOW-0818, UOW-0819)
 *
 * Registers all EPIC 8 advanced declarative components with the ComponentRegistry.
 * Import this module to make the components available for declarative rendering.
 */

import { ComponentRegistry, RegisteredComponent } from './ComponentRegistry.js';
import { SplitView, LeftRightSplit, TopBottomSplit, ThreePaneSplit } from './SplitView.js';
import { Logs, SimpleLogs, LogStream } from './Logs.js';
import { DiffView, SimpleDiffView, SideBySideDiff } from './DiffView.js';
import { FilePicker, SimpleFilePicker, DirectoryPicker } from './FilePicker.js';

// Type helper for registering components with required props
type AnyComponent = RegisteredComponent<Record<string, unknown>>;

/**
 * Register all EPIC 8 advanced declarative components
 */
export function registerEpic8Components(): void {
  ComponentRegistry.registerAll({
    // SplitView components (UOW-0816)
    SplitView: SplitView as unknown as AnyComponent,
    LeftRightSplit: LeftRightSplit as unknown as AnyComponent,
    TopBottomSplit: TopBottomSplit as unknown as AnyComponent,
    ThreePaneSplit: ThreePaneSplit as unknown as AnyComponent,

    // Logs components (UOW-0817)
    Logs: Logs as unknown as AnyComponent,
    SimpleLogs: SimpleLogs as unknown as AnyComponent,
    LogStream: LogStream as unknown as AnyComponent,

    // DiffView components (UOW-0818)
    DiffView: DiffView as unknown as AnyComponent,
    SimpleDiffView: SimpleDiffView as unknown as AnyComponent,
    SideBySideDiff: SideBySideDiff as unknown as AnyComponent,

    // FilePicker components (UOW-0819)
    FilePicker: FilePicker as unknown as AnyComponent,
    SimpleFilePicker: SimpleFilePicker as unknown as AnyComponent,
    DirectoryPicker: DirectoryPicker as unknown as AnyComponent,
  });

  // Register aliases for common shortcuts
  ComponentRegistry.registerAlias('Split', 'SplitView');
  ComponentRegistry.registerAlias('HorizontalSplit', 'LeftRightSplit');
  ComponentRegistry.registerAlias('VerticalSplit', 'TopBottomSplit');
  ComponentRegistry.registerAlias('LogViewer', 'Logs');
  ComponentRegistry.registerAlias('Diff', 'DiffView');
  ComponentRegistry.registerAlias('FileSelector', 'FilePicker');
  ComponentRegistry.registerAlias('DirPicker', 'DirectoryPicker');
}

/**
 * Check if EPIC 8 components are registered
 */
export function isEpic8Registered(): boolean {
  return (
    ComponentRegistry.has('SplitView') &&
    ComponentRegistry.has('Logs') &&
    ComponentRegistry.has('DiffView') &&
    ComponentRegistry.has('FilePicker')
  );
}

/**
 * Get list of EPIC 8 component types
 */
export function getEpic8ComponentTypes(): string[] {
  return [
    'SplitView',
    'LeftRightSplit',
    'TopBottomSplit',
    'ThreePaneSplit',
    'Logs',
    'SimpleLogs',
    'LogStream',
    'DiffView',
    'SimpleDiffView',
    'SideBySideDiff',
    'FilePicker',
    'SimpleFilePicker',
    'DirectoryPicker',
  ];
}

// Auto-register on import
registerEpic8Components();
