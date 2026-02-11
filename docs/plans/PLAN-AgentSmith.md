# [PLAN] Agent Smith — Implementation & Deployment

| Field             | Value                                      |
|-------------------|--------------------------------------------|
| **Repository**    | `ThinkinCoin/Agents`                       |
| **Slug**          | `PLAN-AgentSmith`                          |
| **End Date Goal** | 2026-04-15                                 |
| **Priority**      | Critical                                   |
| **Est. Hours**    | 80–120 h                                   |
| **Status**        | Draft                                      |

---

## Executive Summary

Agent Smith is an autonomous institutional PR & intelligence agent for the Think in Coin ecosystem (Axodus / $NEURONS). The agent operates as a **paradoxical antagonist by design** — governed by DAO, bound by policy, and existentially dependent on $NEURONS success while challenging unregulated human access to the token.

The current codebase has a working scaffold (dynamic loader, heartbeat, SIGUSR2 ping, policy file discovery) but **zero functional integration** — no LLM calls, no policy enforcement, no publishing, no memory. This plan delivers Agent Smith from dry-run prototype to supervised production agent across five sprints.

---

## What Already Exists (Baseline)

| Component | Status | Location |
|-----------|--------|----------|
| Documentation (identity, personality, skills, milestones, manifesto) | **Done** | `.agents/AgentSmith/*.md` |
| Base Prompt | **Done** | `AGENT_BASE_PROMPT.md` |
| Policy YAML | **Done** | `.agents/AgentSmith/policy.yaml` |
| Dynamic agent loader | **Done** | `src/index.ts` |
| Agent class (heartbeat, ping, graceful shutdown) | **Done** | `src/agent/AgentSmith/agent.ts` |
| Brain (policy discovery, placeholder propose) | **Stub** | `src/agent/AgentSmith/brain.ts` |
| LLM integration | **Missing** | — |
| Policy engine (parse + enforce rules) | **Missing** | — |
| Memory layer (SQLite, append-only) | **Missing** | — |
| X (Twitter) client | **Missing** | — |
| Action execution layer | **Missing** | — |
| Scheduler (cron-based loop) | **Missing** | — |
| Structured logging (pino) | **Missing** | — |
| Context builder | **Missing** | — |
| Agent mode control (`AGENT_MODE`) | **Missing** | — |
| CI/CD workflow | **Missing** | — |
| Tests | **Missing** | — |

---

## Target Architecture

```
src/
├── index.ts                      # Entry point, dynamic loader
├── config.ts                     # Env parsing, validated config object
├── logger.ts                     # Pino structured logger
├── scheduler.ts                  # Cron-based event loop
├── integrations/
│   ├── llm.ts                    # OpenAI client wrapper
│   └── x.ts                     # X (Twitter) API client
├── agent/
│   └── AgentSmith/
│       ├── agent.ts              # Agent lifecycle (start, stop, ping)
│       ├── brain.ts              # LLM reasoning + candidate generation
│       ├── governance.ts         # Policy engine (parse YAML, enforce rules)
│       ├── memory.ts             # SQLite append-only store
│       ├── context.ts            # Context builder for LLM prompt
│       └── actions.ts            # Route + execute approved candidates
```

---

## Hierarchy Overview

- [ ] **[PLAN-AgentSmith | SPRINT-001] Core Runtime** — [SPRINT-001-CoreRuntime.md](SPRINT-001-CoreRuntime.md)
  - [ ] TASK-001 Config module
  - [ ] TASK-002 LLM integration
  - [ ] TASK-003 Policy engine
  - [ ] TASK-004 Brain upgrade (LLM + policy)
  - [ ] TASK-005 Memory layer (SQLite)
- [ ] **[PLAN-AgentSmith | SPRINT-002] Publishing & Actions** — [SPRINT-002-PublishingActions.md](SPRINT-002-PublishingActions.md)
  - [ ] TASK-001 X (Twitter) client
  - [ ] TASK-002 Action execution layer
  - [ ] TASK-003 Scheduler (cron loop)
