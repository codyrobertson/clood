# Contributing to Clood TUI

Thank you for your interest in contributing to the Claude Code Dynamic Terminal UI!

## Atomic Unit of Work (UOW) Rules

All contributions should follow the atomic UOW pattern:

1. **One clearly testable deliverable** - Each PR should address exactly one UOW
2. **Minimal scope** - No hidden dependencies or scope creep
3. **Verifiable output** - Must include code + tests/docs/config as needed
4. **Independent merge** - Can be merged without depending on other pending work

## Branch Naming Convention

```
<type>/<uow-id>-<short-description>

Examples:
  feat/uow-0405-chat-message-component
  fix/uow-0107-parser-tests
  docs/uow-0001-contributing
```

### Branch Types
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Build, CI, or tooling changes

## Pull Request Template

```markdown
## UOW Reference
UOW-XXXX: [Brief description]

## Changes
- [ ] Change 1
- [ ] Change 2

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add terminal screenshots or recordings]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] Documentation updated if needed
```

## Definition of Done (DoD)

A UOW is considered "done" when:

1. **Tests Pass**
   - All unit tests pass
   - All integration tests pass
   - Code coverage maintained or improved

2. **Lint Clean**
   - No ESLint errors
   - No Prettier formatting issues
   - No TypeScript errors

3. **Type Check**
   - `npm run build` completes without errors
   - No `any` types unless explicitly justified

4. **Documentation**
   - Code is self-documenting with clear names
   - Complex logic has comments
   - Public APIs have JSDoc

5. **Review**
   - Code reviewed by at least one maintainer
   - Feedback addressed

## Development Workflow

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd clood

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Making Changes

```bash
# Create a feature branch
git checkout -b feat/uow-XXXX-description

# Make changes, commit often
git add .
git commit -m "feat(uow-XXXX): description of change"

# Push and create PR
git push -u origin feat/uow-XXXX-description
```

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting, no code change
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```
feat(uow-0405): implement ChatMessage component with role styling
fix(uow-0107): handle invalid JSON lines gracefully
docs(uow-0001): add contributing guidelines
```

## Code Style

### TypeScript
- Use strict mode
- Prefer explicit types over inference for function parameters
- Use `interface` for object shapes, `type` for unions/aliases
- No `any` unless absolutely necessary (use `unknown` instead)

### React/Ink
- Functional components only
- Use hooks for state and effects
- Keep components small and focused
- Extract logic into custom hooks

### Testing
- Test file naming: `<file>.test.ts` or `<file>.test.tsx`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies

## Project Structure

```
src/
├── bin/           # CLI entry points
├── cli/           # CLI argument parsing
├── core/          # Core event handling logic
├── protocol/      # JSON protocol schemas
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

## Getting Help

- Check existing issues and PRs
- Read the BACKLOG.md for UOW details
- Review ADRs for architectural decisions
- Ask questions in discussions

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.
