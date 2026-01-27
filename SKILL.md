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

| Command | Description |
|---------|-------------|
| `/init-memory` | Initialize project memory (run once per project) |
| `/execute TICKET-ID description` | Implement a feature with duplicate detection |
| `/memory-status` | Show all tracked features and their status |
| `/memory-search query` | Search features by keyword |

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
