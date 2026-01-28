# Project Memory for Claude Code

[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-blue)](https://claude.ai/claude-code)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A Claude Code skill that enables multi-developer ticket tracking with automatic duplicate detection. Prevents wasted effort by checking if features have already been implemented before starting new work.

## Architecture

For a detailed technical deep-dive, see [ARCHITECTURE.md](ARCHITECTURE.md).

```
┌─────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE SESSION                       │
│                                                              │
│  /execute ──┬── Keyword Extraction ── Duplicate Detection   │
│             │                                                │
│             ▼                                                │
│      ┌─────────────────┐         ┌─────────────────┐        │
│      │   Commands (4)  │ ◄─────► │  Memory Store   │        │
│      │  init, execute  │         │ features.json   │        │
│      │  status, search │         └────────┬────────┘        │
│      └─────────────────┘                  │                 │
│                                           │                 │
│      ┌─────────────────┐                  │                 │
│      │   Hooks (3)     │                  │                 │
│      │  session_start  │──────────────────┘                 │
│      │  queue, commit  │                                    │
│      └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    Git Sync     │
                    │  (Team Shared)  │
                    └─────────────────┘
```

## The Problem

In software development teams, especially those using AI coding assistants:

- **Duplicate Work**: Multiple developers accidentally implement the same feature
- **Lost Context**: No one remembers what was already built or where
- **File Hunting**: Searching for "where is the auth code?" wastes time
- **Ticket Confusion**: Similar tickets get implemented multiple times

## The Solution

Project Memory gives Claude Code a persistent memory of your project's implemented features:

```
You: /execute TICKET-456 Add user authentication

Claude: 🔍 Similar feature detected!

TICKET-123: "User authentication with OAuth"
Keywords: user, authentication, oauth, login
Files: src/auth/oauth.ts, src/auth/middleware.ts
Similarity: 85%

Options:
1. Extend TICKET-123 instead (recommended)
2. This is different, proceed as new
3. Show me the existing implementation first
```

## Quick Start

### Installation

1. **Copy the skill to your project:**

```bash
# Clone or download this repository
git clone https://github.com/AshokNaik009/project-memory-cc.git

# Copy the .claude directory to your project (includes skill, commands, hooks)
cp -r project-memory-cc/.claude your-project/
```

2. **Initialize project memory:**

```bash
cd your-project
# In Claude Code:
/init-memory
```

3. **Commit the memory files:**

```bash
git add .claude/
git commit -m "chore: add project memory skill"
git push
```

### Usage

**Implement a feature with tracking:**
```
/execute TICKET-123 Add user authentication with OAuth
```

**Check what's been implemented:**
```
/memory-status
```

**Search for existing features:**
```
/memory-search authentication
```

## Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/init-memory` | Initialize project memory (run once) | `/init-memory` |
| `/execute` | Implement feature with duplicate detection | `/execute TICKET-123 Add auth` |
| `/memory-status` | Show all tracked features | `/memory-status` |
| `/memory-search` | Search features by keyword | `/memory-search login` |

## How It Works

### 1. Keyword Extraction

When you run `/execute`, the skill extracts keywords from your description:

```
Input: "Add user authentication with OAuth and Google login"
Keywords: ["user", "authentication", "oauth", "google", "login"]
```

### 2. Similarity Matching

Keywords are compared against existing features:

```
similarity = matching_keywords / total_new_keywords × 100
```

If similarity ≥ 70%, you're alerted about potential duplicate work.

### 3. File Tracking

As features are implemented, files are tracked:

```json
{
  "TICKET-123": {
    "summary": "User authentication with OAuth",
    "keywords": ["user", "authentication", "oauth"],
    "files": ["src/auth/oauth.ts", "src/auth/middleware.ts"],
    "status": "implemented",
    "dev": "Jane Doe",
    "date": "2025-01-27"
  }
}
```

### 4. Git Sync

Memory is stored in `.claude/memory/features.json` and syncs via Git, so all developers share the same knowledge base.

## Data Structure

### features.json

```json
{
  "version": "1.0",
  "last_updated": "2025-01-27T10:30:00Z",
  "features": {
    "TICKET-ID": {
      "summary": "Brief description (max 100 chars)",
      "keywords": ["extracted", "keywords"],
      "files": ["src/file1.ts", "src/file2.ts"],
      "status": "implemented|in_progress",
      "dev": "Developer Name",
      "date": "YYYY-MM-DD"
    }
  }
}
```

### project.md

Created during `/init-memory`, contains:
- Project name and purpose
- Tech stack summary
- Directory structure
- Discovered conventions

## Multi-Developer Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer A                                                     │
│  1. /init-memory                                                │
│  2. git commit -m "Initialize project memory"                   │
│  3. git push                                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Developer B                                                     │
│  1. git pull                                                    │
│  2. /execute TICKET-123 Add user auth                           │
│  3. Claude implements feature                                   │
│  4. Memory updates with files                                   │
│  5. git commit && git push                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Developer C                                                     │
│  1. git pull                                                    │
│  2. /execute TICKET-456 User authentication system              │
│  3. Claude: "🔍 Similar feature detected! TICKET-123..."        │
│  4. Developer C decides to extend instead of duplicate          │
└─────────────────────────────────────────────────────────────────┘
```

## Session Start Hook

A Node.js hook runs at session start to load memory context:

```
Claude Code session started.
Project has 15 implemented features. In progress: TICKET-125.
Use /execute to implement features with duplicate detection.
```

## File Structure

```
your-project/
├── .claude/
│   ├── settings.json          # Hook configuration
│   ├── commands/
│   │   ├── init-memory.md     # /init-memory command
│   │   ├── execute.md         # /execute command
│   │   ├── memory-status.md   # /memory-status command
│   │   └── memory-search.md   # /memory-search command
│   ├── hooks/
│   │   └── session_start.js   # Session start hook (Node.js)
│   ├── memory/
│   │   ├── project.md         # Project context (generated)
│   │   └── features.json      # Feature database (generated)
│   └── skills/
│       └── project-memory/
│           └── SKILL.md       # Skill definition
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Ashok Naik** - [GitHub](https://github.com/AshokNaik009)

## Acknowledgments

- Inspired by the need for better AI coding assistant memory
- Built for the Claude Code community
