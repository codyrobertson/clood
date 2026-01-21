/**
 * Chart Renderer Tests (UOW-0706)
 *
 * Integration tests for ChartRenderer component including:
 * - Bar chart rendering and formatting
 * - Line chart rendering and formatting
 * - Border styling options
 * - ANSI color passthrough
 * - Title rendering
 */

import { describe, it, expect } from 'vitest';
import {
  renderChartToLines,
  createBarChartString,
  createLineChartString,
  type ChartBorderStyle,
} from './ChartRenderer.js';

// ============================================================================
// Test Fixtures - Bar Charts
// ============================================================================

const BAR_CHART_FIXTURES = {
  // Simple sales data
  sales: [
    { label: 'Q1', value: 100 },
    { label: 'Q2', value: 150 },
    { label: 'Q3', value: 125 },
    { label: 'Q4', value: 200 },
  ],

  // Regional data with varying values
  regional: [
    { label: 'North', value: 85 },
    { label: 'South', value: 65 },
    { label: 'East', value: 75 },
    { label: 'West', value: 52 },
    { label: 'Central', value: 90 },
  ],

  // Single item
  singleItem: [{ label: 'Total', value: 100 }],

  // Zero values
  withZeros: [
    { label: 'A', value: 50 },
    { label: 'B', value: 0 },
    { label: 'C', value: 75 },
    { label: 'D', value: 0 },
  ],

  // Large values
  largeValues: [
    { label: 'Server 1', value: 1000000 },
    { label: 'Server 2', value: 2500000 },
    { label: 'Server 3', value: 1750000 },
  ],

  // Long labels
  longLabels: [
    { label: 'Very Long Label Name Here', value: 80 },
    { label: 'Another Long One', value: 60 },
    { label: 'Short', value: 40 },
  ],

  // Percentages
  percentages: [
    { label: 'Success', value: 95 },
    { label: 'Warning', value: 3 },
    { label: 'Error', value: 2 },
  ],
};

// ============================================================================
// Test Fixtures - Line Charts
// ============================================================================

const LINE_CHART_FIXTURES = {
  // Simple ascending data
  ascending: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],

  // Descending data
  descending: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10],

  // Sinusoidal pattern
  sinusoidal: Array.from({ length: 20 }, (_, i) =>
    Math.round(50 + 40 * Math.sin(i / 3))
  ),

  // Random fluctuations
  fluctuating: [45, 52, 48, 55, 42, 58, 47, 53, 49, 56, 44, 57],

  // Single value
  singleValue: [50],

  // Two values
  twoValues: [30, 70],

  // Constant value
  constant: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50],

  // With negative values
  withNegatives: [-20, -10, 0, 10, 20, 30, 20, 10, 0, -10],

  // Sparse data
  sparse: [10, 100, 10, 100, 10],

  // Large dataset
  largeDataset: Array.from({ length: 100 }, (_, i) =>
    Math.round(50 + 30 * Math.sin(i / 10) + Math.random() * 10)
  ),
};

// ============================================================================
// Tests
// ============================================================================

