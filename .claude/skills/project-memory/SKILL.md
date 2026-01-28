---
name: project-memory
description: "Ticket-aware project memory for multi-developer teams. Tracks implemented features, detects duplicates before coding, maps features to files. Use when implementing tickets or checking existing work. Triggers: '/execute', '/init-memory', 'implement ticket', 'what features exist', 'has this been built'."
---

# Project Memory Skill

A Claude Code skill that enables multi-developer ticket tracking with automatic duplicate detection. Prevents wasted effort by checking if features have already been implemented before starting new work.

## Overview

Project Memory solves a common problem in software development: multiple developers accidentally implementing the same feature, or not knowing that similar functionality already exists in the codebase.

This skill:
- Tracks which features/tickets have been implemented
- Automatically detects duplicate or similar work before implementation
- Maps features to the files that implement them
- Syncs via Git so all developers share the same memory

## When to Use

This skill activates when you:
- Say `/execute TICKET-ID description` to implement a feature
- Say `/init-memory` to set up project memory
- Ask "what features exist" or "has this been built"
- Say "implement ticket" or reference ticket IDs
- Say `/memory-status` to see all tracked features
- Say `/memory-search query` to find specific features

## Core Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     /execute TICKET-123 Add user auth           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Parse Input                                            │
│  • Extract ticket ID: TICKET-123                                │
│  • Extract description: "Add user auth"                         │
│  • Generate keywords: ["user", "auth", "authentication"]        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Load Memory                                            │
│  • Read .claude/memory/features.json                            │
│  • If missing, prompt to run /init-memory                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Check Exact Match                                      │
│  • Search for TICKET-123 in features.json                       │
│  • If found: Show status and offer options                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Check Similar Features (Fuzzy Match)                   │
│  • Calculate keyword overlap with existing features             │
│  • If similarity >= 70%: Alert and offer options                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Implement Feature                                      │
│  • Mark as "in_progress" in features.json                       │
│  • Implement the requested feature                              │
│  • Track all files created/modified                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Update Memory                                          │
│  • Update status to "implemented"                               │
│  • Add file list to feature entry                               │
│  • Prompt to commit changes                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Memory Structure

### features.json

```json
{
  "version": "1.0",
  "last_updated": "2025-01-27T10:30:00Z",
  "features": {
    "TICKET-123": {
      "summary": "User authentication with OAuth",
      "keywords": ["user", "authentication", "oauth", "login"],
      "files": ["src/auth/oauth.ts", "src/auth/middleware.ts"],
      "status": "implemented",
      "dev": "John Doe",
      "date": "2025-01-27"
    }
  }
}
```

### project.md

Contains project context:
- Project name and purpose
- Tech stack summary
- Directory structure
- Key patterns/conventions

## Keyword Extraction Rules

When processing a feature description:

1. **Tokenize**: Split description into words
2. **Lowercase**: Convert all to lowercase
3. **Remove stop words**: Filter out common words (a, an, the, and, or, but, in, on, at, to, for, of, with, by, from, as, is, was, etc.)
4. **Keep technical terms**: Preserve nouns, verbs, and technical terminology
5. **Limit**: Keep 3-5 most significant keywords

### Stop Words List

```
a, an, the, and, or, but, in, on, at, to, for, of, with, by, from, as, is,
was, are, were, been, be, have, has, had, do, does, did, will, would, could,
should, may, might, must, shall, can, need, dare, ought, used, this, that,
these, those, i, you, he, she, it, we, they, what, which, who, whom, whose,
where, when, why, how, add, create, implement, make, build, update, fix
```

## Similarity Matching Algorithm

Calculate similarity between new feature keywords and existing feature keywords:

```
similarity = (matching_keywords / total_new_keywords) * 100
```

### Threshold: 70%

If similarity >= 70%, alert the user about potential duplicate work.

### Example

New feature: "Add user login with Google OAuth"
Keywords: ["user", "login", "google", "oauth"]

Existing feature: "User authentication with OAuth"
Keywords: ["user", "authentication", "oauth", "login"]

Matching: ["user", "login", "oauth"] = 3
Total new: 4

Similarity = 3/4 * 100 = 75% >= 70% threshold

Result: Alert user about similar feature

## Commands Reference

### `/init-memory`

Initialize project memory for a new project. Run once per repository.

**Usage:**
```
/init-memory
```

**Example Session:**
```
User: /init-memory

Claude: Initializing project memory...
✓ Created .claude/memory/features.json
✓ Created .claude/memory/project.md
✓ Analyzed project structure

Project memory initialized! You can now use:
- /execute TICKET-ID description - to implement features
- /memory-status - to see tracked features
- /memory-search query - to find features
```

