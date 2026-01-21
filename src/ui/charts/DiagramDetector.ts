/**
 * Diagram Detector (EPIC 7 - Charts and Diagrams)
 *
 * Detects ASCII diagrams and charts in text content for special rendering.
 * Supports detection of:
 * - ASCII box diagrams (flowcharts, architecture diagrams)
 * - ASCII tables
 * - ASCII bar charts
 * - ASCII line charts
 * - Tree structures
 * - Network diagrams
 */

/** Types of diagrams that can be detected */
export type DiagramType =
  | 'box'
  | 'table'
  | 'tree'
  | 'chart'
  | 'flowchart'
  | 'network'
  | 'sequence'
  | 'unknown';

/** Result of diagram detection */
export interface DiagramBlock {
  /** Type of diagram detected */
  type: DiagramType;
  /** Start line index (0-based) */
  startLine: number;
  /** End line index (0-based, inclusive) */
  endLine: number;
  /** The diagram content as string */
  content: string;
  /** Raw lines of the diagram */
  lines: string[];
  /** Confidence score 0-1 */
  confidence: number;
  /** Optional title extracted from context */
  title?: string;
}

/** Detection options */
export interface DetectionOptions {
  /** Minimum lines to consider as a diagram */
  minLines?: number;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Enable specific diagram types */
  enabledTypes?: DiagramType[];
  /** Maximum lines to scan */
  maxScanLines?: number;
}

/** Default detection options */
export const DEFAULT_DETECTION_OPTIONS: Required<DetectionOptions> = {
  minLines: 3,
  minConfidence: 0.6,
  enabledTypes: ['box', 'table', 'tree', 'chart', 'flowchart', 'network', 'sequence', 'unknown'],
  maxScanLines: 1000,
};

/** Box drawing characters (Unicode) */
const BOX_CHARS = [
  '─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼',
  '═', '║', '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬',
  '╭', '╮', '╯', '╰', '╱', '╲', '╳',
];

/** ASCII box characters (for strict matching) */
const ASCII_BOX_CHARS = ['+', '*'];

// Note: Loose ASCII box chars (-, |, =) are handled via regex patterns in hasBoxChars()

/** Chart characters */
const CHART_CHARS = ['█', '▓', '▒', '░', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '■', '●', '○', '◆', '◇', '•'];

/** Tree structure characters */
const TREE_CHARS = ['├', '└', '│', '─', '┬', '╰', '╭'];

/** Arrow characters */
const ARROW_CHARS = ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇑', '⇓', '-->', '<--', '->', '<-', '=>', '<='];

/**
 * Detect diagram blocks in text content
 */
export function detectDiagrams(
  content: string,
  options: DetectionOptions = {}
): DiagramBlock[] {
  const opts = { ...DEFAULT_DETECTION_OPTIONS, ...options };
  const lines = content.split('\n');
  const diagrams: DiagramBlock[] = [];

  if (lines.length > opts.maxScanLines) {
    return []; // Content too large to scan
  }

  let i = 0;
  while (i < lines.length) {
    const detection = detectDiagramAtLine(lines, i, opts);
    if (detection && detection.confidence >= opts.minConfidence) {
      if (opts.enabledTypes.includes(detection.type)) {
        diagrams.push(detection);
        i = detection.endLine + 1;
        continue;
      }
    }
    i++;
  }

  return diagrams;
}

/**
 * Detect a diagram starting at a specific line
 */
function detectDiagramAtLine(
  lines: string[],
  startIndex: number,
  opts: Required<DetectionOptions>
): DiagramBlock | null {
  // Try different detection strategies
  const detectors = [
    detectBoxDiagram,
    detectTable,
    detectTreeStructure,
    detectChart,
    detectFlowchart,
    detectSequenceDiagram,
  ];

  for (const detector of detectors) {
    const result = detector(lines, startIndex, opts);
    if (result && (result.endLine - result.startLine + 1) >= opts.minLines) {
      return result;
    }
  }

  return null;
}

