/**
 * Charts and Diagrams Module (EPIC 7)
 *
 * Provides ASCII chart rendering and diagram detection capabilities
 * for the Claude Code Dynamic Terminal UI.
 *
 * UOW-0702: Diagram viewer action with 'd' keybinding
 * UOW-0703: Diagram detection with false positive/negative tests
 * UOW-0705: Chart block rendering with ANSI passthrough
 * UOW-0706: Chart renderer integration tests
 */

// Diagram Detection (UOW-0702, UOW-0703)
export {
  detectDiagrams,
  hasDiagram,
  getFirstDiagram,
  isLineInDiagram,
  mightBeDiagramStart,
  DEFAULT_DETECTION_OPTIONS,
  type DiagramType,
  type DiagramBlock,
  type DetectionOptions,
} from './DiagramDetector.js';

// Chart Rendering (UOW-0705, UOW-0706)
export {
  ChartRenderer,
  ChartBlock,
  renderChartToLines,
  createBarChartString,
  createLineChartString,
  type ChartBorderStyle,
  type ChartColors,
  type ChartRendererProps,
} from './ChartRenderer.js';
