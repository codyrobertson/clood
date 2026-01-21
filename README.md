# Clood TUI - Claude Code Dynamic Terminal UI

A dynamic terminal user interface for Claude Code CLI interactions, built with [Ink](https://github.com/vadimdemedes/ink) (React for CLI) and [Zustand](https://github.com/pmndrs/zustand) for state management.

## Features

- **Real-time Conversation View**: Display live conversations with streaming support
- **Document Viewer**: View files, code, and documentation in a scrollable panel
- **Task Monitoring**: Track background tasks with live status updates
- **ASCII Diagram Support**: Properly render flowcharts and diagrams
- **Keyboard Navigation**: Vim-style keybindings for efficient navigation
- **Modular Architecture**: JSON event-driven design for extensibility

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Start the TUI
npm start

# Development mode with hot reload
npm run dev

# With a session file
npm start -- --session ~/.claude/projects/myproject/session.jsonl

# With debug mode
npm start -- --debug
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show help |
| `t` | Toggle tasks panel |
| `a` | Toggle auto-scroll |
| `↑/k` | Scroll up |
| `↓/j` | Scroll down |
| `PgUp/PgDn` | Page up/down |
| `g/G` | Go to top/bottom |
| `ESC` | Close modal/document |
| `Ctrl+Q` | Quit |

## Architecture

The TUI follows a unidirectional data flow architecture:

```
┌─────────────────┐
│   Event Stream  │
│    (JSONL)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   JSON Parser   │
│  + Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Reducers     │
│  (Pure Funcs)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   App State     │
│   (Zustand)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Ink Renderer   │
│  (React TUI)    │
└─────────────────┘
```

See [ADR-0001](docs/adr/ADR-0001-architecture.md) for detailed architecture documentation.

## Project Structure

```
src/
├── bin/           # CLI entry points
├── cli/           # CLI argument parsing
├── core/          # Core event handling logic
│   └── readers/   # JSONL input readers
├── store/         # State management (Zustand)
├── types/         # TypeScript type definitions
├── ui/
│   ├── components/  # Ink components
│   └── hooks/       # React hooks
└── utils/         # Utility functions

fixtures/          # Test fixtures (JSONL files)
scripts/           # Development scripts
docs/              # Documentation
```

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build
npm run build

# Demo with fixtures
npx tsx scripts/demo.ts fixtures/simple-chat.jsonl
```

## Testing

The project uses [Vitest](https://vitest.dev/) for testing. Test files are located next to their source files with a `.test.ts` or `.test.tsx` extension.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm run test:coverage
```

## Protocol

The TUI communicates via JSON Lines (JSONL) format. Supported event types:

- `message` - Conversation messages
- `stream` - Streaming content
- `task` - Background task updates
- `document` - Document viewing
- `notify` - Notifications
- `chart` - ASCII charts

See [PROTOCOL.md](docs/PROTOCOL.md) for the complete protocol specification.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT
