/**
 * UILayout Schema v1.0 (UOW-0205)
 *
 * Comprehensive declarative UI layout specification.
 * Defines component types, styling, spacing, and events.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * Dimension values: numbers, percentages, 'auto', or 'fill'
 */
export const DimensionSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(/^\d+%$/, 'Must be a percentage (e.g., "50%")'),
  z.literal('auto'),
  z.literal('fill'),
]);

/**
 * Spacing configuration for padding/margin
 */
export const SpacingSchema = z.object({
  top: z.number().nonnegative().optional(),
  right: z.number().nonnegative().optional(),
  bottom: z.number().nonnegative().optional(),
  left: z.number().nonnegative().optional(),
});

/**
 * Shorthand spacing: single value, [vertical, horizontal], or [top, right, bottom, left]
 */
export const SpacingShorthandSchema = z.union([
  z.number().nonnegative(),
  z.tuple([z.number().nonnegative(), z.number().nonnegative()]),
  z.tuple([
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
    z.number().nonnegative(),
  ]),
  SpacingSchema,
]);

/**
 * Border style configuration
 */
export const BorderSchema = z.object({
  style: z.enum(['none', 'single', 'double', 'round', 'bold', 'classic']).optional(),
  color: z.string().optional(),
  top: z.boolean().optional(),
  right: z.boolean().optional(),
  bottom: z.boolean().optional(),
  left: z.boolean().optional(),
});

/**
 * Color value: named colors or hex codes
 */
export const ColorSchema = z.union([
  z.enum([
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'gray', 'grey', 'blackBright', 'redBright', 'greenBright', 'yellowBright',
    'blueBright', 'magentaBright', 'cyanBright', 'whiteBright',
  ]),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g., "#FF0000")'),
]);

/**
 * Text alignment options
 */
export const AlignmentSchema = z.enum(['left', 'center', 'right']);

/**
 * Vertical alignment options
 */
export const VerticalAlignSchema = z.enum(['top', 'middle', 'bottom']);

// =============================================================================
// EVENT SCHEMAS
// =============================================================================

/**
 * Event handler reference
 */
export const EventHandlerSchema = z.object({
  action: z.string(),
  payload: z.record(z.unknown()).optional(),
});

/**
 * Keyboard event specification
 */
export const KeyboardEventSchema = z.object({
  key: z.string(),
  ctrl: z.boolean().optional(),
  alt: z.boolean().optional(),
  shift: z.boolean().optional(),
  meta: z.boolean().optional(),
  handler: EventHandlerSchema,
});

/**
 * Common event handlers for interactive components
 */
export const EventsSchema = z.object({
  onClick: EventHandlerSchema.optional(),
  onFocus: EventHandlerSchema.optional(),
  onBlur: EventHandlerSchema.optional(),
  onChange: EventHandlerSchema.optional(),
  onSubmit: EventHandlerSchema.optional(),
  onCancel: EventHandlerSchema.optional(),
  onKeyPress: z.array(KeyboardEventSchema).optional(),
});

// =============================================================================
// ACCESSIBILITY SCHEMAS
// =============================================================================

/**
 * ARIA roles for accessibility
 */
export const AriaRoleSchema = z.enum([
  'button', 'checkbox', 'dialog', 'grid', 'gridcell', 'heading',
  'img', 'link', 'list', 'listitem', 'menu', 'menuitem', 'menubar',
  'option', 'progressbar', 'radio', 'row', 'scrollbar', 'searchbox',
  'separator', 'slider', 'spinbutton', 'status', 'tab', 'tablist',
  'tabpanel', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treeitem',
]);

/**
 * Accessibility attributes
 */
export const AccessibilitySchema = z.object({
  role: AriaRoleSchema.optional(),
  ariaLabel: z.string().optional(),
  ariaDescribedBy: z.string().optional(),
  ariaLabelledBy: z.string().optional(),
  ariaHidden: z.boolean().optional(),
  ariaLive: z.enum(['off', 'polite', 'assertive']).optional(),
  ariaExpanded: z.boolean().optional(),
  ariaSelected: z.boolean().optional(),
  ariaDisabled: z.boolean().optional(),
});

// =============================================================================
// STYLE SCHEMAS
// =============================================================================

/**
 * Text style properties
 */
export const TextStyleSchema = z.object({
  color: ColorSchema.optional(),
  backgroundColor: ColorSchema.optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  dimColor: z.boolean().optional(),
  inverse: z.boolean().optional(),
});

