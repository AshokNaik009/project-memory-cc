# Project Memory Architecture

**Audience:** System Architects
**Version:** 1.0
**Last Updated:** 2025-01-28

---

## Executive Summary

Project Memory is a distributed knowledge management system for AI-assisted development that provides feature tracking and duplicate detection across development teams. It leverages Git as a synchronization layer, eliminating the need for dedicated infrastructure while maintaining eventual consistency across distributed nodes (developers).

---

## System Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM BOUNDARY                                     │
│                                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐           │
│  │   Developer A   │     │   Developer B   │     │   Developer N   │           │
│  │  Claude Code    │     │  Claude Code    │     │  Claude Code    │           │
│  │    Instance     │     │    Instance     │     │    Instance     │           │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘           │
│           │                       │                       │                     │
│           └───────────────────────┼───────────────────────┘                     │
│                                   │                                             │
│                                   ▼                                             │
│                    ┌──────────────────────────────┐                             │
│                    │    LOCAL MEMORY STORE        │                             │
│                    │  .claude/memory/features.json │                             │
│                    └──────────────┬───────────────┘                             │
│                                   │                                             │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Git Repository    │
                         │  (Sync Transport)   │
                         │                     │
                         │  - GitHub/GitLab    │
                         │  - Self-hosted      │
                         │  - Local network    │
                         └─────────────────────┘
```

### External Dependencies

| Dependency | Type | Purpose | Failure Impact |
|------------|------|---------|----------------|
| Git | Required | State synchronization | Local-only operation |
| Node.js | Required | Hook execution runtime | Hooks disabled |
| Claude Code CLI | Required | Host environment | System inoperable |
| Remote Git Host | Optional | Team sync | Local-only operation |

---

## Architectural Decisions

### ADR-001: Git as Synchronization Layer

**Context:** Team collaboration requires shared state without dedicated infrastructure.

**Decision:** Use Git as the transport and conflict resolution mechanism for memory state.

**Rationale:**
- Zero additional infrastructure required
- Built-in conflict resolution (merge strategies)
- Audit trail via commit history
- Works offline with eventual sync
- Leverages existing developer workflows

**Trade-offs:**
- (+) No server maintenance
- (+) Works with any Git hosting
- (-) Eventual consistency only
- (-) Merge conflicts possible on concurrent edits
- (-) No real-time updates

**Alternatives Considered:**
- Dedicated database service (rejected: infrastructure overhead)
- Peer-to-peer sync (rejected: complexity, NAT traversal)
- Cloud storage (rejected: additional dependency)

---

### ADR-002: JSON File-Based Storage

**Context:** Need human-readable, version-controllable data format.

**Decision:** Store all memory state in JSON files within `.claude/memory/`.

**Rationale:**
- Human-readable and editable
- Git diff-friendly for code review
- No database setup or migration
- Direct file access for debugging

**Trade-offs:**
- (+) Simple implementation
- (+) Portable across environments
- (-) No indexing (O(n) search)
- (-) Concurrent write hazards
- (-) File size limits practical ceiling

**Scalability Bounds:**
- Recommended: < 1,000 features
- Tested: Up to 5,000 features
- Degradation: Linear search becomes noticeable at 10,000+ features

---

### ADR-003: Event-Driven Hook Architecture

**Context:** Need automatic memory management without manual intervention.

**Decision:** Use Claude Code's hook system for lifecycle event handling.

**Rationale:**
- Automatic execution at defined lifecycle points
- Non-blocking to primary workflow
- Graceful degradation on failure

**Trade-offs:**
- (+) Zero manual memory management
- (+) Consistent behavior
- (-) Dependent on Claude Code hook support
- (-) Limited error visibility

---

## Component Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                     │
│                                                                                  │
│    /execute          /memory-status       /memory-search       /init-memory     │
│    (Skill)           (Skill)              (Skill)              (Skill)          │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           BUSINESS LOGIC LAYER                                   │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Duplicate     │  │    Feature      │  │    Keyword      │                  │
│  │   Detection     │  │    Tracker      │  │    Extractor    │                  │
│  │   Engine        │  │                 │  │                 │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           DATA ACCESS LAYER                                      │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │   Memory        │  │   File Queue    │  │   Git           │                  │
│  │   Repository    │  │   Manager       │  │   Operations    │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                           PERSISTENCE LAYER                                      │
│                                                                                  │
│    features.json         claude-files-queue.json         .git/                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1. Duplicate Detection Engine

**Responsibility:** Identify potentially duplicate features before implementation.

**Algorithm Complexity:**
- Time: O(n × m) where n = existing features, m = keywords per feature
- Space: O(k) where k = keywords in new feature

**Detection Pipeline:**

```
Input: Feature Description
         │
         ▼