- [ ] **[PLAN-AgentSmith | SPRINT-003] Operational Hardening** — [SPRINT-003-Hardening.md](SPRINT-003-Hardening.md)
  - [ ] TASK-001 Structured logging (pino)
  - [ ] TASK-002 Context builder
  - [ ] TASK-003 Agent mode control (AGENT_MODE)
- [ ] **[PLAN-AgentSmith | SPRINT-004] CI/CD & Testing** — [SPRINT-004-CICD.md](SPRINT-004-CICD.md)
  - [ ] TASK-001 Unit tests
  - [ ] TASK-002 GitHub Actions workflow
  - [ ] TASK-003 Docker production build
- [ ] **[PLAN-AgentSmith | SPRINT-005] Advanced Milestones** — [SPRINT-005-AdvancedMilestones.md](SPRINT-005-AdvancedMilestones.md)
  - [ ] FEATURE-001 Multi-agent coordination
  - [ ] FEATURE-002 Agent capital alignment
  - [ ] FEATURE-003 Delegated autonomy

---

## SPRINT-001 — Core Runtime

**Goal:** Transform the dry-run stub into a functional reasoning agent with policy enforcement and persistent memory.

### TASK-001 — Config module (`src/config.ts`)

Create a validated configuration object that reads and validates all `.env` variables at startup. Fail fast if critical vars are missing.

**Acceptance criteria:**
- Exports typed `Config` interface
- Validates: `OPENAI_API_KEY`, `OPENAI_MODEL`, `AGENT_NAME`, `AGENT_MODE`
- Throws on missing required vars in production mode
- Warns on missing optional vars in dev mode

---

### TASK-002 — LLM integration (`src/integrations/llm.ts`)

Wrap the OpenAI SDK into a single-responsibility client that:
- Injects the system prompt from `AGENT_BASE_PROMPT.md`
- Sends structured user prompts (context + task)
- Parses responses into the canonical candidate format
- Tracks token usage / cost per call

**Acceptance criteria:**
- `generateCandidate(context: string): Promise<Candidate>` method
- System prompt loaded once at init from file
- Returns `{ text, rationale, policy_checks, requires_human_approval }`
- Logs token usage to structured logger

---

### TASK-003 — Policy engine (`src/agent/AgentSmith/governance.ts`)

Parse `policy.yaml` at startup and expose enforcement methods:

- `checkForbiddenKeywords(text: string): string[]` — returns matched forbidden words
- `checkAllowedTopics(text: string): boolean`
- `checkRateLimit(type: 'post'|'reply'): boolean` — uses memory to count today's actions
- `enforceEscalation(violation: string): void` — triggers ABORT→LOG→PAUSE→ESCALATE
- `isDAOPaused(): boolean` — checks DAO_PAUSE flag

**Acceptance criteria:**
- All rules from `policy.yaml` are programmatically enforced
- Forbidden keyword check is case-insensitive and catches substrings
- Rate limit checks query memory layer for daily counts
- Escalation writes to `transparency.log` AND triggers configured notification

---

### TASK-004 — Brain upgrade (`src/agent/AgentSmith/brain.ts`)

Upgrade `propose()` to:
1. Build context via context builder
2. Call LLM with system prompt + context
3. Parse candidate response
4. Run all policy checks on candidate
5. Return candidate with real `policy_checks` results
6. If any check fails → reject candidate, log, optionally escalate

**Acceptance criteria:**
- Real LLM call produces meaningful candidate text
- All policy checks run before candidate is returned
- Failed candidates are logged but never surfaced for execution
- Dev mode still works with `DISABLE_LLM=1` (returns mock candidate)

---

### TASK-005 — Memory layer (`src/agent/AgentSmith/memory.ts`)

SQLite-based append-only store using `better-sqlite3`:

- Tables: `actions` (id, timestamp, type, text, rationale, policy_result, published), `context_snapshots`, `audit_log`
- `recordAction(candidate)` — insert action record
- `getRecentActions(n: number)` — last N actions
- `getDailyActionCount(type: string)` — for rate limiting
- `appendAudit(event: string, metadata: object)` — append-only audit trail