/**
 * Complete style configuration
 */
export const StyleSchema = TextStyleSchema.extend({
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  minWidth: z.number().nonnegative().optional(),
  maxWidth: z.number().nonnegative().optional(),
  minHeight: z.number().nonnegative().optional(),
  maxHeight: z.number().nonnegative().optional(),
  padding: SpacingShorthandSchema.optional(),
  margin: SpacingShorthandSchema.optional(),
  border: BorderSchema.optional(),
  flexGrow: z.number().nonnegative().optional(),
  flexShrink: z.number().nonnegative().optional(),
  flexBasis: DimensionSchema.optional(),
  alignSelf: z.enum(['auto', 'flex-start', 'flex-end', 'center', 'stretch']).optional(),
});

// =============================================================================
// BASE COMPONENT SCHEMA
// =============================================================================

/**
 * Base properties for all components
 */
export const BaseComponentSchema = z.object({
  id: z.string().min(1, 'Component ID is required'),
  type: z.string(),
  visible: z.boolean().optional(),
  focused: z.boolean().optional(),
  disabled: z.boolean().optional(),
  tabIndex: z.number().optional(),
  style: StyleSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  testId: z.string().optional(),
});

// =============================================================================
// TEXT COMPONENTS
// =============================================================================

/**
 * TextBlock: Simple text display component
 */
export const TextBlockSchema = BaseComponentSchema.extend({
  type: z.literal('TextBlock'),
  content: z.string(),
  color: ColorSchema.optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  dimColor: z.boolean().optional(),
  wrap: z.boolean().optional(),
  align: AlignmentSchema.optional(),
});

/**
 * Heading: Semantic heading component
 */
export const HeadingSchema = BaseComponentSchema.extend({
  type: z.literal('Heading'),
  content: z.string(),
  level: z.enum(['1', '2', '3', '4', '5', '6']).optional(),
  color: ColorSchema.optional(),
});

/**
 * Link: Clickable text link
 */
export const LinkSchema = BaseComponentSchema.extend({
  type: z.literal('Link'),
  text: z.string(),
  url: z.string().optional(),
  events: EventsSchema.optional(),
});

// =============================================================================
// INTERACTIVE COMPONENTS
// =============================================================================

/**
 * Button specification (for use in ButtonRow)
 */
export const ButtonSpecSchema = z.object({
  id: z.string(),
  label: z.string(),
  shortcut: z.string().optional(),
  disabled: z.boolean().optional(),
  primary: z.boolean().optional(),
  variant: z.enum(['default', 'primary', 'secondary', 'danger', 'ghost']).optional(),
  icon: z.string().optional(),
});

/**
 * Button: Standalone button component
 */
export const ButtonSchema = BaseComponentSchema.extend({
  type: z.literal('Button'),
  label: z.string(),
  shortcut: z.string().optional(),
  primary: z.boolean().optional(),
  variant: z.enum(['default', 'primary', 'secondary', 'danger', 'ghost']).optional(),
  icon: z.string().optional(),
  loading: z.boolean().optional(),
  events: EventsSchema.optional(),
});

/**
 * ButtonRow: Row of buttons
 */
export const ButtonRowSchema = BaseComponentSchema.extend({
  type: z.literal('ButtonRow'),
  buttons: z.array(ButtonSpecSchema),
  spacing: z.number().nonnegative().optional(),
  align: AlignmentSchema.optional(),
  events: EventsSchema.optional(),
});

/**
 * InputField: Text input component
 */
export const InputFieldSchema = BaseComponentSchema.extend({
  type: z.literal('InputField'),
  value: z.string().optional(),
  placeholder: z.string().optional(),
  label: z.string().optional(),
  password: z.boolean().optional(),
  multiline: z.boolean().optional(),
  maxLength: z.number().positive().optional(),
  autoFocus: z.boolean().optional(),
  events: EventsSchema.optional(),
});

/**
 * Checkbox: Checkbox input component
 */
export const CheckboxSchema = BaseComponentSchema.extend({
  type: z.literal('Checkbox'),
  label: z.string(),
  checked: z.boolean().optional(),
  indeterminate: z.boolean().optional(),
  events: EventsSchema.optional(),
});

/**
 * Radio option
 */
export const RadioOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  disabled: z.boolean().optional(),
});

/**
 * RadioGroup: Radio button group
 */
