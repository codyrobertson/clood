#!/usr/bin/env tsx
/**
 * Demo Script for Clood TUI (UOW-1312)
 *
 * A 5-minute interactive demo walkthrough of the Claude Code Dynamic Terminal UI.
 * Designed for:
 * - Live demonstrations
 * - Recorded demo videos
 * - User onboarding
 *
 * Usage:
 *   npx tsx scripts/demo.ts [options]
 *
 * Options:
 *   --auto           Run demo automatically without pauses
 *   --speed=<ms>     Delay between steps in auto mode (default: 2000)
 *   --skip-intro     Skip the introduction section
 *   --step=<n>       Start from a specific step number
 *
 * The demo generates synthetic events that showcase all major features
 * of the TUI, outputting them as JSONL that can be piped to the application.
 */

import * as readline from 'readline';

// =============================================================================
// Demo Configuration
// =============================================================================

interface DemoOptions {
  auto: boolean;
  speed: number;
  skipIntro: boolean;
  startStep: number;
}

interface DemoEvent {
  type: string;
  timestamp: string;
  [key: string]: unknown;
}

interface DemoStep {
  title: string;
  description: string;
  annotation: string;
  events: DemoEvent[];
  duration: number; // Estimated duration in seconds
}

// =============================================================================
// Parse Command Line Arguments
// =============================================================================

