/**
 * Declarative UI Components
 *
 * Re-exports all declarative UI components for schema-driven rendering.
 */

// Component Registry (UOW-0801)
export {
  ComponentRegistry,
  createComponentRegistry,
  useComponentRegistry,
  registerComponent,
  type BaseComponentProps,
  type ComponentSpec,
  type RegisteredComponent,
  type FallbackComponentProps,
  type RegisteredComponentMap,
} from './ComponentRegistry.js';

// Layout utilities (UOW-0803)
export {
  parseDimension,
  calculateDimensionPx,
  isFlexibleDimension,
  isPercentageDimension,
  isFixedDimension,
  normalizeSpacing,
  uniformSpacing,
  symmetricSpacing,
  spacingFromArray,
  horizontalSpacing,
  verticalSpacing,
  addSpacing,
  scaleSpacing,
  spacingToInkPadding,
  spacingToInkMargin,
  normalizeGap,
  toInkBorderStyle,
  distributeSpace,
  clampDimension,
  DEFAULT_SPACING,
  type ParsedDimension,
  type GapProps,
  type InkBorderStyle,
} from './Layout.js';

// Event Emitter (UOW-0830)
export {
  UIEventEmitter,
  emitButtonClick,
  emitListSelect,
  emitListActivate,
  emitListSelectionChange,
  emitTableSelect,
  emitTableActivate,
  emitModalClose,
  emitModalConfirm,
  emitModalCancel,
  initializeUIEventEmitter,
  type UIEventType,
  type UIEvent,
  type ButtonClickUIEvent,
  type ListSelectUIEvent,
  type ListActivateUIEvent,
  type ListSelectionChangeUIEvent,
  type TableSelectUIEvent,
  type TableActivateUIEvent,
  type ModalCloseUIEvent,
  type ModalConfirmUIEvent,
  type ModalCancelUIEvent,
  type UIEventListener,
  type Unsubscribe,
} from './EventEmitter.js';

// Container components (UOW-0802)
export {
  Container,
  Row,
  Column,
  Stack,
  Inline,
  Center,
  Spacer,
  Divider,
  Card,
  Grid,
  type ContainerProps,
  type RowProps,
  type ColumnProps,
  type StackProps,
  type InlineProps,
  type CenterProps,
  type SpacerProps,
  type DividerProps,
  type CardProps,
  type GridProps,
} from './Container.js';

// Basic components
export { Button, ActionButton, type ButtonProps, type ActionButtonProps } from './Button.js';

// ButtonRow (UOW-0812) - Enhanced with full interactivity
export {
  ButtonRow,
  QuickActions,
  ConfirmCancel,
  YesNo,
  Toolbar,
  type ButtonConfig,
  type ButtonRowProps,
  type ButtonVariant,
  type ButtonSize,
  type QuickActionsProps,
  type ConfirmCancelProps,
  type YesNoProps,
  type ToolbarProps,
} from './ButtonRow.js';

// List (UOW-0813) - Enhanced with keyboard navigation, multi-select, visual indicators
export {
  List,
  SelectList,
  CheckboxList,
  MenuList,
  FileList,
  SearchableList,
  type ListItem,
  type ListItemVariant,
  type ListProps,
  type SelectListProps,
  type CheckboxListProps,
  type MenuListProps,
  type FileListProps,
  type SearchableListProps,
} from './List.js';

// Table (UOW-0814) - Enhanced with row selection, sorting indicators, responsive columns
export {
  Table,
  SimpleTable,
  SortableTable,
  DataGrid,
  KeyValueTable,
  type TableColumn,
  type TableProps,
  type SimpleTableProps,
  type SortableTableProps,
  type DataGridProps,
  type KeyValueTableProps,
  type SortDirection,
  type ColumnAlign,
} from './Table.js';

// TextBlock (UOW-0810) - ANSI-safe, Unicode-aware text rendering
export {
  TextBlock,
  SimpleText,
  CodeBlock,
  Paragraph,
  Label,
  Highlight,
  getVisualWidth,
  truncateText,
  padText,
  wrapText,
  type TextBlockProps,
  type SimpleTextProps,
  type CodeBlockProps,
  type ParagraphProps,
  type LabelProps,
  type HighlightProps,
  type TextAlign,
  type TextStyle,
  type TextColor,
} from './TextBlock.js';

// Modals and dialogs
export { Modal, ConfirmModal, AlertModal, LoadingModal, type ModalProps, type ConfirmModalProps, type AlertModalProps, type LoadingModalProps } from './Modal.js';