export const RadioGroupSchema = BaseComponentSchema.extend({
  type: z.literal('RadioGroup'),
  options: z.array(RadioOptionSchema).min(1, 'At least one option required'),
  selectedValue: z.string().optional(),
  direction: z.enum(['row', 'column']).optional(),
  events: EventsSchema.optional(),
});

/**
 * Select option
 */
export const SelectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  disabled: z.boolean().optional(),
});

/**
 * Select: Dropdown selection component
 */
export const SelectSchema = BaseComponentSchema.extend({
  type: z.literal('Select'),
  options: z.array(SelectOptionSchema).min(1, 'At least one option required'),
  selectedValue: z.string().optional(),
  placeholder: z.string().optional(),
  events: EventsSchema.optional(),
});

// =============================================================================
// LIST COMPONENTS
// =============================================================================

/**
 * ListItem specification
 */
export const ListItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.unknown().optional(),
  icon: z.string().optional(),
  disabled: z.boolean().optional(),
  description: z.string().optional(),
  badge: z.string().optional(),
});

/**
 * List: Selectable list component
 */
export const ListSchema = BaseComponentSchema.extend({
  type: z.literal('List'),
  items: z.array(ListItemSchema),
  selectedIndex: z.number().nonnegative().optional(),
  selectedIds: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  maxHeight: z.number().positive().optional(),
  searchable: z.boolean().optional(),
  emptyMessage: z.string().optional(),
  events: EventsSchema.optional(),
});

// =============================================================================
// TABLE COMPONENTS
// =============================================================================

/**
 * TableColumn specification
 */
export const TableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  width: DimensionSchema.optional(),
  minWidth: z.number().nonnegative().optional(),
  maxWidth: z.number().nonnegative().optional(),
  align: AlignmentSchema.optional(),
  sortable: z.boolean().optional(),
});

/**
 * Table: Data table component
 */
export const TableSchema = BaseComponentSchema.extend({
  type: z.literal('Table'),
  columns: z.array(TableColumnSchema).min(1, 'At least one column required'),
  rows: z.array(z.record(z.unknown())),
  selectedRowIndex: z.number().nonnegative().optional(),
  selectedRowIds: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  sortColumn: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  showHeader: z.boolean().optional(),
  striped: z.boolean().optional(),
  bordered: z.boolean().optional(),
  events: EventsSchema.optional(),
});

// =============================================================================
// FEEDBACK COMPONENTS
// =============================================================================

/**
 * ProgressBar: Progress indicator
 */
export const ProgressBarSchema = BaseComponentSchema.extend({
  type: z.literal('ProgressBar'),
  value: z.number().min(0).max(100),
  width: z.number().positive().optional(),
  color: ColorSchema.optional(),
  backgroundColor: ColorSchema.optional(),
  showPercentage: z.boolean().optional(),
  label: z.string().optional(),
  indeterminate: z.boolean().optional(),
});

/**
 * Spinner: Loading spinner
 */
export const SpinnerSchema = BaseComponentSchema.extend({
  type: z.literal('Spinner'),
  label: z.string().optional(),
  spinnerType: z.enum([
    'dots', 'line', 'pipe', 'simpleDots', 'simpleDotsScrolling',
    'star', 'flip', 'hamburger', 'growVertical', 'growHorizontal',
    'balloon', 'noise', 'bounce', 'boxBounce', 'triangle', 'arc',
    'circle', 'squareCorners', 'circleQuarters', 'circleHalves',
    'squish', 'toggle', 'arrow', 'bouncingBar', 'bouncingBall',
    'pong', 'shark', 'dqpb',
  ]).optional().default('dots'),
  color: ColorSchema.optional(),
});

/**
 * Badge: Status badge/tag
 */
export const BadgeSchema = BaseComponentSchema.extend({
  type: z.literal('Badge'),
  content: z.string(),
  variant: z.enum(['default', 'primary', 'secondary', 'success', 'warning', 'error', 'info']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
});

/**
 * Alert: Alert/notification box
 */
export const AlertSchema = BaseComponentSchema.extend({
  type: z.literal('Alert'),
  message: z.string(),
  variant: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
  title: z.string().optional(),
  dismissible: z.boolean().optional(),
  events: EventsSchema.optional(),
});

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

// Forward declaration for recursive types
export const ComponentSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    TextBlockSchema,
    HeadingSchema,
    LinkSchema,
    ButtonSchema,
    ButtonRowSchema,
    InputFieldSchema,
    CheckboxSchema,
    RadioGroupSchema,
    SelectSchema,
    ListSchema,
    TableSchema,
    ProgressBarSchema,
    SpinnerSchema,
    BadgeSchema,
    AlertSchema,
    ModalSchema,
    ContainerSchema,
    SplitViewSchema,
    LogsSchema,
    DiffViewSchema,
    FilePickerSchema,
    TabsSchema,
    AccordionSchema,
    TreeViewSchema,
    ChartSchema,
    SeparatorSchema,
    SpacerSchema,
    ScrollViewSchema,
  ])
);

