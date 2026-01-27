---
description: Execute a ticket/feature with automatic duplicate detection. Usage: /execute TICKET-ID description
argument-hint: <TICKET-ID> <feature description>
---

# Execute Feature with Duplicate Detection

Implement a ticket/feature while automatically checking for duplicates and tracking progress.

## Input Parsing

Parse the argument to extract:
- **Ticket ID**: Match patterns like `TICKET-XXX`, `JIRA-XXX`, `GH-XXX`, `#XXX`, or any `UPPERCASE-NUMBER` pattern
- **Description**: Everything after the ticket ID

Example inputs:
- `/execute TICKET-123 Add user authentication with OAuth`
- `/execute JIRA-456 Implement dashboard charts`
- `/execute #789 Fix login bug`
- `/execute PROJ-101 Create payment processing module`

## Keyword Extraction

From the description, extract 3-5 keywords:

1. Split into words and lowercase
2. Remove stop words: `a, an, the, and, or, but, in, on, at, to, for, of, with, by, from, as, is, was, are, were, been, be, have, has, had, do, does, did, will, would, could, should, may, might, must, shall, can, need, dare, ought, used, this, that, these, those, i, you, he, she, it, we, they, what, which, who, whom, whose, where, when, why, how, add, create, implement, make, build, update, fix`
3. Keep remaining technical terms (nouns, verbs)
4. Limit to 5 most significant words

## Execution Flow

### STEP 1: Load Memory

Read the features database:
```bash
cat .claude/memory/features.json
```

If file doesn't exist:
```
❌ Project memory not initialized.

Run /init-memory first to set up feature tracking.
```
Then STOP execution.

### STEP 2: Check Exact Ticket ID Match

Search `features.json` for the exact ticket ID.

**If found with status "implemented":**
```
⚠️ {TICKET-ID} was already implemented!

Summary: {summary}
Files: {comma-separated files}
Implemented by: {dev} on {date}

What would you like to do?
1. View the implementation details
2. Modify/extend this feature
3. This is a different ticket (proceed anyway)
```
Wait for user response before continuing.

**If found with status "in_progress":**
```
⚠️ {TICKET-ID} is currently in progress!

Started by: {dev} on {date}

Options:
1. Continue this work (take over)
2. Wait for {dev} to finish
3. This is a different task
```
Wait for user response before continuing.

### STEP 3: Check Similar Features (Fuzzy Match)

For each existing feature in `features.json`, calculate keyword similarity:

```
similarity = (count of matching keywords / count of new keywords) * 100
```

**If any feature has similarity >= 70%:**
```
🔍 Similar feature detected!

{EXISTING-TICKET-ID}: "{summary}"
Keywords: {keywords}
Files: {files}
Similarity: {X}%

Your request: "{new description}"
Your keywords: {new keywords}

Options:
1. Extend {EXISTING-TICKET-ID} instead (recommended if truly similar)
2. This is different, proceed as new feature
3. Show me the existing implementation first
```
Wait for user response before continuing.

### STEP 4: Mark as In Progress

Get developer name:
```bash
git config user.name 2>/dev/null || echo "unknown"
```

Update `features.json` to add the new feature as "in_progress":

```json
"{TICKET-ID}": {
  "summary": "{first 100 chars of description}",
  "keywords": ["{extracted}", "{keywords}"],
  "files": [],
  "status": "in_progress",
  "dev": "{developer name}",
  "date": "{YYYY-MM-DD}"
}
```

Write the updated JSON back to `.claude/memory/features.json`.

Output:
```
📝 Starting {TICKET-ID}: {description}

Marked as in_progress in project memory.
Proceeding with implementation...
```

### STEP 5: Implement the Feature

Now implement what the user requested. During implementation:

- **Track ALL files created**: Note the path of every new file
- **Track ALL files modified**: Note the path of every existing file you edit
- Keep a running list to update memory afterward

### STEP 6: Update Memory After Implementation

After implementation is complete, update the feature entry in `features.json`:

1. Add all files to the `"files"` array
2. Change `"status"` to `"implemented"`
3. Update `"last_updated"` timestamp at the root level

Write the updated JSON back to `.claude/memory/features.json`.

Output:
```
✅ {TICKET-ID} implemented!

Files created/modified:
- {file1} (new)
- {file2} (modified)
- {file3} (new)

Memory updated. Remember to commit:
git add .claude/memory/features.json
git commit -m "feat({TICKET-ID}): {summary}"
```

## Error Handling

- **No ticket ID found**: Ask user to provide in format `TICKET-XXX description`
- **No description**: Ask user what they want to implement
- **JSON parse error**: Warn user and offer to reset features.json
- **Write permission error**: Show error and manual instructions

## Example Session

**User:** `/execute TICKET-456 Add email notification system for order confirmations`

**Claude:**
1. Parses: ID=TICKET-456, desc="Add email notification system for order confirmations"
2. Keywords: ["email", "notification", "system", "order", "confirmations"]
3. Loads features.json - no exact match for TICKET-456
4. Checks similarity - finds TICKET-123 "User notification preferences" at 40% (below threshold)
5. Marks TICKET-456 as in_progress
6. Implements email notification system
7. Updates features.json with files: ["src/notifications/email.ts", "src/templates/order-confirmation.html"]
8. Outputs success message with commit instructions
