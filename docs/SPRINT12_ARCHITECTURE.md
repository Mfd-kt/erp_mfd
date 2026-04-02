# Sprint 12 – AI Financial Copilot Architecture

## Overview

Agent-based assistant using:
- **OpenAI Chat Completions API** with tool/function calling
- **Server-side orchestration** – no direct DB access from the model
- **Controlled memory** – explicit preferences, no self-training
- **Secure tools** – all ERP access via typed server functions

## Data Flow

```
User → Chat UI → Server Action → Orchestrator
                                    ↓
                              OpenAI API (with tools)
                                    ↓
                              Tool dispatcher → ERP services
                                    ↓
                              Response + optional CTA
```

## Scope Handling

- **global**: group-level view (all companies)
- **business**: one company or all business companies
- **personal**: personal finance entities only

## Security

- All reads respect `getAccessScope()` company visibility
- Sensitive actions require explicit confirmation (create sprint, send notification, add FX rate)
- Tool calls logged in `assistant_runs.metadata_json`
- Recommendations stored with audit trail

## Memory Model

- `assistant_memories`: key-value with source (explicit_feedback | behavior | system_rule)
- No free-form learning; only structured preferences
- Thumbs up/down on recommendations → update memory