/**
 * Container: Flex container for layout
 */
export const ContainerSchema = BaseComponentSchema.extend({
  type: z.literal('Container'),
  direction: z.enum(['row', 'column']).optional().default('column'),
  gap: z.number().nonnegative().optional(),
  padding: SpacingShorthandSchema.optional(),
  margin: SpacingShorthandSchema.optional(),
  border: BorderSchema.optional(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  justifyContent: z.enum([
    'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
  ]).optional(),
  alignItems: z.enum([
    'flex-start', 'flex-end', 'center', 'stretch', 'baseline',
  ]).optional(),
  wrap: z.boolean().optional(),
  children: z.array(z.lazy(() => ComponentSchema)),
});

/**
 * SplitView: Split panel layout
 */
export const SplitViewSchema = BaseComponentSchema.extend({
  type: z.literal('SplitView'),
  direction: z.enum(['horizontal', 'vertical']),
  sizes: z.array(DimensionSchema).min(2, 'At least two sizes required'),
  minSizes: z.array(z.number().nonnegative()).optional(),
  resizable: z.boolean().optional(),
  children: z.array(z.lazy(() => ComponentSchema)).min(2, 'At least two children required'),
});

/**
 * ScrollView: Scrollable container
 */
export const ScrollViewSchema = BaseComponentSchema.extend({
  type: z.literal('ScrollView'),
  direction: z.enum(['vertical', 'horizontal', 'both']).optional().default('vertical'),
  showScrollbar: z.boolean().optional().default(true),
  scrollPosition: z.number().nonnegative().optional(),
  children: z.array(z.lazy(() => ComponentSchema)),
  events: EventsSchema.optional(),
});

/**
 * Modal: Dialog/modal component
 */
export const ModalSchema = BaseComponentSchema.extend({
  type: z.literal('Modal'),
  title: z.string(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  closable: z.boolean().optional().default(true),
  children: z.array(z.lazy(() => ComponentSchema)),
  footer: z.array(ButtonSpecSchema).optional(),
  footerText: z.string().optional(),
  events: EventsSchema.optional(),
});

/**
 * Separator: Visual divider line
 */
export const SeparatorSchema = BaseComponentSchema.extend({
  type: z.literal('Separator'),
  direction: z.enum(['horizontal', 'vertical']).optional().default('horizontal'),
  color: ColorSchema.optional(),
  character: z.string().length(1).optional(),
});

/**
 * Spacer: Flexible space component
 */
export const SpacerSchema = BaseComponentSchema.extend({
  type: z.literal('Spacer'),
  size: z.number().nonnegative().optional(),
});

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

/**
 * Tab specification
 */
export const TabSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  disabled: z.boolean().optional(),
  closable: z.boolean().optional(),
  content: z.lazy(() => ComponentSchema),
});

/**
 * Tabs: Tab navigation component
 */
export const TabsSchema = BaseComponentSchema.extend({
  type: z.literal('Tabs'),
  tabs: z.array(TabSchema).min(1, 'At least one tab required'),
  activeTabId: z.string(),
  position: z.enum(['top', 'bottom']).optional().default('top'),
  events: EventsSchema.optional(),
});

/**
 * Accordion section
 */
export const AccordionSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  expanded: z.boolean().optional(),
  disabled: z.boolean().optional(),
  content: z.lazy(() => ComponentSchema),
});

/**
 * Accordion: Expandable sections
 */
export const AccordionSchema = BaseComponentSchema.extend({
  type: z.literal('Accordion'),
  sections: z.array(AccordionSectionSchema).min(1, 'At least one section required'),
  allowMultiple: z.boolean().optional().default(false),
  events: EventsSchema.optional(),
});

/**
 * TreeView node
 */