┌─────────────────────────────────────┐
│ TOKENIZATION                        │
│ • Split on whitespace/punctuation   │
│ • Lowercase normalization           │
│ • Time: O(d) where d = description  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ STOP WORD REMOVAL                   │
│ • Static dictionary (50 words)      │
│ • Hash lookup: O(1) per word        │
│ • Total: O(w) where w = word count  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ SIMILARITY MATCHING                 │
│ • Jaccard-like coefficient          │
│ • Formula: |A ∩ B| / |A|            │
│ • Threshold: 70% (configurable)     │
└─────────────────────────────────────┘
         │
         ▼
Output: Similarity Score + Matches
```

**Stop Words Dictionary:**
```javascript
const STOP_WORDS = new Set([
  'add', 'create', 'implement', 'build', 'make', 'update', 'fix',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
  'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'shall', 'can', 'need', 'into', 'through', 'during'
]);
```

#### 2. Hook Subsystem

**Hook Execution Model:**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          HOOK EXECUTION TIMELINE                                 │
│                                                                                  │
│  Session Start          File Operations           Session End                   │
│       │                       │                        │                        │
│       ▼                       ▼                        ▼                        │
│  ┌─────────┐            ┌─────────┐              ┌─────────┐                    │
│  │ SYNC    │            │ ASYNC   │              │ SYNC    │                    │
│  │ Blocking│            │ Non-blk │              │ Blocking│                    │
│  └────┬────┘            └────┬────┘              └────┬────┘                    │
│       │                      │                        │                         │
│       ▼                      ▼                        ▼                         │
│  session_start.js    queue-claude-files.js    commit-claude-files.js           │
│                                                                                  │
│  Outputs:                Outputs:                   Outputs:                    │
│  • Feature summary       • Queued file path        • Git commit                 │
│  • Context hints         (to queue file)           • Queue cleared              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Hook Specifications:**

| Hook | Trigger | Execution | Timeout | Failure Mode |
|------|---------|-----------|---------|--------------|
| `session_start.js` | PreSession | Synchronous | 5s | Skip, log warning |
| `queue-claude-files.js` | PostTool (Edit/Write) | Async | 2s | Silent fail |
| `commit-claude-files.js` | PostSession | Synchronous | 30s | Log error, preserve queue |

#### 3. Memory Repository

**Data Schema (features.json):**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "features"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "last_updated": {
      "type": "string",
      "format": "date-time"
    },
    "features": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/feature"
      }
    }
  },
  "definitions": {
    "feature": {
      "type": "object",
      "required": ["summary", "keywords", "status", "date"],
      "properties": {
        "summary": {
          "type": "string",
          "maxLength": 100
        },
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1,
          "maxItems": 10
        },
        "files": {
          "type": "array",
          "items": { "type": "string" }
        },
        "status": {
          "enum": ["in_progress", "implemented"]
        },
        "dev": { "type": "string" },
        "date": {
          "type": "string",
          "format": "date"
        }
      }
    }
  }
}
```

---

## Data Flow Architecture

