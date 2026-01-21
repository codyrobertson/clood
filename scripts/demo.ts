#!/usr/bin/env tsx
/**
 * Demo Harness Script
 *
 * Replays a fixture JSONL file into the TUI for demonstration and testing.
 * Supports different timing modes: step, realtime, accelerated.
 *
 * Usage:
 *   npx tsx scripts/demo.ts [options] <fixture.jsonl>
 *
 * Options:
 *   --mode=step|realtime|accelerated  Timing mode (default: realtime)
 *   --speed=<multiplier>              Speed multiplier for accelerated mode (default: 2)
 *   --delay=<ms>                      Delay between events in step mode (default: 500)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

interface DemoOptions {
  mode: 'step' | 'realtime' | 'accelerated';
  speed: number;
  delay: number;
  fixturePath: string;
}

function parseArgs(argv: string[]): DemoOptions {
  const options: DemoOptions = {
    mode: 'realtime',
    speed: 2,
    delay: 500,
    fixturePath: '',
  };

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as 'step' | 'realtime' | 'accelerated';
      if (['step', 'realtime', 'accelerated'].includes(mode)) {
        options.mode = mode;
      }
    } else if (arg.startsWith('--speed=')) {
      options.speed = parseFloat(arg.split('=')[1] || '2');
    } else if (arg.startsWith('--delay=')) {
      options.delay = parseInt(arg.split('=')[1] || '500', 10);
    } else if (!arg.startsWith('--')) {
      options.fixturePath = arg;
    }
  }

  return options;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function replayFixture(options: DemoOptions): Promise<void> {
  const { mode, speed, delay, fixturePath } = options;

  if (!fixturePath) {
    console.error('Usage: npx tsx scripts/demo.ts [options] <fixture.jsonl>');
    console.error('');
    console.error('Options:');
    console.error('  --mode=step|realtime|accelerated  Timing mode (default: realtime)');
    console.error('  --speed=<multiplier>              Speed multiplier (default: 2)');
    console.error('  --delay=<ms>                      Delay in step mode (default: 500)');
    process.exit(1);
  }

  const absolutePath = path.resolve(fixturePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Fixture file not found: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  console.log(`Demo Harness - Replaying ${lines.length} events from ${fixturePath}`);
  console.log(`Mode: ${mode}, Speed: ${speed}x, Delay: ${delay}ms`);
  console.log('---');

  let lastTimestamp: Date | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    try {
      const event = JSON.parse(line);

      // Calculate delay based on mode
      let eventDelay = 0;

      if (mode === 'step') {
        eventDelay = delay;
      } else if (mode === 'realtime' || mode === 'accelerated') {
        if (event.timestamp && lastTimestamp) {
          const currentTime = new Date(event.timestamp);
          const timeDiff = currentTime.getTime() - lastTimestamp.getTime();
          eventDelay = mode === 'accelerated' ? timeDiff / speed : timeDiff;
        } else {
          eventDelay = mode === 'accelerated' ? 100 / speed : 100;
        }
        if (event.timestamp) {
          lastTimestamp = new Date(event.timestamp);
        }
      }

      // Wait before emitting
      if (eventDelay > 0 && i > 0) {
        await sleep(eventDelay);
      }

      // Emit the event to stdout (for piping to the TUI)
      console.log(line);

      // Also log a summary to stderr for visibility
      const summary = getEventSummary(event);
      process.stderr.write(`[${i + 1}/${lines.length}] ${summary}\n`);
    } catch {
      process.stderr.write(`[${i + 1}/${lines.length}] Invalid JSON, skipping\n`);
    }
  }

  console.log('---');
  console.log('Demo complete!');
}

function getEventSummary(event: Record<string, unknown>): string {
  switch (event.type) {
    case 'message':
      return `message (${event.role}): ${(event.content as string)?.slice(0, 40)}...`;
    case 'stream':
      return `stream: ${(event.content as string)?.slice(0, 30)}... (done: ${event.done})`;
    case 'task':
      return `task [${event.id}]: ${event.status} - ${event.command || event.description}`;
    case 'document':
      return `document: ${event.action} ${event.path || event.title}`;
    case 'notify':
      return `notify (${event.level}): ${event.message}`;
    case 'session':
      return `session: ${event.action} (${event.sessionId})`;
    case 'chart':
      return `chart: ${event.chartType} - ${event.title}`;
    default:
      return `${event.type}: ${JSON.stringify(event).slice(0, 50)}...`;
  }
}

// Main
const options = parseArgs(process.argv.slice(2));
replayFixture(options).catch(console.error);