function parseArgs(argv: string[]): DemoOptions {
  const options: DemoOptions = {
    auto: false,
    speed: 2000,
    skipIntro: false,
    startStep: 1,
  };

  for (const arg of argv) {
    if (arg === '--auto') {
      options.auto = true;
    } else if (arg.startsWith('--speed=')) {
      options.speed = parseInt(arg.split('=')[1] || '2000', 10);
    } else if (arg === '--skip-intro') {
      options.skipIntro = true;
    } else if (arg.startsWith('--step=')) {
      options.startStep = parseInt(arg.split('=')[1] || '1', 10);
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return options;
}

function printUsage(): void {
  console.error(`
Clood TUI Demo Script - 5-Minute Feature Walkthrough

Usage:
  npx tsx scripts/demo.ts [options]
  npx tsx scripts/demo.ts | npx tsx src/index.tsx --session -

Options:
  --auto           Run demo automatically without pauses
  --speed=<ms>     Delay between steps in auto mode (default: 2000)
  --skip-intro     Skip the introduction section
  --step=<n>       Start from a specific step number
  -h, --help       Show this help message

Demo Steps:
  1. Introduction & Session Start (~30s)
  2. Basic Messaging (~45s)
  3. Streaming Responses (~45s)
  4. Task Management (~60s)
  5. Document Operations (~45s)
  6. Code Blocks & Syntax Highlighting (~45s)
  7. Notifications & Status (~30s)
  8. Session Summary & End (~30s)

Total Duration: ~5 minutes

Examples:
  # Interactive demo (press Enter to advance)
  npx tsx scripts/demo.ts

  # Automatic demo at normal speed
  npx tsx scripts/demo.ts --auto

  # Fast demo for testing
  npx tsx scripts/demo.ts --auto --speed=500

  # Start from step 4
  npx tsx scripts/demo.ts --step=4
`);
}

// =============================================================================
// Helper Functions
// =============================================================================

function timestamp(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emit(event: DemoEvent): void {
  console.log(JSON.stringify(event));
}

async function waitForKeypress(rl: readline.Interface): Promise<void> {
  return new Promise((resolve) => {
    rl.question('', () => resolve());
  });
}

function printAnnotation(step: DemoStep, stepNumber: number, totalSteps: number): void {
  const separator = '='.repeat(60);
  process.stderr.write('\n' + separator + '\n');
  process.stderr.write(`STEP ${stepNumber}/${totalSteps}: ${step.title}\n`);
  process.stderr.write(separator + '\n');
  process.stderr.write(`\n${step.description}\n\n`);
  process.stderr.write(`ANNOTATION: ${step.annotation}\n\n`);
  process.stderr.write(`Duration: ~${step.duration}s | Events: ${step.events.length}\n`);
  process.stderr.write(separator + '\n');
}

// =============================================================================
// Demo Steps Definition
// =============================================================================

function createDemoSteps(): DemoStep[] {
  return [
    // -------------------------------------------------------------------------
    // Step 1: Introduction & Session Start
    // -------------------------------------------------------------------------
    {
      title: 'Introduction & Session Start',
      description: 'Initialize a new Claude Code session. The TUI displays session information and prepares the interface.',
      annotation: 'Notice how the header shows the session ID and the status bar indicates the connection state.',
      duration: 30,
      events: [
        {
          type: 'session',
          action: 'start',
          sessionId: 'demo-session-001',
          timestamp: timestamp(),
          metadata: {
            version: '1.0.0',
            model: 'claude-3-opus',
            project: 'clood-tui-demo',
          },
        },
        {
          type: 'notify',
          level: 'info',
          message: 'Welcome to Clood TUI - Claude Code Dynamic Terminal UI',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'info',
          message: 'This demo showcases all major features in approximately 5 minutes.',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 2: Basic Messaging
    // -------------------------------------------------------------------------
    {
      title: 'Basic Messaging',
      description: 'Demonstrate the basic message exchange between user and assistant. Messages are displayed with role indicators and timestamps.',
      annotation: 'User messages appear on the right, assistant messages on the left. Each message shows its timestamp.',
      duration: 45,
      events: [
        {
          type: 'message',
          role: 'user',
          content: 'Hello! Can you help me understand how this TUI works?',
          timestamp: timestamp(),
        },
        {
          type: 'message',
          role: 'assistant',
          content: 'Of course! The Clood TUI (Terminal User Interface) provides an interactive way to work with Claude Code. Let me walk you through its features:\n\n1. **Message Panel**: Shows our conversation history\n2. **Task Panel**: Tracks ongoing operations\n3. **Document Panel**: Displays files being worked on\n4. **Status Bar**: Shows session information',
          timestamp: timestamp(),
        },
        {
          type: 'message',
          role: 'user',
          content: 'That sounds great! Can you show me some of these features in action?',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 3: Streaming Responses
    // -------------------------------------------------------------------------
    {
      title: 'Streaming Responses',
      description: 'Show how assistant responses stream in real-time, with text appearing progressively as it is generated.',
      annotation: 'Watch the text appear character by character, simulating real-time token streaming from the API.',
      duration: 45,
      events: [
        {
          type: 'stream',
          role: 'assistant',
          content: 'Let me demonstrate ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'streaming responses. ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'As I generate text, ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'you see it appear ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'in real-time. ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'This provides immediate feedback ',
          done: false,
          timestamp: timestamp(),
        },
        {
          type: 'stream',
          role: 'assistant',
          content: 'and makes the interaction feel more responsive.',
          done: true,
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 4: Task Management
    // -------------------------------------------------------------------------
    {
      title: 'Task Management',
      description: 'Demonstrate the task panel showing running operations, their status, and progress updates.',
      annotation: 'Tasks progress through states: pending -> running -> completed/failed. The panel updates in real-time.',
      duration: 60,
      events: [
        {
          type: 'message',
          role: 'assistant',
          content: 'Now let me show you task management. I\'ll run a few operations:',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-001',
          status: 'pending',
          command: 'npm install',
          description: 'Installing dependencies',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-001',
          status: 'running',
          command: 'npm install',
          description: 'Installing dependencies',
          progress: 0,
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-002',
          status: 'pending',
          command: 'npm run build',
          description: 'Building project',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-001',
          status: 'running',
          command: 'npm install',
          description: 'Installing dependencies',
          progress: 50,
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-001',
          status: 'completed',
          command: 'npm install',
          description: 'Dependencies installed successfully',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-002',
          status: 'running',
          command: 'npm run build',
          description: 'Building project',
          progress: 25,
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-003',
          status: 'pending',
          command: 'npm test',
          description: 'Running tests',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-002',
          status: 'running',
          command: 'npm run build',
          description: 'Compiling TypeScript',
          progress: 75,
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-002',
          status: 'completed',
          command: 'npm run build',
          description: 'Build completed successfully',
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-003',
          status: 'running',
          command: 'npm test',
          description: 'Running test suite',
          progress: 50,
          timestamp: timestamp(),
        },
        {
          type: 'task',
          id: 'task-003',
          status: 'completed',
          command: 'npm test',
          description: 'All 42 tests passed',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'success',
          message: 'All tasks completed successfully!',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 5: Document Operations
    // -------------------------------------------------------------------------
    {
      title: 'Document Operations',
      description: 'Show how the TUI displays document creation, modification, and viewing operations.',
      annotation: 'The document panel shows files being worked on with their status (created, modified, deleted).',
      duration: 45,
      events: [
        {
          type: 'message',
          role: 'assistant',
          content: 'Let me create and modify some files to demonstrate document tracking:',
          timestamp: timestamp(),
        },
        {
          type: 'document',
          action: 'create',
          path: 'src/components/Button.tsx',
          title: 'Button Component',
          language: 'typescript',
          timestamp: timestamp(),
        },
        {
          type: 'document',
          action: 'create',
          path: 'src/components/Input.tsx',
          title: 'Input Component',
          language: 'typescript',
          timestamp: timestamp(),
        },
        {
          type: 'document',
          action: 'modify',
          path: 'src/index.tsx',
          title: 'Main Entry Point',
          language: 'typescript',
          changes: '+15 -3',
          timestamp: timestamp(),
        },
        {
          type: 'document',
          action: 'view',
          path: 'package.json',
          title: 'Package Configuration',
          language: 'json',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'info',
          message: 'Created 2 files, modified 1 file',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 6: Code Blocks & Syntax Highlighting
    // -------------------------------------------------------------------------
    {
      title: 'Code Blocks & Syntax Highlighting',
      description: 'Demonstrate code block rendering with syntax highlighting for various programming languages.',
      annotation: 'Code blocks are rendered with language-specific syntax highlighting and line numbers.',
      duration: 45,
      events: [
        {
          type: 'message',
          role: 'assistant',
          content: 'Here\'s an example of code with syntax highlighting:\n\n```typescript\nimport React from \'react\';\n\ninterface ButtonProps {\n  label: string;\n  onClick: () => void;\n  variant?: \'primary\' | \'secondary\';\n}\n\nexport const Button: React.FC<ButtonProps> = ({\n  label,\n  onClick,\n  variant = \'primary\',\n}) => {\n  return (\n    <button\n      className={`btn btn-${variant}`}\n      onClick={onClick}\n    >\n      {label}\n    </button>\n  );\n};\n```\n\nThe TUI supports syntax highlighting for TypeScript, JavaScript, Python, and many other languages.',
          timestamp: timestamp(),
        },
        {
          type: 'message',
          role: 'user',
          content: 'Can you show me a Python example too?',
          timestamp: timestamp(),
        },
        {
          type: 'message',
          role: 'assistant',
          content: 'Of course! Here\'s a Python example:\n\n```python\nfrom dataclasses import dataclass\nfrom typing import Optional, List\n\n@dataclass\nclass Task:\n    id: str\n    title: str\n    status: str = "pending"\n    tags: Optional[List[str]] = None\n\n    def complete(self) -> None:\n        """Mark the task as completed."""\n        self.status = "completed"\n        print(f"Task {self.id} completed!")\n\n# Usage\ntask = Task(id="001", title="Demo task")\ntask.complete()\n```\n\nNotice how the syntax highlighting adapts to each language.',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 7: Notifications & Status
    // -------------------------------------------------------------------------
    {
      title: 'Notifications & Status',
      description: 'Show the notification system with different severity levels (info, success, warning, error).',
      annotation: 'Notifications appear in the status area with color-coded indicators based on severity.',
      duration: 30,
      events: [
        {
          type: 'message',
          role: 'assistant',
          content: 'Let me demonstrate the notification system:',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'info',
          message: 'This is an informational message',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'success',
          message: 'Operation completed successfully!',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'warning',
          message: 'This is a warning - please review',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'error',
          message: 'An error occurred (this is just a demo)',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'info',
          message: 'Notifications help you stay informed about system status',
          timestamp: timestamp(),
        },
      ],
    },

    // -------------------------------------------------------------------------
    // Step 8: Session Summary & End
    // -------------------------------------------------------------------------
    {
      title: 'Session Summary & End',
      description: 'Conclude the demo with a session summary showing statistics and cleanup.',
      annotation: 'The session end event triggers a summary display with statistics about the session.',
      duration: 30,
      events: [
        {
          type: 'message',
          role: 'assistant',
          content: 'That concludes our tour of Clood TUI! Here\'s a summary of what we covered:\n\n**Features Demonstrated:**\n- Session management\n- Message display (user/assistant)\n- Streaming responses\n- Task tracking\n- Document operations\n- Code syntax highlighting\n- Notification system\n\n**Session Statistics:**\n- Messages exchanged: 12\n- Tasks completed: 3\n- Documents affected: 4\n- Duration: ~5 minutes\n\nThank you for watching this demo!',
          timestamp: timestamp(),
        },
        {
          type: 'notify',
          level: 'success',
          message: 'Demo completed! Thank you for watching.',
          timestamp: timestamp(),
        },
        {
          type: 'session',
          action: 'end',
          sessionId: 'demo-session-001',
          timestamp: timestamp(),
          summary: {
            messageCount: 12,
            taskCount: 3,
            documentCount: 4,
            duration: '5m 0s',
          },
        },
      ],
    },
  ];
}

// =============================================================================
// Main Demo Runner
// =============================================================================

async function runDemo(options: DemoOptions): Promise<void> {
  const steps = createDemoSteps();
  const totalSteps = steps.length;

  // Setup readline for interactive mode
  let rl: readline.Interface | null = null;
  if (!options.auto) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
  }

  // Print intro unless skipped
  if (!options.skipIntro) {
    process.stderr.write('\n');
    process.stderr.write('╔══════════════════════════════════════════════════════════════╗\n');
    process.stderr.write('║                                                              ║\n');
    process.stderr.write('║   CLOOD TUI - 5-Minute Feature Demo                          ║\n');
    process.stderr.write('║   Claude Code Dynamic Terminal UI                            ║\n');
    process.stderr.write('║                                                              ║\n');
    process.stderr.write('╠══════════════════════════════════════════════════════════════╣\n');
    process.stderr.write('║                                                              ║\n');
    process.stderr.write('║   This demo will walk you through all major features:        ║\n');
    process.stderr.write('║   - Session management                                       ║\n');
    process.stderr.write('║   - Message display and streaming                            ║\n');
    process.stderr.write('║   - Task tracking                                            ║\n');
    process.stderr.write('║   - Document operations                                      ║\n');
    process.stderr.write('║   - Code syntax highlighting                                 ║\n');
    process.stderr.write('║   - Notification system                                      ║\n');
    process.stderr.write('║                                                              ║\n');
    process.stderr.write(`║   Mode: ${options.auto ? 'Automatic' : 'Interactive'}                                          ║\n`);
    process.stderr.write(`║   Steps: ${totalSteps}                                                    ║\n`);
    process.stderr.write('║                                                              ║\n');
    process.stderr.write('╚══════════════════════════════════════════════════════════════╝\n');
    process.stderr.write('\n');

    if (!options.auto) {
      process.stderr.write('Press ENTER to begin the demo...\n');
      await waitForKeypress(rl!);
    } else {
      await sleep(2000);
    }
  }

  // Run through each step
  for (let i = options.startStep - 1; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    const stepNumber = i + 1;

    // Print annotation to stderr (not captured in JSONL output)
    printAnnotation(step, stepNumber, totalSteps);

    if (!options.auto) {
      process.stderr.write('\nPress ENTER to run this step...\n');
      await waitForKeypress(rl!);
    }

    // Emit events for this step
    for (const event of step.events) {
      emit(event);

      // Add delay between events in auto mode
      if (options.auto) {
        await sleep(options.speed / step.events.length);
      } else {
        await sleep(100); // Small delay for visual effect
      }
    }

    // Wait before next step
    if (i < steps.length - 1) {
      if (options.auto) {
        await sleep(1000);
      } else {
        process.stderr.write('\nStep completed. Press ENTER for next step...\n');
        await waitForKeypress(rl!);
      }
    }
  }

  // Cleanup
  if (rl) {
    rl.close();
  }

  process.stderr.write('\n');
  process.stderr.write('╔══════════════════════════════════════════════════════════════╗\n');
  process.stderr.write('║                                                              ║\n');
  process.stderr.write('║   Demo Complete!                                             ║\n');
  process.stderr.write('║                                                              ║\n');
  process.stderr.write('║   Thank you for watching the Clood TUI demo.                 ║\n');
  process.stderr.write('║                                                              ║\n');
  process.stderr.write('║   To learn more:                                             ║\n');
  process.stderr.write('║   - README.md - Project overview                             ║\n');
  process.stderr.write('║   - docs/TROUBLESHOOTING.md - Common issues                  ║\n');
  process.stderr.write('║   - clood-tui --help - CLI options                           ║\n');
  process.stderr.write('║                                                              ║\n');
  process.stderr.write('╚══════════════════════════════════════════════════════════════╝\n');
  process.stderr.write('\n');
}

// =============================================================================
// Entry Point
// =============================================================================

const options = parseArgs(process.argv.slice(2));
runDemo(options).catch((error) => {
  process.stderr.write(`Demo error: ${error}\n`);
  process.exit(1);
});