### State Transitions

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FEATURE STATE MACHINE                                    │
│                                                                                  │
│                                                                                  │
│     ┌──────────────┐                                                            │
│     │              │                                                            │
│     │  (created)   │                                                            │
│     │              │                                                            │
│     └──────┬───────┘                                                            │
│            │ /execute starts                                                    │
│            ▼                                                                    │
│     ┌──────────────┐         implementation         ┌──────────────┐           │
│     │              │            fails               │              │           │
│     │ in_progress  │◄───────────────────────────────│  (deleted)   │           │
│     │              │                                │              │           │
│     └──────┬───────┘                                └──────────────┘           │
│            │ implementation                                 ▲                   │
│            │ completes                                      │                   │
│            ▼                                                │                   │
│     ┌──────────────┐         manual                        │                   │
│     │              │         removal                       │                   │
│     │ implemented  │───────────────────────────────────────┘                   │
│     │              │                                                            │
│     └──────────────┘                                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Concurrency Model

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    CONCURRENT ACCESS HANDLING                                    │
│                                                                                  │
│   Developer A                    Git                     Developer B            │
│       │                           │                           │                 │
│       │  1. git pull              │                           │                 │
│       │──────────────────────────►│                           │                 │
│       │                           │     1. git pull           │                 │
│       │                           │◄──────────────────────────│                 │
│       │                           │                           │                 │
│       │  2. Edit features.json    │                           │                 │
│       │  (Add TICKET-101)         │                           │                 │
│       │                           │     2. Edit features.json │                 │
│       │                           │        (Add TICKET-102)   │                 │
│       │                           │                           │                 │
│       │  3. git push              │                           │                 │
│       │──────────────────────────►│                           │                 │
│       │                           │                           │                 │
│       │                           │     3. git push (REJECTED)│                 │
│       │                           │◄ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│                 │
│       │                           │                           │                 │
│       │                           │     4. git pull --rebase  │                 │
│       │                           │◄──────────────────────────│                 │
│       │                           │                           │                 │
│       │                           │     5. Resolve conflicts  │                 │
│       │                           │        (JSON merge)       │                 │
│       │                           │                           │                 │
│       │                           │     6. git push           │                 │
│       │                           │◄──────────────────────────│                 │
│                                                                                  │
│   RESULT: Both TICKET-101 and TICKET-102 in features.json                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Conflict Resolution Strategy:**
- JSON structure enables line-based merging
- Each feature is a separate key (minimizes conflicts)
- Same-key edits require manual resolution
- Recommendation: Pull before starting new tickets

---

## Security Considerations

### Threat Model

| Threat | Vector | Mitigation | Risk Level |
|--------|--------|------------|------------|
| Data Tampering | Git history modification | Signed commits (optional) | Medium |
| Information Disclosure | Sensitive data in features.json | Code review, .gitignore patterns | Low |
| Denial of Service | Malformed JSON | Schema validation, graceful degradation | Low |
| Code Injection | Malicious hook scripts | Hook sandboxing (Claude Code native) | Low |

### Data Classification

| Data Element | Classification | Storage | Retention |
|--------------|----------------|---------|-----------|
| Feature summaries | Internal | features.json | Indefinite |
| File paths | Internal | features.json | Indefinite |
| Developer names | PII (low sensitivity) | features.json | Indefinite |
| Implementation details | Potentially sensitive | Not stored | N/A |

### Recommendations

1. **Do not store** credentials, API keys, or secrets in feature descriptions
2. **Review** features.json during code review for accidental disclosure
3. **Consider** excluding `.claude/memory/` from public repositories if features contain sensitive project details

---

## Performance Characteristics

### Complexity Analysis

| Operation | Time Complexity | Space Complexity | Typical Latency |
|-----------|-----------------|------------------|-----------------|
| Load memory | O(f) | O(f × k) | < 50ms |
| Duplicate check | O(f × k) | O(k) | < 100ms |
| Add feature | O(1) | O(k) | < 10ms |
| Search features | O(f × k) | O(r) | < 100ms |
| Save memory | O(f) | O(f × k) | < 50ms |

Where: f = feature count, k = avg keywords/feature, r = result count