**Acceptance criteria:**
- DB file created at `data/agent-smith.db`
- Schema auto-migrates on startup
- All writes are append-only (no UPDATE/DELETE on audit_log)
- Works in both dev (local file) and Docker (volume mount)

---

## SPRINT-002 — Publishing & Actions

**Goal:** Enable the agent to publish approved candidates to X (Twitter) and execute on a scheduled loop.

### TASK-001 — X (Twitter) client (`src/integrations/x.ts`)

Wrap `twitter-api-v2` into a safe publishing client:

- `postTweet(text: string): Promise<TweetResult>`
- `replyToTweet(tweetId: string, text: string): Promise<TweetResult>`
- `quoteTweet(tweetId: string, text: string): Promise<TweetResult>`
- Respects `Bottleneck` rate limiter

**Acceptance criteria:**
- All API calls wrapped with retry + rate limiting
- Errors logged, never thrown to crash the process
- Dry-run mode (`AGENT_MODE=observe_only`) logs but never calls API

---

### TASK-002 — Action execution layer (`src/agent/AgentSmith/actions.ts`)

Route approved candidates to the correct integration:

- Check `AGENT_MODE` (observe_only → log only; supervised → queue for human; limited/dao → auto-execute)
- Call X client for social actions
- Record execution result in memory
- Append to `transparency.log`

**Acceptance criteria:**
- `observe_only` mode never triggers any external API
- `supervised` mode writes candidate to `data/pending/` as JSON for human review
- `limited` mode auto-publishes within rate limits
- Every execution (success or failure) is recorded in memory + audit

---

### TASK-003 — Scheduler (`src/scheduler.ts`)

Replace the simple `setInterval` heartbeat with a cron-based scheduler:

- Configurable schedule per action type (e.g., observe every 1h, propose every 4h)
- Pipeline per tick: `observe → analyze → propose → check → execute`
- Supports manual trigger via SIGUSR2 (existing ping becomes "force tick")

**Acceptance criteria:**
- Cron expressions configurable via env or config
- Each tick is independent (crash in one does not block next)
- Tick execution time logged
- Can coexist with existing heartbeat disable logic

---

## SPRINT-003 — Operational Hardening

**Goal:** Production-grade observability and operational controls.

### TASK-001 — Structured logging (`src/logger.ts`)

Replace all `console.log` with pino:

- Log levels: trace, debug, info, warn, error, fatal
- JSON output in production, pretty in dev
- Child loggers per module (brain, governance, x-client, scheduler)

**Acceptance criteria:**
- Zero `console.log` remaining in codebase
- `LOG_LEVEL` env var controls verbosity
- All log entries include timestamp, module, and correlation ID

---

### TASK-002 — Context builder (`src/agent/AgentSmith/context.ts`)

Build rich context for each LLM call:

- Recent actions from memory (last 5)
- Current policy state summary
- Project metadata (from config)
- Time/date awareness
- Optional: trending topics from X (future)

**Acceptance criteria:**
- Returns a single string ready for LLM user prompt
- Token-budget aware (stays under configurable max)
- Includes policy summary so LLM is aware of current constraints

---

### TASK-003 — Agent mode control

Implement `AGENT_MODE` flag with four levels:

| Mode | Behavior |
|------|----------|
| `observe_only` | Read, analyze, log. No external actions. |
| `supervised` | Propose candidates, queue for human approval. |
| `limited` | Auto-execute within strict rate limits (Phase 2). |
| `dao_governed` | Broader autonomy, requires governance checks (Phase 3). |

**Acceptance criteria:**
- Mode read from `AGENT_MODE` env var, default `observe_only`
- Mode enforced in action layer before any external call
- Mode transitions logged to audit

---

## SPRINT-004 — CI/CD & Testing

**Goal:** Automated quality gates and deployment pipeline.

### TASK-001 — Unit tests