/**
 * Detect box diagrams (rectangles with borders)
 */
function detectBoxDiagram(
  lines: string[],
  startIndex: number,
  _opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Check if line starts a box (has box drawing or ASCII box chars)
  if (!hasBoxTopBorder(line)) {
    return null;
  }

  // Find the end of the box diagram
  let endIndex = startIndex;
  let boxDepth = 1;
  let hasContent = false;

  for (let i = startIndex + 1; i < lines.length && i < startIndex + 100; i++) {
    const currentLine = lines[i] ?? '';

    if (hasBoxTopBorder(currentLine)) {
      boxDepth++;
    }

    if (hasBoxBottomBorder(currentLine)) {
      boxDepth--;
      if (boxDepth === 0) {
        endIndex = i;
        break;
      }
    }

    if (hasBoxSideBorder(currentLine)) {
      hasContent = true;
      endIndex = i;
    } else if (!currentLine.trim()) {
      // Empty line might end the diagram
      if (hasContent) {
        endIndex = i - 1;
        break;
      }
    } else if (!isPartOfBoxDiagram(currentLine)) {
      // Non-box line ends detection
      if (hasContent) {
        endIndex = i - 1;
        break;
      } else {
        return null;
      }
    }
  }

  if (endIndex <= startIndex) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = calculateBoxConfidence(diagramLines);

  // Look for title in preceding line
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'box',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

/**
 * Detect ASCII tables
 */
function detectTable(
  lines: string[],
  startIndex: number,
  _opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Check for table separator line (e.g., +---+---+ or |---|---|)
  if (!isTableSeparator(line) && !isTableRow(line)) {
    return null;
  }

  let endIndex = startIndex;
  let separatorCount = 0;
  let rowCount = 0;

  for (let i = startIndex; i < lines.length && i < startIndex + 50; i++) {
    const currentLine = lines[i] ?? '';

    if (isTableSeparator(currentLine)) {
      separatorCount++;
      endIndex = i;
    } else if (isTableRow(currentLine)) {
      rowCount++;
      endIndex = i;
    } else if (currentLine.trim() === '') {
      // Empty line ends table
      break;
    } else {
      // Non-table content
      break;
    }
  }

  // Need at least one separator and one row to be a table
  if (separatorCount < 1 || rowCount < 1) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = Math.min(0.9, 0.5 + separatorCount * 0.1 + rowCount * 0.05);
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'table',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

/**
 * Detect tree structures
 */
function detectTreeStructure(
  lines: string[],
  startIndex: number,
  opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Check for tree-like structure
  if (!hasTreeChars(line) && !isIndentedStructure(lines, startIndex)) {
    return null;
  }

  let endIndex = startIndex;
  let treeLineCount = 0;

  for (let i = startIndex; i < lines.length && i < startIndex + 100; i++) {
    const currentLine = lines[i] ?? '';

    if (hasTreeChars(currentLine) || isIndentedLine(currentLine)) {
      treeLineCount++;
      endIndex = i;
    } else if (currentLine.trim() === '') {
      // Allow one empty line within tree
      if (i + 1 < lines.length && hasTreeChars(lines[i + 1] ?? '')) {
        continue;
      }
      break;
    } else {
      break;
    }
  }

  if (treeLineCount < opts.minLines) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = Math.min(0.85, 0.4 + treeLineCount * 0.05);
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'tree',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

/**
 * Detect ASCII charts (bar charts, sparklines, etc.)
 */
function detectChart(
  lines: string[],
  startIndex: number,
  _opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Check for chart characters
  if (!hasChartChars(line) && !hasAxisChars(line)) {
    return null;
  }

  let endIndex = startIndex;
  let chartLineCount = 0;

  for (let i = startIndex; i < lines.length && i < startIndex + 50; i++) {
    const currentLine = lines[i] ?? '';

    if (hasChartChars(currentLine) || hasAxisChars(currentLine) || isChartLabel(currentLine)) {
      chartLineCount++;
      endIndex = i;
    } else if (currentLine.trim() === '') {
      break;
    } else if (i === startIndex) {
      return null;
    } else {
      break;
    }
  }

  if (chartLineCount < 2) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = calculateChartConfidence(diagramLines);
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'chart',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

/**
 * Detect flowcharts (boxes with arrows)
 */
function detectFlowchart(
  lines: string[],
  startIndex: number,
  _opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Skip if line looks like code
  if (looksLikeCode(line)) {
    return null;
  }

  // Flowcharts typically have boxes and arrows - require Unicode box chars or strict patterns
  const hasStrongBoxEvidence = BOX_CHARS.some((c) => line.includes(c)) ||
    /^[+][-=]+[+]/.test(line.trim());

  if (!hasStrongBoxEvidence && !hasArrowChars(line)) {
    return null;
  }

  let endIndex = startIndex;
  let foundBoxes = false;
  let foundArrows = false;
  let boxLineCount = 0;

  for (let i = startIndex; i < lines.length && i < startIndex + 100; i++) {
    const currentLine = lines[i] ?? '';

    // Skip lines that look like code
    if (looksLikeCode(currentLine)) {
      break;
    }

    if (hasBoxChars(currentLine)) {
      foundBoxes = true;
      boxLineCount++;
      endIndex = i;
    } else if (hasArrowChars(currentLine)) {
      foundArrows = true;
      endIndex = i;
    } else if (currentLine.trim() === '' && i > startIndex) {
      // Allow empty lines within flowchart
      if (i + 1 < lines.length && (hasBoxChars(lines[i + 1] ?? '') || hasArrowChars(lines[i + 1] ?? ''))) {
        continue;
      }
      break;
    } else if (i > startIndex && !isPartOfFlowchart(currentLine)) {
      break;
    }
  }

  // Require multiple lines with box chars for confidence
  if (!foundBoxes || endIndex <= startIndex || boxLineCount < 2) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = foundBoxes && foundArrows ? 0.85 : foundBoxes ? 0.65 : 0.5;
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'flowchart',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

/**
 * Detect sequence diagrams
 */
function detectSequenceDiagram(
  lines: string[],
  startIndex: number,
  _opts: Required<DetectionOptions>
): DiagramBlock | null {
  const line = lines[startIndex] ?? '';

  // Sequence diagrams often have vertical lines and arrows
  if (!hasSequencePattern(line)) {
    return null;
  }

  let endIndex = startIndex;
  let sequenceLineCount = 0;

  for (let i = startIndex; i < lines.length && i < startIndex + 100; i++) {
    const currentLine = lines[i] ?? '';

    if (hasSequencePattern(currentLine)) {
      sequenceLineCount++;
      endIndex = i;
    } else if (currentLine.trim() === '') {
      break;
    } else if (!isPartOfSequenceDiagram(currentLine)) {
      break;
    }
  }

  if (sequenceLineCount < _opts.minLines) {
    return null;
  }

  const diagramLines = lines.slice(startIndex, endIndex + 1);
  const confidence = Math.min(0.8, 0.5 + sequenceLineCount * 0.05);
  const title = extractTitleFromContext(lines, startIndex);

  return {
    type: 'sequence',
    startLine: startIndex,
    endLine: endIndex,
    content: diagramLines.join('\n'),
    lines: diagramLines,
    confidence,
    title,
  };
}

// Helper functions

function hasBoxTopBorder(line: string): boolean {
  const trimmed = line.trim();
  // Check for patterns like: +---+ or ┌───┐ or ╔═══╗
  return (
    /^[+╔┌╭][-=─═]+[+╗┐╮]/.test(trimmed) ||
    /^\+[-=]+\+/.test(trimmed) ||
    /^[┌╔╭].*[┐╗╮]$/.test(trimmed)
  );
}

function hasBoxBottomBorder(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[+╚└╰][-=─═]+[+╝┘╯]/.test(trimmed) ||
    /^\+[-=]+\+/.test(trimmed) ||
    /^[└╚╰].*[┘╝╯]$/.test(trimmed)
  );
}

function hasBoxSideBorder(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^[|│║].*[|│║]$/.test(trimmed) ||
    /^\|.*\|$/.test(trimmed)
  );
}

function isPartOfBoxDiagram(line: string): boolean {
  return hasBoxChars(line) || hasBoxSideBorder(line) || /^[|│║+├┤╠╣]/.test(line.trim());
}

function hasBoxChars(line: string): boolean {
  // Check for Unicode box chars
  if (BOX_CHARS.some((c) => line.includes(c))) {
    return true;
  }
  // Check for strict ASCII box chars (+, *)
  if (ASCII_BOX_CHARS.some((c) => line.includes(c))) {
    return true;
  }
  // For loose ASCII chars (-, |, =), require multiple consecutive or in specific patterns
  const trimmed = line.trim();
  // Pattern like +---+ or |---| (table/box border)
  if (/^[+|][-=]+[+|]/.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Check if line looks like code rather than a diagram
 * Exported for use in heuristic diagram detection
 */
export function looksLikeCode(line: string): boolean {
  const trimmed = line.trim();
  // Common code patterns
  return (
    // Function calls, assignments
    /^(const|let|var|function|if|else|for|while|return|import|export|class)\s/.test(trimmed) ||
    // Object/array literals
    /^[\[{].*[\]}][;,]?\s*$/.test(trimmed) ||
    // Method chaining or pipe operators
    /^\s*[|.]?\s*(filter|map|reduce|forEach|then|catch|await)\s*\(/.test(trimmed) ||
    // Shell commands
    /^\$\s+/.test(trimmed) ||
    // Comments
    /^(\/\/|#|\/\*|\*|<!--)/.test(trimmed) ||
    // Arrow functions or comparisons
    /=>\s*{/.test(trimmed) ||
    // String with common operators
    /["'`].*["'`]\s*[+\-*/]/.test(trimmed)
  );
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  // Patterns like: +---+---+ or |---|---| or ├───┼───┤
  return (
    /^[+|├][-─=]+([+|│├┼][-─=]+)+[+|┤]?$/.test(trimmed) ||
    /^[-─=]+$/.test(trimmed)
  );
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  // Patterns like: | cell | cell | or │ cell │ cell │
  return /^[|│].*[|│]$/.test(trimmed) && (trimmed.match(/[|│]/g) || []).length >= 2;
}

function hasTreeChars(line: string): boolean {
  return TREE_CHARS.some((c) => line.includes(c));
}

function isIndentedStructure(lines: string[], startIndex: number): boolean {
  if (startIndex + 2 >= lines.length) return false;

  const line1 = lines[startIndex] ?? '';
  const line2 = lines[startIndex + 1] ?? '';
  const line3 = lines[startIndex + 2] ?? '';

  const indent1 = line1.search(/\S/);
  const indent2 = line2.search(/\S/);
  const indent3 = line3.search(/\S/);

  // Check for increasing indentation (tree-like)
  return indent1 >= 0 && indent2 > indent1 && indent3 >= indent2;
}

function isIndentedLine(line: string): boolean {
  return /^\s{2,}\S/.test(line);
}

function hasChartChars(line: string): boolean {
  return CHART_CHARS.some((c) => line.includes(c));
}

function hasAxisChars(line: string): boolean {
  // Check for axis patterns like: ┤ ├ ┼ └── or number labels
  return /[┤├┼└┘┬┴─|]/.test(line) || /^\s*[\d.]+\s*[┤├│|]/.test(line);
}

function isChartLabel(line: string): boolean {
  // Labels are typically short text with alignment
  return /^\s*\S+\s+[\d.]+%?$/.test(line.trim()) || /^\s+\^/.test(line);
}

function calculateChartConfidence(lines: string[]): number {
  let chartCharCount = 0;
  let totalRelevantChars = 0;

  for (const line of lines) {
    for (const char of line) {
      if (CHART_CHARS.includes(char)) {
        chartCharCount++;
      }
      if (char.trim()) {
        totalRelevantChars++;
      }
    }
  }

  if (totalRelevantChars === 0) return 0;
  return Math.min(0.9, 0.5 + (chartCharCount / totalRelevantChars) * 0.5);
}

function hasArrowChars(line: string): boolean {
  return ARROW_CHARS.some((a) => line.includes(a));
}

function isPartOfFlowchart(line: string): boolean {
  return hasBoxChars(line) || hasArrowChars(line) || /^\s*\S+\s*$/.test(line);
}

function hasSequencePattern(line: string): boolean {
  // Sequence diagrams often have patterns like: A ──> B or vertical bars
  return (
    /[│|].+[│|]/.test(line) ||
    /[-─=]+[>→]/.test(line) ||
    /[<←][-─=]+/.test(line)
  );
}

function isPartOfSequenceDiagram(line: string): boolean {
  return hasSequencePattern(line) || /^\s*[│|]\s*$/.test(line);
}

function calculateBoxConfidence(lines: string[]): number {
  let boxCharCount = 0;
  let totalChars = 0;
  let hasValidStructure = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const char of line) {
      if (BOX_CHARS.includes(char) || ASCII_BOX_CHARS.includes(char)) {
        boxCharCount++;
      }
      if (char.trim()) {
        totalChars++;
      }
    }

    // Check for valid top/bottom borders
    if (i === 0 && hasBoxTopBorder(line)) {
      hasValidStructure = true;
    }
    if (i === lines.length - 1 && hasBoxBottomBorder(line)) {
      hasValidStructure = true;
    }
  }

  if (totalChars === 0) return 0;

  const charRatio = boxCharCount / totalChars;
  const baseConfidence = 0.4 + charRatio * 0.4;

  return Math.min(0.95, hasValidStructure ? baseConfidence + 0.15 : baseConfidence);
}

function extractTitleFromContext(lines: string[], startIndex: number): string | undefined {
  if (startIndex > 0) {
    const prevLine = lines[startIndex - 1]?.trim() ?? '';
    // Check if previous line looks like a title (short, no special chars)
    if (prevLine && prevLine.length < 80 && !/^[+\-|─│═╔╗╚╝]/.test(prevLine)) {
      // Remove common prefixes
      return prevLine.replace(/^(#+|>|\*|\d+\.)\s*/, '').trim() || undefined;
    }
  }
  return undefined;
}

/**
 * Check if content contains any diagrams
 */
export function hasDiagram(content: string, options?: DetectionOptions): boolean {
  const diagrams = detectDiagrams(content, options);
  return diagrams.length > 0;
}

/**
 * Get the first diagram block from content
 */
export function getFirstDiagram(content: string, options?: DetectionOptions): DiagramBlock | null {
  const diagrams = detectDiagrams(content, options);
  return diagrams[0] ?? null;
}

/**
 * Check if a specific line is part of a diagram
 */
export function isLineInDiagram(content: string, lineNumber: number, options?: DetectionOptions): boolean {
  const diagrams = detectDiagrams(content, options);
  return diagrams.some((d) => lineNumber >= d.startLine && lineNumber <= d.endLine);
}

/**
 * Quick check if line might be start of a diagram (faster than full detection)
 */
export function mightBeDiagramStart(line: string): boolean {
  return (
    hasBoxTopBorder(line) ||
    isTableSeparator(line) ||
    hasTreeChars(line) ||
    hasChartChars(line) ||
    /^[│|]\s*\S/.test(line)
  );
}