### Scalability Limits

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PERFORMANCE ENVELOPE                                     │
│                                                                                  │
│  Response Time (ms)                                                             │
│        │                                                                        │
│   1000 ┤                                              ╭────── Degraded          │
│        │                                         ╭────╯                         │
│    500 ┤                                    ╭────╯                              │
│        │                               ╭────╯                                   │
│    200 ┤                          ╭────╯                                        │
│        │                     ╭────╯                                             │
│    100 ┤ ────────────────────╯        ◄─── Optimal operating range             │
│        │                                                                        │
│     50 ┤                                                                        │
│        │                                                                        │
│      0 ┼────────┬────────┬────────┬────────┬────────┬────────┬────────         │
│        0      1000    2000    3000    5000    7500   10000   Features          │
│                                                                                  │
│  RECOMMENDED: Keep feature count under 2,000 for optimal performance            │
│  MAXIMUM: System tested up to 10,000 features                                   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Optimization Opportunities (Future)

1. **Indexing:** Build keyword index for O(1) lookup
2. **Caching:** LRU cache for frequently accessed features
3. **Sharding:** Split features.json by date/category for large projects
4. **Compression:** gzip for features.json > 1MB

---

## Failure Modes & Recovery

### Failure Scenarios

| Scenario | Detection | Impact | Recovery |
|----------|-----------|--------|----------|
| Corrupted features.json | JSON parse error | Memory unavailable | Restore from git history |
| Missing .claude directory | Directory check | Fresh state | Run /init-memory |
| Hook execution failure | Exit code != 0 | Feature not tracked | Manual memory update |
| Git sync conflict | Merge conflict markers | Stale data | Manual merge resolution |
| Disk full | Write failure | Memory not persisted | Free space, retry |

### Recovery Procedures

**Corrupted Memory File:**
```bash
# View history
git log --oneline .claude/memory/features.json

# Restore from specific commit
git checkout <commit-hash> -- .claude/memory/features.json

# Or restore from N commits ago
git checkout HEAD~1 -- .claude/memory/features.json
```

**Rebuild from Scratch:**
```bash
# Backup current state (if partially valid)
cp .claude/memory/features.json features.backup.json

# Reinitialize
rm .claude/memory/features.json
# Run /init-memory in Claude Code
```

---

## Monitoring & Observability

### Health Indicators

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| features.json size | < 500KB | 500KB - 2MB | > 2MB |
| Feature count | < 1000 | 1000 - 5000 | > 5000 |
| Hook execution time | < 1s | 1s - 5s | > 5s |
| Duplicate detection rate | > 0% | N/A | 100% (all blocked) |

### Diagnostic Commands

```bash
# Check memory file integrity
cat .claude/memory/features.json | jq . > /dev/null && echo "Valid JSON"

# Count features
cat .claude/memory/features.json | jq '.features | length'

# Find largest features (by file count)
cat .claude/memory/features.json | jq '.features | to_entries | sort_by(.value.files | length) | reverse | .[0:5]'

# Check for orphaned in_progress features
cat .claude/memory/features.json | jq '.features | to_entries | map(select(.value.status == "in_progress"))'
```

---

## Integration Points

### Extension Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EXTENSION POINTS                                        │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     Custom Skills (Commands)                             │    │
│  │                                                                          │    │
│  │   .claude/commands/my-custom-command.md                                 │    │
│  │   • Read features.json                                                  │    │
│  │   • Call duplicate detection                                            │    │
│  │   • Extend with custom logic                                            │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     Custom Hooks                                         │    │
│  │                                                                          │    │
│  │   .claude/hooks/my-custom-hook.js                                       │    │
│  │   • Trigger: PostToolResult, PreSession, PostSession                    │    │
│  │   • Access: stdin (tool result), environment variables                  │    │
│  │   • Output: stdout (user message), exit code                            │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                     External Integrations                                │    │
│  │                                                                          │    │
│  │   • CI/CD: Read features.json for release notes generation              │    │
│  │   • Jira/Linear: Sync ticket IDs with issue trackers                    │    │
│  │   • Dashboards: Parse features.json for team metrics                    │    │
│  │                                                                          │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### API Contract (for External Integrations)

