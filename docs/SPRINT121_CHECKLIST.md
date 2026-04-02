# Sprint 12.1 – Assistant Hardening Checklist

## Completed

### 1. SQL Migrations
- [x] `assistant_tool_calls` – run_id, conversation_id, user_id, tool_name, tool_arguments_json, tool_result_json, status, error_message
- [x] `assistant_pending_actions` – conversation_id, user_id, action_name, action_payload_json, status
- [x] `assistant_feedback` – conversation_id, recommendation_id, user_id, feedback_type, notes
- [x] `assistant_recommendations` – rationale, urgency, suggested_next_action
- [x] RLS for new tables

### 2. Provider Abstraction
- [x] `providers/base.ts` – AssistantProvider interface
- [x] `providers/openai-chat-completions.ts` – Chat Completions implementation
- [ ] `providers/openai-responses.ts` – Responses API (deferred)

### 3. Tool Call Traceability
- [x] `observability.ts` – logToolCallStart, logToolCallComplete
- [x] Service layer logs every tool call
- [x] Result truncation for large payloads

### 4. Confirmation System
- [x] `confirmations.ts` – requiresConfirmation, createPendingAction, confirmPendingAction
- [x] SENSITIVE_ACTIONS: create_sprint, send_whatsapp, send_slack, add_exchange_rate
- [x] create_task high/critical → confirmation
- [x] `executePendingAction`, `cancelPendingActionAction` in actions.ts

### 5. create_sprint Tool
- [x] `propose_create_sprint` – creates pending action
- [x] `execute_create_sprint` – runs after confirmation
- [x] Scope: company, personal, global

### 6. Memory Management Page
- [x] Route `/app/assistant/memory`
- [x] List memories, filter by source
- [x] Edit key/value/confidence
- [x] Delete memory
- [x] Show source (explicit_feedback, behavior, system_rule) and confidence

### 7. Admin/Debug Page
- [x] Route `/app/admin/assistant`
- [x] Recent runs, tool calls
- [x] Failed runs, failed tool calls
- [x] Pending confirmations
- [x] Admin-only (assertGroupAdmin)

### 8. Daily Digest Hardening
- [x] Idempotent – skip if digest exists for user/day
- [x] Scope in metadata
- [x] Data quality passed to prompt
- [x] Explicit instructions for missing/incomplete data

### 9. Pending Confirmations UI
- [x] `PendingConfirmationsBanner` component
- [x] API `/api/assistant/pending-actions`
- [x] Shown on assistant page and conversation page

### 10. Truncate Script
- [x] `assistant_tool_calls`, `assistant_pending_actions`, `assistant_feedback` in truncate_all.sql

## Deferred / Future

- **Responses API** – openai-responses provider (migration path ready)
- **assistant_feedback** – thumbs up/down UI
- **Recommendation hardening** – convert to task/sprint, rationale display
- **Conversation quality** – better titles, summaries, archiving
- **System prompt** – further refinement
