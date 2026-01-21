/**
 * UILayout Schema v1.0 (UOW-0205)
 *
 * Defines the declarative UI layout specification.
 */

import { z } from 'zod';

// Base component schema
const BaseComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  visible: z.boolean().optional().default(true),
  focused: z.boolean().optional().default(false),
});

// Dimension schema
export const DimensionSchema = z.union([
  z.number(),
  z.string().regex(/^\d+%$/), // Percentage
  z.literal('auto'),
  z.literal('fill'),
]);

// Spacing schema
export const SpacingSchema = z.object({
  top: z.number().optional(),
  right: z.number().optional(),
  bottom: z.number().optional(),
  left: z.number().optional(),
});

// Border schema
export const BorderSchema = z.object({
  style: z.enum(['none', 'single', 'double', 'round', 'bold']).optional(),
  color: z.string().optional(),
});

// Text Block
export const TextBlockSchema = BaseComponentSchema.extend({
  type: z.literal('TextBlock'),
  content: z.string(),
  color: z.string().optional(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  dimColor: z.boolean().optional(),
  wrap: z.boolean().optional().default(true),
});

// Progress Bar
export const ProgressBarSchema = BaseComponentSchema.extend({
  type: z.literal('ProgressBar'),
  value: z.number().min(0).max(100),
  width: z.number().optional(),
  color: z.string().optional(),
  showPercentage: z.boolean().optional(),
  label: z.string().optional(),
});

// Button
export const ButtonSchema = z.object({
  id: z.string(),
  label: z.string(),
  shortcut: z.string().optional(),
  disabled: z.boolean().optional(),
  primary: z.boolean().optional(),
});

// Button Row
export const ButtonRowSchema = BaseComponentSchema.extend({
  type: z.literal('ButtonRow'),
  buttons: z.array(ButtonSchema),
  spacing: z.number().optional(),
});

// List Item
export const ListItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.unknown().optional(),
  icon: z.string().optional(),
  disabled: z.boolean().optional(),
});

// List
export const ListSchema = BaseComponentSchema.extend({
  type: z.literal('List'),
  items: z.array(ListItemSchema),
  selectedIndex: z.number().optional(),
  selectedIds: z.array(z.string()).optional(),
  multiSelect: z.boolean().optional(),
  maxHeight: z.number().optional(),
});

// Table Column
export const TableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  width: DimensionSchema.optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
});

// Table
export const TableSchema = BaseComponentSchema.extend({
  type: z.literal('Table'),
  columns: z.array(TableColumnSchema),
  rows: z.array(z.record(z.unknown())),
  selectedRowIndex: z.number().optional(),
});

// Modal
export const ModalSchema = BaseComponentSchema.extend({
  type: z.literal('Modal'),
  title: z.string(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  children: z.array(z.lazy(() => ComponentSchema)),
  footer: z.string().optional(),
});

// Container
export const ContainerSchema = BaseComponentSchema.extend({
  type: z.literal('Container'),
  direction: z.enum(['row', 'column']).optional().default('column'),
  gap: z.number().optional(),
  padding: SpacingSchema.optional(),
  margin: SpacingSchema.optional(),
  border: BorderSchema.optional(),
  width: DimensionSchema.optional(),
  height: DimensionSchema.optional(),
  children: z.array(z.lazy(() => ComponentSchema)),
});

// SplitView
export const SplitViewSchema = BaseComponentSchema.extend({
  type: z.literal('SplitView'),
  direction: z.enum(['horizontal', 'vertical']),
  sizes: z.array(DimensionSchema),
  children: z.array(z.lazy(() => ComponentSchema)),
});

// Log Entry
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
});

// Logs
export const LogsSchema = BaseComponentSchema.extend({
  type: z.literal('Logs'),
  entries: z.array(LogEntrySchema),
  maxEntries: z.number().optional(),
  filterLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

// DiffView
export const DiffViewSchema = BaseComponentSchema.extend({
  type: z.literal('DiffView'),
  mode: z.enum(['unified', 'split']),
  oldContent: z.string(),
  newContent: z.string(),
  filePath: z.string().optional(),
  language: z.string().optional(),
});

// FilePicker
export const FilePickerSchema = BaseComponentSchema.extend({
  type: z.literal('FilePicker'),
  currentPath: z.string(),
  selectedPath: z.string().optional(),
  filter: z.string().optional(),
  showHidden: z.boolean().optional(),
  showPreview: z.boolean().optional(),
});

// Union of all components
export const ComponentSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion('type', [
    TextBlockSchema,
    ProgressBarSchema,
    ButtonRowSchema,
    ListSchema,
    TableSchema,
    ModalSchema,
    ContainerSchema,
    SplitViewSchema,
    LogsSchema,
    DiffViewSchema,
    FilePickerSchema,
  ])
);

// Root layout schema
export const UILayoutSchema = z.object({
  version: z.literal('1.0'),
  id: z.string(),
  title: z.string().optional(),
  root: ComponentSchema,
  focusedComponentId: z.string().optional(),
});

// TypeScript types
export type Dimension = z.infer<typeof DimensionSchema>;
export type Spacing = z.infer<typeof SpacingSchema>;
export type Border = z.infer<typeof BorderSchema>;
export type TextBlock = z.infer<typeof TextBlockSchema>;
export type ProgressBarSpec = z.infer<typeof ProgressBarSchema>;
export type Button = z.infer<typeof ButtonSchema>;
export type ButtonRow = z.infer<typeof ButtonRowSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type List = z.infer<typeof ListSchema>;
export type TableColumn = z.infer<typeof TableColumnSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Modal = z.infer<typeof ModalSchema>;
export type Container = z.infer<typeof ContainerSchema>;
export type SplitView = z.infer<typeof SplitViewSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type Logs = z.infer<typeof LogsSchema>;
export type DiffView = z.infer<typeof DiffViewSchema>;
export type FilePicker = z.infer<typeof FilePickerSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type UILayout = z.infer<typeof UILayoutSchema>;