**Reading Features:**
```javascript
// features.json is the contract
const memory = JSON.parse(fs.readFileSync('.claude/memory/features.json'));

// Iterate features
for (const [ticketId, feature] of Object.entries(memory.features)) {
  console.log(`${ticketId}: ${feature.summary} (${feature.status})`);
}
```

**Modifying Features (caution):**
```javascript
// Ensure atomic writes
const tempFile = '.claude/memory/features.json.tmp';
fs.writeFileSync(tempFile, JSON.stringify(memory, null, 2));
fs.renameSync(tempFile, '.claude/memory/features.json');
```

---

## File System Layout

```
.claude/
├── settings.json                    # Claude Code configuration
│                                    # Defines hook triggers and paths
│
├── commands/                        # Skill definitions (Markdown)
│   ├── init-memory.md              # POST: Initialize memory database
│   ├── execute.md                  # POST: Feature impl with detection
│   ├── memory-status.md            # GET: List all features
│   └── memory-search.md            # GET: Search features by keyword
│
├── hooks/                           # Event handlers (JavaScript)
│   ├── session_start.js            # Trigger: PreSession
│   │                               # Loads and summarizes memory state
│   │
│   ├── queue-claude-files.js       # Trigger: PostToolResult (Edit/Write)
│   │                               # Appends modified files to queue
│   │
│   └── commit-claude-files.js      # Trigger: PostSession
│                                   # Commits queued files to git
│
├── memory/                          # Persistent data store
│   ├── features.json               # PRIMARY: Feature database
│   │                               # Schema: See Data Schema section
│   │
│   └── project.md                  # OPTIONAL: Project context/conventions
│
└── skills/
    └── project-memory/
        └── SKILL.md                 # Skill manifest and documentation
```

---

## Design Patterns Summary

| Pattern | Implementation | Rationale |
|---------|----------------|-----------|
| **Event Sourcing** | Git commit history | Complete audit trail of all changes |
| **CQRS (light)** | Commands vs Status/Search | Separate write (execute) from read (status/search) |
| **Saga** | Session lifecycle hooks | Coordinate multi-step file tracking and commit |
| **Repository** | features.json abstraction | Decouple storage from business logic |
| **Circuit Breaker** | Graceful degradation | Continue if memory unavailable |
| **Optimistic Locking** | Git merge conflicts | Handle concurrent modifications |

---

## Developer Workflow Example

This section demonstrates a typical developer workflow using Project Memory.