describe('ChartRenderer (UOW-0706)', () => {
  describe('createBarChartString', () => {
    it('should create bar chart from sales data', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.sales);
      const lines = chart.split('\n');

      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain('Q1');
      expect(lines[1]).toContain('Q2');
      expect(lines[3]).toContain('Q4');

      // Q4 should have the longest bar (highest value)
      const q1BarLength = (lines[0]?.match(/█/g) || []).length;
      const q4BarLength = (lines[3]?.match(/█/g) || []).length;
      expect(q4BarLength).toBeGreaterThan(q1BarLength);
    });

    it('should align labels properly', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.longLabels);
      const lines = chart.split('\n');

      // All bars should start at the same position
      const barStarts = lines.map((l) => l.indexOf('█'));
      expect(barStarts[0]).toBe(barStarts[1]);
      expect(barStarts[1]).toBe(barStarts[2]);
    });

    it('should show values when enabled', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.sales, {
        showValues: true,
      });

      expect(chart).toContain('100');
      expect(chart).toContain('150');
      expect(chart).toContain('200');
    });

    it('should hide values when disabled', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.sales, {
        showValues: false,
      });

      // Values should not appear at end of lines
      const lines = chart.split('\n');
      for (const line of lines) {
        // Line should end with bar character, not number
        expect(line.trim()).toMatch(/█$/);
      }
    });

    it('should handle zero values', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.withZeros);
      const lines = chart.split('\n');

      // Lines with value 0 should have no bar characters
      const lineB = lines[1];
      const lineD = lines[3];

      expect((lineB?.match(/█/g) || []).length).toBe(0);
      expect((lineD?.match(/█/g) || []).length).toBe(0);
    });

    it('should respect custom width', () => {
      const narrowChart = createBarChartString(BAR_CHART_FIXTURES.sales, {
        width: 10,
      });
      const wideChart = createBarChartString(BAR_CHART_FIXTURES.sales, {
        width: 50,
      });

      const narrowMaxBars = Math.max(
        ...narrowChart.split('\n').map((l) => (l.match(/█/g) || []).length)
      );
      const wideMaxBars = Math.max(
        ...wideChart.split('\n').map((l) => (l.match(/█/g) || []).length)
      );

      expect(wideMaxBars).toBeGreaterThan(narrowMaxBars);
    });

    it('should use custom bar character', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.sales, {
        barChar: '#',
      });

      expect(chart).toContain('#');
      expect(chart).not.toContain('█');
    });

    it('should handle single item', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.singleItem);
      const lines = chart.split('\n');

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Total');
      expect(lines[0]).toContain('█');
    });

    it('should handle large values', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.largeValues);
      const lines = chart.split('\n');

      expect(lines).toHaveLength(3);
      // Values should be displayed
      expect(chart).toContain('1000000');
      expect(chart).toContain('2500000');
    });

    it('should respect maxValue option', () => {
      const chart = createBarChartString(BAR_CHART_FIXTURES.percentages, {
        maxValue: 100,
        width: 20,
      });
      const lines = chart.split('\n');

      // Success (95%) should have 19 bars (95% of 20)
      const successBars = (lines[0]?.match(/█/g) || []).length;
      expect(successBars).toBe(19);
    });
  });

  describe('createLineChartString', () => {
    it('should create line chart from ascending data', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.ascending);
      const lines = chart.split('\n');

      expect(lines.length).toBeGreaterThan(0);
      // Should contain plot points
      expect(chart).toContain('•');
    });

    it('should show axis when enabled', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        showAxis: true,
      });

      expect(chart).toContain('┤'); // Y-axis marker
      expect(chart).toContain('│'); // Y-axis line
      expect(chart).toContain('└'); // Origin
      expect(chart).toContain('─'); // X-axis
    });

    it('should hide axis when disabled', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        showAxis: false,
      });

      expect(chart).not.toContain('┤');
      expect(chart).not.toContain('│');
      expect(chart).not.toContain('└');
    });

    it('should respect width option', () => {
      const narrowChart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        width: 20,
        showAxis: false,
      });
      const wideChart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        width: 60,
        showAxis: false,
      });

      const narrowWidth = Math.max(
        ...narrowChart.split('\n').map((l) => l.length)
      );
      const wideWidth = Math.max(
        ...wideChart.split('\n').map((l) => l.length)
      );

      expect(wideWidth).toBeGreaterThan(narrowWidth);
    });

    it('should respect height option', () => {
      const shortChart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        height: 5,
        showAxis: false,
      });
      const tallChart = createLineChartString(LINE_CHART_FIXTURES.ascending, {
        height: 15,
        showAxis: false,
      });

      expect(tallChart.split('\n').length).toBeGreaterThan(
        shortChart.split('\n').length
      );
    });

    it('should handle constant data', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.constant, {
        showAxis: false,
      });

      // All points should be on the same line
      const lines = chart.split('\n');
      const pointLines = lines.filter((l) => l.includes('•'));
      expect(pointLines.length).toBe(1);
    });

    it('should handle single value', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.singleValue, {
        showAxis: false,
      });

      expect(chart).toContain('•');
    });

    it('should handle negative values', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.withNegatives, {
        showAxis: true,
      });

      expect(chart.length).toBeGreaterThan(0);
      expect(chart).toContain('•');
    });

    it('should handle large datasets', () => {
      const chart = createLineChartString(LINE_CHART_FIXTURES.largeDataset, {
        width: 50,
        showAxis: false,
      });

      expect(chart).toContain('•');
      // Should not crash or hang
      expect(chart.split('\n').length).toBeGreaterThan(0);
    });

    it('should return empty string for empty data', () => {
      const chart = createLineChartString([]);
      expect(chart).toBe('');
    });
  });

  describe('renderChartToLines', () => {
    const sampleContent = `
North   ████████████████████ 85
South   ███████████████ 65
East    ██████████████████ 75
West    ████████████ 52
`.trim();

    it('should render content with single border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'single',
      });

      expect(lines[0]).toContain('┌');
      expect(lines[0]).toContain('┐');
      expect(lines[lines.length - 1]).toContain('└');
      expect(lines[lines.length - 1]).toContain('┘');

      // Content lines should have vertical borders
      expect(lines[1]).toMatch(/^│.*│$/);
    });

    it('should render content with double border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'double',
      });

      expect(lines[0]).toContain('╔');
      expect(lines[0]).toContain('╗');
      expect(lines[lines.length - 1]).toContain('╚');
      expect(lines[lines.length - 1]).toContain('╝');
    });

    it('should render content with rounded border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'rounded',
      });

      expect(lines[0]).toContain('╭');
      expect(lines[0]).toContain('╮');
      expect(lines[lines.length - 1]).toContain('╰');
      expect(lines[lines.length - 1]).toContain('╯');
    });

    it('should render content with bold border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'bold',
      });

      expect(lines[0]).toContain('┏');
      expect(lines[0]).toContain('┓');
      expect(lines[lines.length - 1]).toContain('┗');
      expect(lines[lines.length - 1]).toContain('┛');
    });

    it('should render content with ascii border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'ascii',
      });

      expect(lines[0]).toMatch(/^\+[-]+\+$/);
      expect(lines[lines.length - 1]).toMatch(/^\+[-]+\+$/);
      expect(lines[1]).toMatch(/^\|.*\|$/);
    });

    it('should render content without border', () => {
      const lines = renderChartToLines(sampleContent, {
        borderStyle: 'none',
      });

      // Should not have border characters
      expect(lines[0]).not.toContain('┌');
      expect(lines[0]).not.toContain('╔');
      expect(lines[0]).not.toContain('+');

      // Should still have content
      expect(lines.join('\n')).toContain('North');
    });

    it('should render title in border', () => {
      const lines = renderChartToLines(sampleContent, {
        title: 'Regional Sales',
        borderStyle: 'single',
      });

      expect(lines[0]).toContain('Regional Sales');
      expect(lines[0]).toContain('┤');
      expect(lines[0]).toContain('├');
    });

    it('should respect minWidth option', () => {
      const narrowContent = 'A B C';
      const lines = renderChartToLines(narrowContent, {
        minWidth: 50,
        borderStyle: 'single',
      });

      // Border should be at least 50 + padding + borders wide
      expect(lines[0]?.length).toBeGreaterThan(50);
    });

    it('should respect paddingX option', () => {
      const lines1 = renderChartToLines('Test', {
        paddingX: 1,
        borderStyle: 'single',
      });
      const lines2 = renderChartToLines('Test', {
        paddingX: 5,
        borderStyle: 'single',
      });

      expect(lines2[1]?.length).toBeGreaterThan(lines1[1]?.length || 0);
    });

    it('should respect paddingY option', () => {
      const lines1 = renderChartToLines('Test', {
        paddingY: 0,
        borderStyle: 'single',
      });
      const lines2 = renderChartToLines('Test', {
        paddingY: 2,
        borderStyle: 'single',
      });

      // Should have 4 more lines (2 padding top + 2 padding bottom)
      expect(lines2.length).toBe(lines1.length + 4);
    });

    it('should preserve content without modification', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const lines = renderChartToLines(content, {
        borderStyle: 'single',
        paddingX: 0,
      });

      // Extract content lines (skip border lines)
      const contentLines = lines.slice(1, -1);

      expect(contentLines.some((l) => l.includes('Line 1'))).toBe(true);
      expect(contentLines.some((l) => l.includes('Line 2'))).toBe(true);
      expect(contentLines.some((l) => l.includes('Line 3'))).toBe(true);
    });

    it('should strip ANSI when preserveAnsi is false', () => {
      const contentWithAnsi = '\x1b[31mRed Text\x1b[0m Normal';
      const lines = renderChartToLines(contentWithAnsi, {
        preserveAnsi: false,
        borderStyle: 'none',
      });

      // Should not contain ANSI escape codes
      expect(lines.join('\n')).not.toContain('\x1b[');
      expect(lines.join('\n')).toContain('Red Text');
    });

    it('should handle empty content', () => {
      const lines = renderChartToLines('', {
        borderStyle: 'single',
      });

      // Should still have borders
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain('┌');
      expect(lines[lines.length - 1]).toContain('└');
    });

    it('should handle content with special characters', () => {
      const content = 'Price: $100 & <tax> "quoted"';
      const lines = renderChartToLines(content, {
        borderStyle: 'single',
      });

      expect(lines.join('\n')).toContain('$100');
      expect(lines.join('\n')).toContain('&');
      expect(lines.join('\n')).toContain('<tax>');
    });
  });

  describe('Border Style Options', () => {
    const borderStyles: ChartBorderStyle[] = [
      'none',
      'single',
      'double',
      'rounded',
      'bold',
      'ascii',
    ];

    it.each(borderStyles)('should render with %s border style', (style) => {
      const lines = renderChartToLines('Test content', {
        borderStyle: style,
      });

      expect(lines.length).toBeGreaterThan(0);
      expect(lines.join('\n')).toContain('Test content');
    });
  });

  describe('Integration: Bar Chart with Renderer', () => {
    it('should render bar chart in bordered frame', () => {
      const chartContent = createBarChartString(BAR_CHART_FIXTURES.sales);
      const lines = renderChartToLines(chartContent, {
        title: 'Quarterly Sales',
        borderStyle: 'double',
      });

      // Should have title
      expect(lines[0]).toContain('Quarterly Sales');

      // Should have all quarters
      const content = lines.join('\n');
      expect(content).toContain('Q1');
      expect(content).toContain('Q2');
      expect(content).toContain('Q3');
      expect(content).toContain('Q4');

      // Should have bars
      expect(content).toContain('█');
    });
  });

  describe('Integration: Line Chart with Renderer', () => {
    it('should render line chart in bordered frame', () => {
      const chartContent = createLineChartString(LINE_CHART_FIXTURES.sinusoidal, {
        width: 30,
        height: 8,
        showAxis: true,
      });
      const lines = renderChartToLines(chartContent, {
        title: 'CPU Usage',
        borderStyle: 'single',
      });

      // Should have title
      expect(lines[0]).toContain('CPU Usage');

      // Should have plot points
      const content = lines.join('\n');
      expect(content).toContain('•');

      // Should have axis elements
      expect(content).toContain('│');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long lines', () => {
      const longLine = 'X'.repeat(200);
      const lines = renderChartToLines(longLine, {
        borderStyle: 'single',
      });

      expect(lines.join('\n')).toContain('X'.repeat(200));
    });

    it('should handle many lines', () => {
      const manyLines = Array(50).fill('Line').join('\n');
      const lines = renderChartToLines(manyLines, {
        borderStyle: 'single',
      });

      // 50 content lines + 2 border lines
      expect(lines.length).toBe(52);
    });

    it('should handle unicode content', () => {
      const unicodeContent = '日本語 한국어 中文';
      const lines = renderChartToLines(unicodeContent, {
        borderStyle: 'single',
      });

      expect(lines.join('\n')).toContain('日本語');
      expect(lines.join('\n')).toContain('한국어');
      expect(lines.join('\n')).toContain('中文');
    });

    it('should handle mixed width characters', () => {
      const mixedContent = 'ABC あいう 123';
      const lines = renderChartToLines(mixedContent, {
        borderStyle: 'single',
      });

      expect(lines.join('\n')).toContain('ABC');
      expect(lines.join('\n')).toContain('あいう');
      expect(lines.join('\n')).toContain('123');
    });
  });
});
