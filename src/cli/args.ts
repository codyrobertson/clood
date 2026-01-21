/**
 * CLI Arguments Parser
 *
 * Handles command-line argument parsing for the TUI application.
 */

export interface CliArgs {
  /** Path to the session JSONL log file */
  sessionPath?: string;
  /** Enable debug mode with verbose logging */
  debug: boolean;
  /** Show help message */
  help: boolean;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    sessionPath: undefined,
    debug: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--debug' || arg === '-d') {
      args.debug = true;
    } else if (arg === '--session' || arg === '-s') {
      args.sessionPath = argv[++i];
    } else if (arg?.startsWith('--session=')) {
      args.sessionPath = arg.split('=')[1];
    }
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  return args;
}

function printHelp(): void {
  console.log(`
Clood TUI - Claude Code Dynamic Terminal UI

Usage: clood-tui [options]

Options:
  -s, --session <path>  Path to session JSONL log file
  -d, --debug           Enable debug mode with verbose logging
  -h, --help            Show this help message

Examples:
  clood-tui
  clood-tui --session ~/.claude/projects/myproject/session.jsonl
  clood-tui --debug
`);
}