---

### `/execute TICKET-ID description`

Implement a feature with automatic duplicate detection. Checks for existing similar work before starting.

**Usage:**
```
/execute TICKET-123 Add user authentication with OAuth
/execute BUG-456 Fix login redirect issue
/execute FEAT-789 Implement dark mode toggle
```

**Example Session (No Duplicates):**
```
User: /execute AUTH-101 Add password reset via email

Claude: Checking project memory...
✓ No exact match for AUTH-101
✓ No similar features found (0% overlap)

Proceeding with implementation...
[implements feature]

✓ Feature implemented
✓ Memory updated with AUTH-101
Files modified:
  - src/auth/password-reset.ts
  - src/email/templates/reset.html
  - tests/auth/password-reset.test.ts

Commit these changes? (y/n)
```

**Example Session (Duplicate Detected):**
```
User: /execute AUTH-202 User login with Google

Claude: Checking project memory...
⚠ Similar feature detected!

AUTH-101: "User authentication with OAuth"
├─ Status: implemented
├─ Files: src/auth/oauth.ts, src/auth/middleware.ts
├─ Developer: Jane Smith
├─ Date: 2025-01-15
└─ Similarity: 75% match

Keywords matching: ["user", "login", "oauth"]

Options:
1. View existing implementation
2. Extend existing feature
3. Proceed anyway (different scope)
4. Cancel

What would you like to do?
```

---

### `/memory-status`

Display all tracked features with their current status.

**Usage:**
```
/memory-status
```

**Example Session:**
```
User: /memory-status

Claude: Project Memory Status
═══════════════════════════════════════════════════════

 ✓ IMPLEMENTED (3)
 ─────────────────
 AUTH-101  User authentication with OAuth
           Files: src/auth/oauth.ts, src/auth/middleware.ts
           Dev: Jane Smith | 2025-01-15

 UI-205    Dashboard layout with responsive grid
           Files: src/components/Dashboard.tsx, src/styles/grid.css
           Dev: John Doe | 2025-01-20

 API-301   REST API rate limiting
           Files: src/middleware/rateLimit.ts, src/config/limits.ts
           Dev: Jane Smith | 2025-01-22

 ⏳ IN PROGRESS (1)
 ─────────────────
 FEAT-402  Real-time notifications
           Files: src/notifications/websocket.ts
           Dev: John Doe | Started: 2025-01-27

 ○ PLANNED (2)
 ─────────────────
 PERF-501  Database query optimization
 SEC-601   Two-factor authentication

═══════════════════════════════════════════════════════
Total: 6 features | 3 implemented | 1 in progress | 2 planned
```

---

### `/memory-search query`

Search tracked features by keyword or description.

**Usage:**
```
/memory-search auth
/memory-search "user login"
/memory-search dashboard
```

**Example Session:**
```
User: /memory-search auth

Claude: Search Results for "auth"
═══════════════════════════════════════════════════════

Found 2 matching features:

1. AUTH-101: User authentication with OAuth
   ├─ Status: ✓ implemented
   ├─ Keywords: user, authentication, oauth, login
   ├─ Files: src/auth/oauth.ts, src/auth/middleware.ts
   └─ Match reason: keyword "authentication"

2. SEC-601: Two-factor authentication
   ├─ Status: ○ planned
   ├─ Keywords: security, 2fa, authentication, totp
   ├─ Files: (none yet)
   └─ Match reason: keyword "authentication"

═══════════════════════════════════════════════════════
Use /execute TICKET-ID to view full details or extend a feature.
```

**Example Session (No Results):**
```
User: /memory-search payment

Claude: Search Results for "payment"
═══════════════════════════════════════════════════════

No features found matching "payment".

Suggestions:
- Check spelling or try related terms
- Use /memory-status to see all features
- This might be a new feature to implement

═══════════════════════════════════════════════════════
```

## Multi-Developer Workflow

1. **Developer A** runs `/init-memory` and commits
2. **Developer B** pulls and runs `/execute TICKET-123 Add user auth`
3. Memory detects no duplicates, marks as "in_progress"
4. **Developer B** implements feature, memory updates to "implemented"
5. **Developer B** commits features.json
6. **Developer C** pulls and runs `/execute TICKET-456 User authentication`
7. Memory detects 75% similarity with TICKET-123
8. **Developer C** sees warning and decides to extend or proceed differently

## Git Integration

Always commit memory files after changes:

```bash
git add .claude/memory/features.json
git commit -m "feat(TICKET-XXX): description"
git push
```

Pull before starting new work to get latest memory state.
