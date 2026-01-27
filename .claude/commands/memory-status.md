---
description: Show all tracked features and their status
---

# Memory Status

Display all tracked features in the project memory.

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

### Step 2: Calculate Statistics

From the features object:
- Count total features
- Count features with `status: "implemented"`
- Count features with `status: "in_progress"`
- Sort by date (most recent first)

### Step 3: Display Status

Output format:
```
📊 Project Memory Status

Total Features: {total}
├── Implemented: {implemented_count}
└── In Progress: {in_progress_count}

Last Updated: {last_updated from root}

Recent Features (last 10):
┌─────────────┬────────────────────────────────┬─────────────┬────────────┬─────────────┐
│ Ticket      │ Summary                        │ Status      │ Developer  │ Date        │
├─────────────┼────────────────────────────────┼─────────────┼────────────┼─────────────┤
│ TICKET-125  │ Payment processing module      │ in_progress │ Jane Doe   │ 2025-01-27  │
│ TICKET-124  │ Dashboard analytics charts     │ implemented │ John Smith │ 2025-01-25  │
│ TICKET-123  │ User authentication with OAuth │ implemented │ Jane Doe   │ 2025-01-20  │
│ TICKET-122  │ API rate limiting middleware   │ implemented │ Bob Wilson │ 2025-01-18  │
└─────────────┴────────────────────────────────┴─────────────┴────────────┴─────────────┘
```

If more than 10 features exist:
```
... and {remaining} more features.

Use /memory-search <query> to find specific features.
```

### Step 4: Show In-Progress Alerts

If any features are in_progress:
```
⚠️ Features Currently In Progress:

TICKET-125 by Jane Doe (started 2025-01-27)
  "Payment processing module"

Consider coordinating before starting similar work.
```

## Empty State

If no features tracked yet:
```
📊 Project Memory Status

No features tracked yet.

Use /execute TICKET-ID description to implement and track your first feature.

Example:
  /execute TICKET-001 Add user authentication
```

## Error Handling

- JSON parse error: Offer to view raw file or reset
- Permission error: Show file path for manual inspection