### Scenario: Developer Joins Team and Implements Features

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER WORKFLOW                                       │
│                                                                                  │
│  Day 1: Setup                                                                   │
│  ─────────────                                                                  │
│                                                                                  │
│  $ cd my-project                                                                │
│  $ claude                                                                       │
│                                                                                  │
│  You: /init-memory                                                              │
│                                                                                  │
│  Claude: ✓ Project memory initialized                                           │
│          Created .claude/memory/features.json                                   │
│                                                                                  │
│                                                                                  │
│  Day 2: Implementing a Feature                                                  │
│  ─────────────────────────────                                                  │
│                                                                                  │
│  You: /execute TICKET-101 Add user authentication with JWT tokens               │
│                                                                                  │
│  Claude: Checking for existing implementations...                               │
│          ✓ No duplicates found                                                  │
│                                                                                  │
│          Starting implementation of TICKET-101:                                 │
│          "Add user authentication with JWT tokens"                              │
│                                                                                  │
│          [Claude implements the feature, creates/edits files]                   │
│                                                                                  │
│          ✓ Feature TICKET-101 tracked in memory                                 │
│          Files: src/auth/jwt.js, src/middleware/auth.js, tests/auth.test.js     │
│                                                                                  │
│                                                                                  │
│  Day 3: Duplicate Detection in Action                                           │
│  ────────────────────────────────────                                           │
│                                                                                  │
│  You: /execute TICKET-205 Implement JWT authentication for API                  │
│                                                                                  │
│  Claude: ⚠️  POTENTIAL DUPLICATE DETECTED                                        │
│                                                                                  │
│          Your request: "Implement JWT authentication for API"                   │
│          Similar to: TICKET-101 "Add user authentication with JWT tokens"       │
│          Match: 85% keyword overlap (jwt, authentication)                       │
│          Status: implemented                                                    │
│          Files: src/auth/jwt.js, src/middleware/auth.js                         │
│                                                                                  │
│          Options:                                                               │
│          1. Review existing implementation in src/auth/jwt.js                   │
│          2. Proceed anyway (if this is intentionally different)                 │
│          3. Extend existing feature instead                                     │
│                                                                                  │
│  You: Let me review that first                                                  │
│                                                                                  │
│  Claude: [Shows existing implementation]                                        │
│                                                                                  │
│  You: Ah, the existing one covers this. Close TICKET-205 as duplicate.          │
│                                                                                  │
│                                                                                  │
│  Day 4: Checking Team Progress                                                  │
│  ─────────────────────────────                                                  │
│                                                                                  │
│  You: /memory-status                                                            │
│                                                                                  │
│  Claude: 📊 Project Memory Status                                                │
│                                                                                  │
│          Total features: 12                                                     │
│          ├── implemented: 10                                                    │
│          └── in_progress: 2                                                     │
│                                                                                  │
│          Recent:                                                                │
│          • TICKET-101: Add user authentication with JWT tokens (implemented)    │
│          • TICKET-102: Create dashboard layout (implemented)                    │
│          • TICKET-103: Add password reset flow (in_progress, @sarah)            │
│          • TICKET-104: Implement rate limiting (in_progress, @mike)             │
│                                                                                  │
│                                                                                  │
│  Day 5: Finding Related Features                                                │
│  ───────────────────────────────                                                │
│                                                                                  │
│  You: /memory-search authentication                                             │
│                                                                                  │
│  Claude: 🔍 Search results for "authentication":                                 │
│                                                                                  │
│          TICKET-101: Add user authentication with JWT tokens                    │
│          Status: implemented | Dev: @john | Date: 2025-01-15                    │
│          Keywords: user, authentication, jwt, tokens                            │
│          Files: src/auth/jwt.js, src/middleware/auth.js                         │
│                                                                                  │
│          TICKET-089: Add OAuth2 authentication providers                        │
│          Status: implemented | Dev: @sarah | Date: 2025-01-10                   │
│          Keywords: oauth2, authentication, google, github                       │
│          Files: src/auth/oauth.js, src/config/providers.js                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/init-memory` | Initialize project memory | Once per project, or to reset |
| `/execute <ticket> <description>` | Implement with duplicate check | Starting any new feature |
| `/memory-status` | View all tracked features | Daily standup, sprint planning |
| `/memory-search <keyword>` | Find related features | Before implementing, code review |

### Best Practices

1. **Always use `/execute`** for new features - it automatically checks for duplicates
2. **Pull before starting** - ensures you have latest team memory
3. **Use descriptive ticket descriptions** - improves duplicate detection accuracy
4. **Check `/memory-status` daily** - stay aware of team progress
5. **Search before implementing** - use `/memory-search` to find related work

---

## Appendix A: Configuration Reference

### settings.json Hook Configuration

```json
{
  "hooks": {
    "PreSession": [
      {
        "command": "node .claude/hooks/session_start.js",
        "timeout": 5000
      }
    ],
    "PostToolResult": [
      {
        "matcher": {
          "tool": ["Edit", "Write"]
        },
        "command": "node .claude/hooks/queue-claude-files.js",
        "timeout": 2000
      }
    ],
    "PostSession": [
      {
        "command": "node .claude/hooks/commit-claude-files.js",
        "timeout": 30000
      }
    ]
  }
}
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Feature** | A tracked unit of work identified by ticket ID |
| **Memory** | The persistent store of tracked features |
| **Duplicate Detection** | Algorithm comparing new work against existing features |
| **Hook** | Event handler triggered by Claude Code lifecycle events |
| **Skill** | User-invocable command defined in Markdown |
| **Queue** | Temporary file tracking modifications during a session |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-28 | System | Initial architecture document for system architects |