// Form components
export { InputField, TextArea, PasswordInput, type InputFieldProps, type TextAreaProps, type PasswordInputProps } from './InputField.js';
export { Form, InputGroup, FormSection, InlineForm, type FormProps, type FormField, type FormFieldType, type FormFieldOption, type InputGroupProps, type FormSectionProps, type InlineFormProps } from './Form.js';

// Progress and loading
export { ProgressBar, MultiProgressBar, CircularProgress, TransferProgress, type ProgressBarProps, type MultiProgressBarProps, type CircularProgressProps, type TransferProgressProps } from './ProgressBar.js';
export { Spinner, Loading, TaskSpinner, TaskList, PulseDot, TypingIndicator, type SpinnerType, type SpinnerProps, type LoadingProps, type TaskSpinnerProps, type TaskListProps, type PulseDotProps } from './Spinner.js';

// Status and indicators
export { Badge, StatusBadge, CountBadge, Tag, TagGroup, PriorityBadge, VersionBadge, DotIndicator, KeyBadge, type BadgeProps, type BadgeVariant, type BadgeSize, type StatusBadgeProps, type CountBadgeProps, type TagProps, type TagGroupProps, type PriorityBadgeProps, type VersionBadgeProps, type DotIndicatorProps, type KeyBadgeProps } from './Badge.js';

// Navigation
export { Tabs, VerticalTabs, TabBar, TabPanel, BreadcrumbTabs, type Tab, type TabsProps, type VerticalTabsProps, type TabBarProps, type TabPanelProps, type BreadcrumbTabsProps } from './Tabs.js';

// Charts and visualization
export { BarChart, Sparkline, LineChart, PieChart, GaugeChart, Histogram, type BarChartProps, type SparklineProps, type LineChartProps, type PieChartProps, type GaugeChartProps, type HistogramProps } from './Chart.js';

// Hierarchical components
export { TreeView, FileTree, ExpandableList, type TreeNode, type TreeViewProps, type FileTreeNode, type FileTreeProps, type ExpandableListProps } from './TreeView.js';
export { Accordion, Collapsible, Details, StepAccordion, type AccordionItem, type AccordionProps, type CollapsibleProps, type DetailsProps, type StepAccordionProps } from './Accordion.js';

// EPIC 8 Advanced declarative components (UOW-0816, UOW-0817, UOW-0818, UOW-0819)
// SplitView (UOW-0816)
export {
  SplitView,
  LeftRightSplit,
  TopBottomSplit,
  ThreePaneSplit,
  emitPaneResize,
  emitPaneFocus,
  type SplitViewProps,
  type LeftRightSplitProps,
  type TopBottomSplitProps,
  type ThreePaneSplitProps,
  type PaneResizeUIEvent,
  type PaneFocusUIEvent,
} from './SplitView.js';

// Logs (UOW-0817)
export {
  Logs,
  SimpleLogs,
  LogStream,
  createLogEntries,
  emitLogFilter,
  emitLogScroll,
  type LogLevel,
  type LogEntry,
  type LogsProps,
  type SimpleLogsProps,
  type LogStreamProps,
  type LogFilterUIEvent,
  type LogScrollUIEvent,
} from './Logs.js';

// DiffView (UOW-0818)
export {
  DiffView,
  SimpleDiffView,
  SideBySideDiff,
  parseUnifiedDiff,
  emitDiffNavigate,
  emitDiffSelect,
  type DiffLineType,
  type DiffLine,
  type DiffHunk,
  type DiffFile,
  type DiffViewProps,
  type SimpleDiffViewProps,
  type SideBySideDiffProps,
  type DiffNavigateUIEvent,
  type DiffSelectUIEvent,
} from './DiffView.js';

// FilePicker (UOW-0819)
export {
  FilePicker,
  SimpleFilePicker,
  DirectoryPicker,
  createFileEntries,
  emitFileSelect,
  emitFileNavigate,
  emitFileFilter,
  type FileEntry,
  type FilePickerProps,
  type SimpleFilePickerProps,
  type DirectoryPickerProps,
  type FileSelectUIEvent,
  type FileNavigateUIEvent,
  type FileFilterUIEvent,
} from './FilePicker.js';

// EPIC 8 Component Registration
export {
  registerEpic8Components,
  isEpic8Registered,
  getEpic8ComponentTypes,
} from './registerEpic8Components.js';
