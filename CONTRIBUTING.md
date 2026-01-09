# Contributing to Algora

Thank you for your interest in contributing to Algora! This document provides guidelines and information for contributors.

[한국어 문서 (Korean)](./CONTRIBUTING.ko.md)

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Documentation Requirements](#documentation-requirements)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Git
- Ollama (for local LLM testing)

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Algora.git
cd Algora

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Initialize database
pnpm db:init

# Start development
pnpm dev
```

---

## Development Workflow

### Branch Naming

Use descriptive branch names:

```
feature/agent-summoning
fix/websocket-reconnection
docs/architecture-update
refactor/budget-manager
```

### Development Commands

```bash
# Start all services in development mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linter
pnpm lint

# Type check
pnpm typecheck
```

---

## Coding Standards

### Language

- **Code**: TypeScript only
- **Comments**: English only
- **Variable names**: English, camelCase
- **Constants**: UPPER_SNAKE_CASE

### Style Guide

We use ESLint and Prettier for code formatting:

```bash
# Format code
pnpm format

# Check formatting
pnpm format:check
```

### TypeScript Guidelines

```typescript
// Use explicit types for function parameters and returns
function calculateBudget(usage: BudgetUsage): number {
  // ...
}

// Use interfaces for object shapes
interface AgentConfig {
  id: string;
  name: string;
  tier: 'tier1' | 'tier2';
}

// Use Zod for runtime validation
const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['tier1', 'tier2']),
});
```

### File Organization

```
src/
├── components/       # React components (PascalCase)
│   ├── AgentAvatar.tsx
│   └── AgentAvatar.test.tsx
├── hooks/            # React hooks (camelCase with use prefix)
│   └── useAgentState.ts
├── utils/            # Utility functions (camelCase)
│   └── formatDate.ts
├── types/            # Type definitions
│   └── agent.types.ts
└── constants/        # Constants (UPPER_CASE)
    └── AGENT_GROUPS.ts
```

---

## Documentation Requirements

### Required Documentation Updates

**IMPORTANT**: All documentation must be updated with every commit.

When making changes:

1. Update relevant `.md` files in English
2. Update corresponding `.ko.md` files in Korean
3. Update `CHANGELOG.md` if the change is user-facing

### Documentation Files

| File | Description |
|------|-------------|
| `README.md` / `README.ko.md` | Project overview |
| `ARCHITECTURE.md` / `ARCHITECTURE.ko.md` | System architecture |
| `CONTRIBUTING.md` / `CONTRIBUTING.ko.md` | Contribution guide |
| `ALGORA_PROJECT_SPEC.md` / `ALGORA_PROJECT_SPEC.ko.md` | Full specification |
| `CHANGELOG.md` | Version history |
| `CLAUDE.md` | AI assistant context |

### API Documentation

When adding/modifying API endpoints:

1. Update OpenAPI/Swagger documentation
2. Add JSDoc comments to handler functions
3. Include example requests/responses

```typescript
/**
 * Summon an agent to the current Agora session
 * @param sessionId - The ID of the Agora session
 * @param agentId - The ID of the agent to summon
 * @returns The updated session state
 */
async function summonAgent(sessionId: string, agentId: string): Promise<Session> {
  // ...
}
```

---

## Commit Guidelines

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples

```
feat(agents): add dynamic summoning for security issues

fix(budget): correct daily limit calculation

docs(readme): update installation instructions

refactor(agora): simplify session state management
```

### Commit Best Practices

1. Keep commits atomic (one logical change per commit)
2. Write clear, descriptive commit messages
3. Reference issue numbers when applicable (`fixes #123`)
4. Ensure all tests pass before committing

---

## Pull Request Process

### Before Submitting

1. [ ] Code follows the style guidelines
2. [ ] All tests pass (`pnpm test`)
3. [ ] Linting passes (`pnpm lint`)
4. [ ] Documentation is updated (including Korean translations)
5. [ ] `CHANGELOG.md` is updated (for user-facing changes)
6. [ ] Commit messages follow conventions

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested the changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Korean translations updated
```

### Review Process

1. Submit PR to `main` branch
2. Automated checks run (tests, linting, type checking)
3. At least one maintainer reviews the code
4. Address review feedback
5. PR is merged after approval

---

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Proposed solution (if any)
- Alternatives considered

### Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Documentation improvements
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: Urgent issues

---

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Search existing issues
3. Open a new issue with your question
4. Join our community discussions

---

**Thank you for contributing to Algora!**