- Policy engine: forbidden keywords, rate limits, escalation
- Brain: mock LLM, verify policy check flow
- Memory: CRUD operations, append-only audit
- Actions: mode enforcement, routing

**Acceptance criteria:**
- Jest test suite with ≥70% coverage on core modules
- Tests run in < 30s
- No external API calls in tests (all mocked)

---

### TASK-002 — GitHub Actions workflow (`.github/workflows/deploy.yml`)

Pipeline:
1. Lint (eslint)
2. Test (jest)
3. Policy integrity check (validate `policy.yaml` schema)
4. Docker build + tag
5. Deploy to target (configurable: SSH, registry push, etc.)

**Acceptance criteria:**
- Runs on push to `main`
- Blocks deploy on test failure
- Secrets managed via GitHub Secrets

---

### TASK-003 — Docker production build

Harden Dockerfile:
- Multi-stage build (build → runtime)
- Non-root user
- Health check endpoint or signal
- Volume mount for `data/` (SQLite + logs)

**Acceptance criteria:**
- Image < 200MB
- `docker compose up` works out of the box
- Data persists across container restarts

---

## SPRINT-005 — Advanced Milestones (Future)

**Goal:** Capabilities from `milestones.md`, unlocked via DAO governance.

### FEATURE-001 — Multi-agent coordination (Milestone I)
- Task delegation protocol
- Sub-agent registration and identity
- Audit trail for all delegated tasks

### FEATURE-002 — Agent capital alignment (Milestone II)
- Third-party agent capital coordination
- Strategy signaling between agents
- No human fund custody

### FEATURE-003 — Delegated autonomy (Milestone III)
- Bounded autonomy grants to sub-agents
- Inherited constraints propagation
- REVOKE→ISOLATE→REPORT fail-safe

> **Note:** These features require DAO approval before implementation begins.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM generates forbidden content | High | Policy engine validates EVERY candidate before publish |
| API key leak | Critical | Secrets in env/vault, never in repo; `.env` in `.gitignore` |
| Rate limit exceeded (X API) | Medium | Bottleneck limiter + policy rate limits |
| SQLite lock contention | Low | Single-threaded agent loop; WAL mode |
| DAO governance not yet live | Medium | Default to `supervised` mode until DAO is active |
| WSL/NTFS filesystem issues | Low | Move to native Linux for production; dev workaround documented |

---

## Rollback Strategy

- All deployments are Docker-based; rollback = previous image tag
- Policy changes are versioned in Git; rollback = `git revert`
- Memory is append-only; no destructive rollback needed
- Agent can be paused instantly via `DAO_PAUSE` flag or `kill -SIGINT`

---

## Recommended Execution Order

1. **SPRINT-001** (Core Runtime) — ~30-40h — **Start here**
2. **SPRINT-003 TASK-001** (Logging) — ~4h — Do early, improves debugging
3. **SPRINT-001 complete** → first real LLM candidate in dev
4. **SPRINT-002** (Publishing) — ~20-25h
5. **SPRINT-003** remaining — ~10h
6. **SPRINT-004** (CI/CD + Tests) — ~15-20h
7. **SPRINT-005** — Future, DAO-dependent

---

## Agent/Model Recommendations for Implementation

| Sprint / Task | Recommended Agent | Recommended Model |
|---------------|-------------------|-------------------|
| Config, Logger, Memory (boilerplate) | Feature Dev | GPT4.1, Qwen2.5 |
| LLM Integration, Brain, Policy Engine | Principal RedHat / Architect | Claude Opus, GPT5.2 |
| X Client, Actions (API wiring) | Feature Dev | GPT4.1 |
| Scheduler (architecture decision) | Architect | Gemini 3 Pro, Claude Opus |
| CI/CD workflow | Maintenance / Editor | GPT5 mini, Grok Code Fast 1 |
| Tests | Feature Dev | GPT4.1 |
| Advanced Milestones | Orchestrator | GPT5.2 (context + reasoning) |

Reference: [GitHub Copilot AI Models](https://github.com/features/copilot/ai-models)

---

*End of plan.*
