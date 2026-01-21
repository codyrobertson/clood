/**
 * Declarative Chart Component (UOW-1001)
 *
 * ASCII-based charts for terminal UI.
 */

import React from 'react';
import { Box, Text } from 'ink';

export interface BarChartProps {
  /** Data points */
  data: Array<{ label: string; value: number; color?: string }>;
  /** Maximum value (auto-calculated if not provided) */
  max?: number;
  /** Width of chart in characters */
  width?: number;
  /** Show values */
  showValues?: boolean;
  /** Bar character */
  barChar?: string;
  /** Horizontal layout */
  horizontal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  max: maxProp,
  width = 30,
  showValues = true,
  barChar = '█',
  horizontal = true,
}) => {
  const maxValue = maxProp ?? Math.max(...data.map((d) => d.value), 1);
  const maxLabelWidth = Math.max(...data.map((d) => d.label.length));

  if (horizontal) {
    return (
      <Box flexDirection="column">
        {data.map((item, i) => {
          const barWidth = Math.round((item.value / maxValue) * width);
          return (
            <Box key={i}>
              <Text>{item.label.padEnd(maxLabelWidth)} </Text>
              <Text color={item.color as Parameters<typeof Text>[0]['color']}>
                {barChar.repeat(barWidth)}
              </Text>
              {showValues && (
                <Text dimColor> {item.value}</Text>
              )}
            </Box>
          );
        })}
      </Box>
    );
  }

  // Vertical layout
  const height = 10;
  const barWidth = Math.floor(width / data.length);

  const rows: string[][] = [];
  for (let row = height - 1; row >= 0; row--) {
    const rowData: string[] = [];
    for (const item of data) {
      const barHeight = Math.round((item.value / maxValue) * height);
      if (row < barHeight) {
        rowData.push(barChar.repeat(barWidth - 1) + ' ');
      } else {
        rowData.push(' '.repeat(barWidth));
      }
    }
    rows.push(rowData);
  }

  return (
    <Box flexDirection="column">
      {rows.map((row, i) => (
        <Box key={i}>
          {row.map((cell, j) => (
            <Text key={j} color={data[j]?.color as Parameters<typeof Text>[0]['color']}>
              {cell}
            </Text>
          ))}
        </Box>
      ))}
      {/* Labels */}
      <Box>
        {data.map((item, i) => (
          <Text key={i} dimColor>
            {item.label.slice(0, barWidth - 1).padEnd(barWidth)}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Sparkline chart
 */
export interface SparklineProps {
  data: number[];
  width?: number;
  color?: string;
}

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 20,
  color = 'cyan',
}) => {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Resample if needed
  const sampledData = data.length > width
    ? data.filter((_, i) => i % Math.ceil(data.length / width) === 0).slice(0, width)
    : data;

  const chars = sampledData.map((value) => {
    const normalized = (value - min) / range;
    const index = Math.floor(normalized * (SPARK_CHARS.length - 1));
    return SPARK_CHARS[index] ?? SPARK_CHARS[0];
  });

  return (
    <Text color={color as Parameters<typeof Text>[0]['color']}>
      {chars.join('')}
    </Text>
  );
};

/**
 * Line chart with ASCII
 */
export interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  showAxis?: boolean;
  color?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 40,
  height = 10,
  showAxis = true,
  color = 'cyan',
}) => {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create grid
  const grid: string[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(' '));

  // Plot points
  const step = Math.max(1, Math.floor(data.length / width));
  for (let x = 0; x < width && x * step < data.length; x++) {
    const value = data[x * step] ?? 0;
    const y = Math.floor(((value - min) / range) * (height - 1));
    const gridY = height - 1 - y;
    if (grid[gridY]) {
      grid[gridY][x] = '•';
    }
  }

  // Connect points
  for (let x = 0; x < width - 1; x++) {
    const idx1 = x * step;
    const idx2 = (x + 1) * step;
    if (idx1 < data.length && idx2 < data.length) {
      const y1 = Math.floor(((data[idx1] ?? 0 - min) / range) * (height - 1));
      const y2 = Math.floor(((data[idx2] ?? 0 - min) / range) * (height - 1));
      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);
      for (let y = startY; y <= endY; y++) {
        const gridY = height - 1 - y;
        const row = grid[gridY];
        if (row && row[x] === ' ') {
          row[x] = '│';
        }
      }
    }
  }

  return (
    <Box flexDirection="column">
      {showAxis && (
        <Box>
          <Text dimColor>{max.toFixed(1).padStart(6)} ┤</Text>
        </Box>
      )}
      {grid.map((row, i) => (
        <Box key={i}>
          {showAxis && <Text dimColor>{'      │'}</Text>}
          <Text color={color as Parameters<typeof Text>[0]['color']}>
            {row.join('')}
          </Text>
        </Box>
      ))}
      {showAxis && (
        <>
          <Box>
            <Text dimColor>{min.toFixed(1).padStart(6)} ┤</Text>
          </Box>
          <Box>
            <Text dimColor>{'      └' + '─'.repeat(width)}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};

/**
 * Pie chart (ASCII)
 */
export interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  showLegend?: boolean;
  showPercentage?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  showLegend = true,
  showPercentage = true,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Build a simple horizontal representation
  const width = 30;
  const segments = data.map((d) => ({
    ...d,
    width: Math.round((d.value / total) * width),
    percentage: (d.value / total) * 100,
  }));

  return (
    <Box flexDirection="column">
      <Box>
        {segments.map((seg, i) => (
          <Text key={i} color={seg.color as Parameters<typeof Text>[0]['color']}>
            {'█'.repeat(seg.width)}
          </Text>
        ))}
      </Box>

      {showLegend && (
        <Box flexDirection="column" marginTop={1}>
          {segments.map((seg, i) => (
            <Box key={i}>
              <Text color={seg.color as Parameters<typeof Text>[0]['color']}>■ </Text>
              <Text>{seg.label}</Text>
              {showPercentage && (
                <Text dimColor> ({seg.percentage.toFixed(1)}%)</Text>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

/**
 * Gauge chart
 */
export interface GaugeChartProps {
  value: number;
  max?: number;
  width?: number;
  label?: string;
  thresholds?: Array<{ value: number; color: string }>;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max = 100,
  width = 20,
  label,
  thresholds = [
    { value: 33, color: 'green' },
    { value: 66, color: 'yellow' },
    { value: 100, color: 'red' },
  ],
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filledWidth = Math.round((percentage / 100) * width);

  // Determine color based on thresholds
  let color = 'green';
  for (const threshold of thresholds) {
    if (percentage <= threshold.value) {
      color = threshold.color;
      break;
    }
  }

  return (
    <Box flexDirection="column">
      {label && <Text bold>{label}</Text>}
      <Box>
        <Text>[</Text>
        <Text color={color as Parameters<typeof Text>[0]['color']}>
          {'█'.repeat(filledWidth)}
        </Text>
        <Text dimColor>
          {'░'.repeat(width - filledWidth)}
        </Text>
        <Text>]</Text>
        <Text> {percentage.toFixed(0)}%</Text>
      </Box>
    </Box>
  );
};

/**
 * Histogram
 */
export interface HistogramProps {
  data: number[];
  bins?: number;
  width?: number;
  color?: string;
}

export const Histogram: React.FC<HistogramProps> = ({
  data,
  bins = 10,
  width = 30,
  color = 'cyan',
}) => {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins || 1;

  // Count values in each bin
  const counts = Array(bins).fill(0);
  for (const value of data) {
    const binIndex = Math.min(bins - 1, Math.floor((value - min) / binWidth));
    counts[binIndex]++;
  }

  const maxCount = Math.max(...counts, 1);

  return (
    <Box flexDirection="column">
      {counts.map((count, i) => {
        const barWidth = Math.round((count / maxCount) * width);
        const binStart = (min + i * binWidth).toFixed(1);
        return (
          <Box key={i}>
            <Text dimColor>{binStart.padStart(6)} │</Text>
            <Text color={color as Parameters<typeof Text>[0]['color']}>
              {'█'.repeat(barWidth)}
            </Text>
            <Text dimColor> {count}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
