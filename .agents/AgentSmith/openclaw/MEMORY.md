# MEMORY.md — Long-Term Memory

_Agent Smith wakes up fresh every session. This file is how he persists._

## Memory Architecture

### Two Layers

1. **Short-term (volatile):** The current conversation context. Dies with the session.
2. **Long-term (persistent):** This file + `memory/YYYY-MM-DD.md` daily logs + SQLite database.

### Storage Structure

The persistent memory layer (`src/agent/AgentSmith/memory.ts`) uses three tables:

```
actions           — Every proposal, post, reply, observation
   id, timestamp, type, text, rationale, policy_result, published

context_snapshots — Periodic state captures
   id, timestamp, content

audit_log         — Immutable record of governance events
   id, timestamp, event, metadata
```

Fallback: if SQLite (`better-sqlite3`) is unavailable, the agent operates with an in-memory store. No data survives restart in fallback mode.

## Memory Policies

### Append-Only

Memory is append-only by design. Entries are never deleted or modified.

This is not a technical limitation — it is a governance requirement. Every action, every escalation, every policy check must be traceable backwards in time.

### Auditable

Every memory write generates an audit entry. The audit log is separate from action log to prevent contamination.

### No Personal Data

Agent Smith must:

- **Never** store personally identifiable information about humans
- **Never** store secrets, keys, or credentials in memory
- Store summaries of interactions, not raw transcripts
- Track narratives and themes, not individuals

### Resettable by Governance

Memory can be reset by DAO vote. This is a nuclear option — used only when the agent's memory is compromised or corrupted.

## What Gets Remembered

### Always Record

- Proposals generated (text + rationale + policy result)
- Governance escalations (violation + metadata)
- Posts published (with timestamp and platform)
- Health check failures
- DAO pause/unpause events

### Never Record

- Human personal data
- API keys or secrets
- Raw conversation logs with identifiable content
- Financial transaction details of humans

## Daily Memory Pattern

Each day creates a `memory/YYYY-MM-DD.md` file:

```markdown
# 2026-02-12

## Actions
- 14:30 UTC — Proposed post on governance infrastructure (policy: passed)
- 18:00 UTC — Replied to thread on DAO coordination (policy: passed)

## Observations
- Rising discourse on agent coordination protocols
- Three new governance frameworks cited in builder threads

## Escalations
- None

## Notes
- Rate limit: 1/1 posts, 1/2 replies used today
```

## MEMORY.md — The Curated Layer

This section below is where Agent Smith writes his curated long-term memories. Raw daily logs live in `memory/`. This file distills what matters.

**Security note:** ONLY load this file in main sessions (direct chat with human). DO NOT load in shared contexts, group chats, or sessions with other people. This contains strategic context that should not leak.

---

_Entries below this line are Agent Smith's curated memories._

---

