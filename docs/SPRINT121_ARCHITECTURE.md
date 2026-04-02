# Sprint 12.1 – Assistant Hardening Architecture

## Overview

Production-grade hardening of the AI assistant:
- **Provider abstraction** – Chat Completions + Responses API
- **Tool call traceability** – assistant_tool_calls table
- **Confirmation system** – assistant_pending_actions for sensitive actions
- **Memory management** – visible, editable, auditable
- **create_sprint** – with confirmation flow
- **Recommendation hardening** – rationale, urgency, convert actions
- **Daily digest** – idempotent, quality checks
- **Admin/debug** – observability

## Safety Model

1. **No direct DB access** – assistant uses typed server tools only
2. **Sensitive actions** – require explicit user confirmation
3. **Tool call logging** – every call logged with args/result/status
4. **Memory audit** – source, confidence, editable
5. **Recommendations** – separate from chat, traceable

## Provider Interface

```ts
interface AssistantProvider {
  chat(ctx, messages, options?): Promise<ChatResult>
}
```

- `openai-chat-completions` – current implementation
- `openai-responses` – Responses API (stateful, continuation)
