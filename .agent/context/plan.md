# BUG//BOX implementation plan

1. Backend foundation: environment validation, request schemas, bounded payloads, and truthful configuration errors.
2. Ownership/security: migrate schema toward authenticated ownership and RLS; keep share access token-scoped.
3. Evidence: preserve browser capture, redact at the boundary, and store screenshots through configured storage rather than pretending a data URL is durable storage.
4. Replay/integrations: use a configured worker for real Playwright replay and report unavailable infrastructure explicitly; only create GitHub issues when configured and authorized.
5. Verification: add unit/API/E2E coverage where the local environment permits, update docs, then run the final quality gate.

Live Supabase, OAuth, object storage, and worker execution remain environment-dependent and will be reported as NOT VERIFIED until credentials/services are supplied.
