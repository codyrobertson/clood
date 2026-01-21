#!/usr/bin/env node
/**
 * Clood TUI - Claude Code Dynamic Terminal UI
 *
 * Main entry point for the terminal user interface.
 * This launches an Ink-based React application that provides
 * an interactive interface for Claude Code CLI interactions.
 */

import { render } from 'ink';
import { App } from './ui/App.js';
import { parseArgs } from './cli/args.js';

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // Render the main application
  const { waitUntilExit } = render(
    <App
      sessionPath={args.sessionPath}
      debug={args.debug}
    />
  );

  // Wait for the application to exit
  await waitUntilExit();
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
