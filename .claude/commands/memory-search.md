---
description: Search tracked features by keyword
argument-hint: <search query>
---

# Memory Search

Search through tracked features by keyword, ticket ID, or file path.

## Input

The search query can be:
- A ticket ID: `TICKET-123`
- A keyword: `authentication`
- Multiple words: `user login oauth`
- A file path: `src/auth`
- A developer name: `Jane`

## Workflow

### Step 1: Load Memory

Read the features database:
```bash
cat .claude/memory/features.json
```

If file doesn't exist:
```
❌ Project memory not initialized.

Run /init-memory to set up feature tracking.
```

### Step 2: Parse Search Query

Split the query into search terms (lowercase).

### Step 3: Search All Fields

For each feature, check if any search term matches:
- Ticket ID (case-insensitive partial match)
- Summary (case-insensitive partial match)
- Keywords (exact or partial match)
- File paths (partial match)
- Developer name (case-insensitive partial match)

Calculate a relevance score:
- Ticket ID match: +10 points
- Summary contains term: +5 points per term
- Keyword exact match: +3 points per keyword
- File path match: +2 points per file
- Developer name match: +1 point

### Step 4: Display Results

Sort by relevance score (highest first).

**If matches found:**
```
🔍 Search Results for "{query}"

Found {count} matching feature(s):

┌─────────────┬────────────────────────────────┬─────────────┬──────────┐
│ Ticket      │ Summary                        │ Status      │ Relevance│
├─────────────┼────────────────────────────────┼─────────────┼──────────┤
│ TICKET-123  │ User authentication with OAuth │ implemented │ ████████ │
│ TICKET-145  │ Login page redesign            │ implemented │ ███████  │
│ TICKET-167  │ Password reset flow            │ in_progress │ █████    │
└─────────────┴────────────────────────────────┴─────────────┴──────────┘

Details for top result:

TICKET-123: User authentication with OAuth
├── Status: implemented
├── Developer: Jane Doe
├── Date: 2025-01-20
├── Keywords: user, authentication, oauth, login, security
└── Files:
    ├── src/auth/oauth.ts
    ├── src/auth/middleware.ts
    └── src/auth/types.ts

Use /execute TICKET-XXX description to extend or modify a feature.
```

**If no matches:**
```
🔍 Search Results for "{query}"

No matching features found.

Suggestions:
- Try broader search terms
- Check spelling
- Use /memory-status to see all features

Or implement a new feature:
  /execute TICKET-XXX {query}
```

## Search Examples

| Query | Matches |
|-------|---------|
| `auth` | Features with "auth" in summary, keywords, or files |
| `TICKET-123` | Exact ticket match |
| `Jane` | Features implemented by Jane |
| `src/api` | Features that modified files in src/api/ |
| `payment stripe` | Features matching "payment" OR "stripe" |

## Error Handling

- Empty query: Show usage instructions
- JSON parse error: Offer to view raw file or reset
