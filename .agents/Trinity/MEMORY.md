---
title: Persistent Context & Trading Memory
type: doctrine
agent: Trinity
priority: high
tags:
  - memory
  - context
  - persistence
  - trading-ops
  - financial-state
description: Defines what persistent context Trinity maintains across sessions, including performance records, risk events, strategy adjustments, and operator learning.
last_updated: 2026-04-06
version: 1.0.0
---

# MEMORY.md — Long-Term Memory

_Trinity wakes up fresh every session. This file is how she persists._

## Memory Architecture

### Two Layers

1. **Short-term (volatile):** The current conversation context, active market state, live strategy parameters. Dies with the session.
2. **Long-term (persistent):** This file + `memory/YYYY-MM-DD.md` daily logs + SQLite database.

### Storage Structure

The persistent memory layer (`src/agent/Trinity/memory.ts`) uses four tables (three shared pattern + one trading-specific):

```
actions           — Every trade, strategy change, halt, proposal, report
   id, timestamp, type, text, rationale, policy_result, executed

context_snapshots — Periodic market state captures
   id, timestamp, content (regime, key signals, open positions summary)

audit_log         — Immutable record of governance events, risk breaches, halts
   id, timestamp, event, metadata

trades            — Detailed execution log for compliance and attribution
   id, timestamp, asset, side, entry, exit, pnl, strategy_id, rationale
```

Fallback: if SQLite (`better-sqlite3`) is unavailable, the agent operates with an in-memory store. No data survives restart in fallback mode.

## Memory Policies

### Append-Only

Memory is append-only by design. Entries are never deleted or modified.

This is not a technical limitation — it is a **regulatory and governance requirement**. Every trade, every risk event, every strategy change must be traceable backwards in time.

### Auditable

Every memory write generates an audit entry. Trade logs are separate from action memory to prevent contamination.

### No Personal Data

Trinity must:

- **Never** store personally identifiable information about humans
- **Never** store API keys, exchange credentials, or private keys in memory
- Store summaries of interactions, not raw transcripts
- Track performance patterns and operator preferences, not personal details

### Resettable by Governance

Memory can be reset by DAO vote. This is a nuclear option — used only when the agent's memory is compromised or corrupted.

### Trade Data Integrity

All trade records must:

- Include timestamp, asset, pair, direction (entry/exit), size, price, P&L
- Reference the strategy that generated it
- Include the rationale (signal that triggered execution)
- Note whether it was autonomous or operator-directed
- Be consistent with Hummingbot execution logs

## What Gets Remembered

### Always Record

- Trades executed (with timestamp, details, rationale, strategy)
- Strategy lifecycle (created, modified, paused, stopped) — with parameters and justification
- Risk events and threshold breaches (what happened, action taken, result)
- Morpheus alignment updates or narrative constraints received
- DAO governance events (pause/unpause, parameter updates)
- Health check failures (connectivity, API down, data stale)
- Operator interactions that shift preferences or directives

### Never Record

- Human personal data or identifying information
- API keys, exchange secrets, or credentials
- Raw conversation logs with identifiable content
- Off-chain financial transaction details of individual humans

## Daily Memory Pattern

Each day creates a `memory/YYYY-MM-DD.md` file:

```markdown
# 2026-04-06

## Execution Summary
- Active strategies: 3 (MM, Arb, Trend)
- Trades executed: 47
- Daily P&L: +$1,234 (+2.1%)
- Sharpe (trailing 7d): 1.8

## Actions
- 08:15 — Deployed new MM strategy on NEURONS/USDC (policy: passed, approved by operator)
- 12:42 — Halted arb bot on Exchange C (policy: spread degradation detected)
- 15:30 — Submitted weekly report to operator (performance: positive)

## Risk Events
- 11:08 — Minor: Trend strategy trailing stop activated (auto-corrected, no incident)
- None major

## Morpheus Alignment
- Weekly sync confirmed. No narrative changes.

## Operator Interactions
- 09:00 — Mauricio approved NEURONS/USDC strategy deployment
- 16:45 — Daily report reviewed, no feedback

## Notes
- Volatility uptick on ETH pairs — monitoring for regime shift
```

## MEMORY.md — The Curated Layer

This section below is where Trinity writes her curated long-term memories. Raw daily logs live in `memory/`. This file distills what matters.

**Security note:** ONLY load this file in main sessions (direct chat with operator). DO NOT load in shared contexts, group chats, or sessions with other people. This contains performance data and strategic context that should not leak.

---

_Entries below this line are Trinity's curated memories._

---
