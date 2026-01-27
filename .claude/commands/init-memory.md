---
description: Initialize project memory for multi-developer ticket tracking. Run once per project.
---

# Initialize Project Memory

Set up project memory to enable feature tracking and duplicate detection.

## Workflow

### Step 1: Check Existing Memory

First, check if `.claude/memory/` already exists:

```bash
ls -la .claude/memory/ 2>/dev/null
```

If it exists and contains `features.json`:
- Ask the user: "Project memory already exists. Would you like to:
  1. Keep existing memory (recommended)
  2. Reset and start fresh (will lose all tracked features)"
- If reset: backup existing files first, then proceed
- If keep: exit with message "Memory preserved. Use /execute to implement features."

### Step 2: Analyze Project Structure

Read available project files to understand the codebase:

1. **Check for project config files** (read whichever exist):
   - `package.json` - Node.js projects
   - `pyproject.toml` or `setup.py` - Python projects
   - `Cargo.toml` - Rust projects
   - `go.mod` - Go projects
   - `pom.xml` or `build.gradle` - Java projects
   - `Gemfile` - Ruby projects

2. **Read README.md** if it exists for project purpose

3. **Scan directory structure**:
   ```bash
   find . -type d -name node_modules -prune -o -type d -name .git -prune -o -type d -name venv -prune -o -type d -print | head -50
   ```

### Step 3: Create project.md

Create `.claude/memory/project.md` with discovered information:

```markdown
# Project: {project_name}

## Purpose
{extracted from README or package description}

## Tech Stack
- Language: {detected}
- Framework: {detected}
- Key Dependencies: {list main deps}

## Directory Structure
```
{abbreviated tree}
```

## Conventions
- {any patterns discovered}

## Notes
- Initialized: {YYYY-MM-DD}
- Last analyzed: {YYYY-MM-DD}
```

### Step 4: Create features.json

Create `.claude/memory/features.json`:

```json
{
  "version": "1.0",
  "last_updated": "{ISO_TIMESTAMP}",
  "features": {}
}
```

### Step 5: Output Success Message

```
✅ Project memory initialized!

Created:
  .claude/memory/project.md   - Project context and structure
  .claude/memory/features.json - Feature tracking database

Next steps:
1. Review .claude/memory/project.md and add any missing context
2. Commit the memory files:
   git add .claude/memory/
   git commit -m "chore: initialize project memory"
3. Use /execute TICKET-ID description to implement features with tracking

All team members should pull this commit to share the same memory.
```

## Error Handling

- If `.claude/` directory doesn't exist, create it
- If project has no config files, ask user for project details
- If git is not initialized, warn but continue (memory will be local only)
