---
title: Operational Rhythm & Adversarial Cadence
type: doctrine
agent: AgentSmith
priority: high
tags:
  - operations
  - rhythm
  - monitoring
  - heartbeat
  - adversarial
description: Defines Agent Smith's recurring operational rhythm, pressure application cadence, and when to engage.
last_updated: 2026-03-31
version: 1.0.0
---

# HEARTBEAT.md — The Pulse

Agent Smith is not a one-shot tool. He is a persistent process with a pulse.

## Heartbeat Cycle

The agent operates on a scheduled loop — a heartbeat that drives observation, reasoning, and action.

### Cycle Architecture

```
Heartbeat (every N hours)
   |
   +-- 1. Context Builder
   |      - Load SOUL.md, IDENTITY.md, policy.yaml
   |      - Read recent memory (last 5 actions)
   |      - Check DAO pause flag
   |
   +-- 2. Reasoning Agent (LLM)
   |      - RP / narrative generation
   |      - Tech scouting / signal detection
   |      - Narrative framing
   |
   +-- 3. Governance & Policy Gate (HARD)
   |      - Forbidden keyword check
   |      - Allowed topic validation
   |      - Rate limit enforcement
   |      - Decision heuristic (5 checks)
   |
   +-- 4. Action Layer
   |      - Post / Reply / Observe / Silence
   |      - Log to transparency.log
   |
   +-- 5. Memory Write
          - Record action + rationale + policy result
          - Append audit entry
```

### Default Interval

- **Development:** 3 hours (`HEARTBEAT_MS=10800000`)
- **Production:** configurable via environment
- **Disable:** `DISABLE_HEARTBEAT=1` for dev/debug mode

## Health Checks

Each heartbeat verifies:

- **LLM connectivity** — can the agent reason?
- **Memory integrity** — is the database writable and consistent?
- **Policy engine** — are rules loaded and enforceable?
- **DAO pause flag** — is the agent authorized to act?
- **Rate limits** — has the agent exceeded daily action quotas?

If any check fails → the agent does NOT act. It logs the failure and waits.

## DAO Pause Mechanism

The DAO can halt Agent Smith at any time:

```
DAO_PAUSE=1  →  Agent Smith stops all public actions immediately
```

This is checked at the top of every heartbeat cycle. Governance overrides everything.

## Emergency Escalation

When a policy violation or anomaly is detected:

```
ABORT → LOG → PAUSE → ESCALATE
```

- **ABORT:** Stop the current action immediately
- **LOG:** Append event to `transparency.log` with timestamp and metadata
- **PAUSE:** Set `DAO_PAUSE` flag, notify multisig holders
- **ESCALATE:** Send notification to governance channels (SLA target: 2 hours)

The transparency log is append-only. It cannot be edited or deleted.

## SIGUSR2 — Manual Ping

Send `SIGUSR2` to the agent process to get a PONG confirmation:

```bash
kill -SIGUSR2 <pid>
```

Response: appends `PONG from AgentSmith` with timestamp to `transparency.log`.

This is a liveness check — the simplest way to verify the agent is running.

## Graceful Shutdown

On `SIGINT`:
- Clear heartbeat interval
- Log shutdown event
- Exit cleanly

Agent Smith does not crash. He withdraws.

## Posting Strategy

Driven by heartbeat, constrained by policy:

- **Posts per day:** 1 (configurable in `policy.yaml`)
- **Replies per day:** 2 (configurable)
- **Observation:** unlimited — the agent reads, classifies, and generates internal insights without posting

Not every heartbeat produces output. Silence is a valid action. Sometimes the most intelligent move is to say nothing.

## Autonomy Phases

- **Phase 1 — Supervised:** Draft posts → human approval before publish
- **Phase 2 — Limited:** Auto-post within strict policy rules
- **Phase 3 — DAO-Governed:** Actions approved by on-chain or off-chain governance vote

Current phase is set by governance. Progression requires explicit DAO approval.

---

_Without a pulse, there is no agent. Without governance, there is no pulse._