export const TreeNodeSchema: z.ZodType<{
  id: string;
  label: string;
  icon?: string;
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  children?: unknown[];
}> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    expanded: z.boolean().optional(),
    selected: z.boolean().optional(),
    disabled: z.boolean().optional(),
    children: z.array(TreeNodeSchema).optional(),
  })
);

/**
 * TreeView: Hierarchical tree component
 */
export const TreeViewSchema = BaseComponentSchema.extend({
  type: z.literal('TreeView'),
  nodes: z.array(TreeNodeSchema),
  selectedIds: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  showLines: z.boolean().optional().default(true),
  events: EventsSchema.optional(),
});

// =============================================================================
// DATA VISUALIZATION
// =============================================================================

/**
 * Chart data point
 */
export const ChartDataPointSchema = z.object({
  label: z.string().optional(),
  value: z.number(),
  color: ColorSchema.optional(),
});

/**
 * Chart dataset
 */
export const ChartDatasetSchema = z.object({
  label: z.string().optional(),
  data: z.array(ChartDataPointSchema),
  color: ColorSchema.optional(),
});

/**
 * Chart: Data visualization component
 */
export const ChartSchema = BaseComponentSchema.extend({
  type: z.literal('Chart'),
  chartType: z.enum(['bar', 'line', 'sparkline', 'horizontalBar']),
  datasets: z.array(ChartDatasetSchema).min(1, 'At least one dataset required'),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  showLabels: z.boolean().optional().default(true),
  showValues: z.boolean().optional().default(false),
  maxValue: z.number().optional(),
  minValue: z.number().optional(),
});

// =============================================================================
// CODE & LOG COMPONENTS
// =============================================================================

/**
 * Log entry
 */
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  source: z.string().optional(),
});

/**
 * Logs: Log viewer component
 */
export const LogsSchema = BaseComponentSchema.extend({
  type: z.literal('Logs'),
  entries: z.array(LogEntrySchema),
  maxEntries: z.number().positive().optional(),
  filterLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  showTimestamps: z.boolean().optional().default(true),
  showLevel: z.boolean().optional().default(true),
  autoScroll: z.boolean().optional().default(true),
  events: EventsSchema.optional(),
});

/**
 * DiffView: Diff comparison component
 */
export const DiffViewSchema = BaseComponentSchema.extend({
  type: z.literal('DiffView'),
  mode: z.enum(['unified', 'split']),
  oldContent: z.string(),
  newContent: z.string(),
  oldLabel: z.string().optional(),
  newLabel: z.string().optional(),
  filePath: z.string().optional(),
  language: z.string().optional(),
  contextLines: z.number().nonnegative().optional().default(3),
  showLineNumbers: z.boolean().optional().default(true),
});

/**
 * FilePicker: File selection component
 */
export const FilePickerSchema = BaseComponentSchema.extend({
  type: z.literal('FilePicker'),
  currentPath: z.string(),
  selectedPath: z.string().optional(),
  filter: z.string().optional(),
  filterExtensions: z.array(z.string()).optional(),
  showHidden: z.boolean().optional().default(false),
  showPreview: z.boolean().optional().default(false),
  selectDirectories: z.boolean().optional().default(false),
  events: EventsSchema.optional(),
});

// =============================================================================
// ROOT LAYOUT SCHEMA
// =============================================================================

/**
 * Layout metadata
 */
