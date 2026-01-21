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
export { Button, ButtonRow, ActionButton, type ButtonProps, type ButtonRowProps, type ActionButtonProps } from './Button.js';
export { List, SelectList, type ListItem, type ListProps, type SelectListProps } from './List.js';
export { Table, SimpleTable, type TableColumn, type TableProps, type SimpleTableProps } from './Table.js';

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