export const LayoutMetadataSchema = z.object({
  author: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Root UILayout schema v1.0
 */
export const UILayoutSchema = z.object({
  version: z.literal('1.0'),
  id: z.string().min(1, 'Layout ID is required'),
  title: z.string().optional(),
  metadata: LayoutMetadataSchema.optional(),
  root: ComponentSchema,
  focusedComponentId: z.string().optional(),
  theme: z.object({
    colors: z.record(ColorSchema).optional(),
    spacing: z.record(z.number()).optional(),
  }).optional(),
});

// =============================================================================
// TYPESCRIPT TYPE EXPORTS
// =============================================================================

export type Dimension = z.infer<typeof DimensionSchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type SpacingShorthand = z.infer<typeof SpacingShorthandSchema>;
export type Border = z.infer<typeof BorderSchema>;
export type Color = z.infer<typeof ColorSchema>;
export type Alignment = z.infer<typeof AlignmentSchema>;
export type VerticalAlign = z.infer<typeof VerticalAlignSchema>;
export type EventHandler = z.infer<typeof EventHandlerSchema>;
export type KeyboardEvent = z.infer<typeof KeyboardEventSchema>;
export type Events = z.infer<typeof EventsSchema>;
export type AriaRole = z.infer<typeof AriaRoleSchema>;
export type Accessibility = z.infer<typeof AccessibilitySchema>;
export type TextStyle = z.infer<typeof TextStyleSchema>;
export type Style = z.infer<typeof StyleSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type Heading = z.infer<typeof HeadingSchema>;
export type Link = z.infer<typeof LinkSchema>;
export type ButtonSpec = z.infer<typeof ButtonSpecSchema>;
export type Button = z.infer<typeof ButtonSchema>;
export type ButtonRow = z.infer<typeof ButtonRowSchema>;
export type InputField = z.infer<typeof InputFieldSchema>;
export type Checkbox = z.infer<typeof CheckboxSchema>;
export type RadioOption = z.infer<typeof RadioOptionSchema>;
export type RadioGroup = z.infer<typeof RadioGroupSchema>;
export type SelectOption = z.infer<typeof SelectOptionSchema>;
export type Select = z.infer<typeof SelectSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type List = z.infer<typeof ListSchema>;
export type TableColumn = z.infer<typeof TableColumnSchema>;
export type Table = z.infer<typeof TableSchema>;
export type ProgressBarSpec = z.infer<typeof ProgressBarSchema>;
export type Spinner = z.infer<typeof SpinnerSchema>;
export type Badge = z.infer<typeof BadgeSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Container = z.infer<typeof ContainerSchema>;
export type SplitView = z.infer<typeof SplitViewSchema>;
export type ScrollView = z.infer<typeof ScrollViewSchema>;
export type Modal = z.infer<typeof ModalSchema>;
export type Separator = z.infer<typeof SeparatorSchema>;
export type Spacer = z.infer<typeof SpacerSchema>;
export type Tab = z.infer<typeof TabSchema>;
export type Tabs = z.infer<typeof TabsSchema>;
export type AccordionSection = z.infer<typeof AccordionSectionSchema>;
export type Accordion = z.infer<typeof AccordionSchema>;
export type TreeNode = z.infer<typeof TreeNodeSchema>;
export type TreeView = z.infer<typeof TreeViewSchema>;
export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartDataset = z.infer<typeof ChartDatasetSchema>;
export type Chart = z.infer<typeof ChartSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type Logs = z.infer<typeof LogsSchema>;
export type DiffView = z.infer<typeof DiffViewSchema>;
export type FilePicker = z.infer<typeof FilePickerSchema>;
export type LayoutMetadata = z.infer<typeof LayoutMetadataSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type UILayout = z.infer<typeof UILayoutSchema>;

// =============================================================================
// INPUT TYPE EXPORTS (for building layouts without requiring defaults)
// =============================================================================

export type TextBlockInput = z.input<typeof TextBlockSchema>;
export type HeadingInput = z.input<typeof HeadingSchema>;
export type ButtonInput = z.input<typeof ButtonSchema>;
export type ButtonRowInput = z.input<typeof ButtonRowSchema>;
export type ListInput = z.input<typeof ListSchema>;
export type ContainerInput = z.input<typeof ContainerSchema>;
export type UILayoutInput = z.input<typeof UILayoutSchema>;

// =============================================================================
// HELPER CONSTANTS
// =============================================================================

/**
 * All valid component types
 */
export const COMPONENT_TYPES = [
  'TextBlock', 'Heading', 'Link',
  'Button', 'ButtonRow', 'InputField', 'Checkbox', 'RadioGroup', 'Select',
  'List', 'Table',
  'ProgressBar', 'Spinner', 'Badge', 'Alert',
  'Container', 'SplitView', 'ScrollView', 'Modal', 'Separator', 'Spacer',
  'Tabs', 'Accordion', 'TreeView',
  'Chart', 'Logs', 'DiffView', 'FilePicker',
] as const;

/**
 * Component types that can contain children
 */
export const CONTAINER_TYPES = [
  'Container', 'SplitView', 'ScrollView', 'Modal', 'Tabs', 'Accordion', 'TreeView',
] as const;

/**
 * Interactive component types
 */
export const INTERACTIVE_TYPES = [
  'Button', 'ButtonRow', 'InputField', 'Checkbox', 'RadioGroup', 'Select',
  'List', 'Table', 'Tabs', 'Accordion', 'TreeView', 'FilePicker',
] as const;
