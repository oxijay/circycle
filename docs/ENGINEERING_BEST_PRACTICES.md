# Engineering Best Practices (Circycle)

This document is the implementation standard for this codebase.

## 1) Core Rules

- Keep behavior predictable. Prefer explicit logic over magic.
- Keep changes small and reversible. Avoid broad refactors without clear value.
- Optimize for operational safety: no data loss, clear validations, clear errors.
- Use one source of truth per concern (DB schema, service logic, UI state).

## 2) Stack Boundaries

- UI and routing: Next.js App Router (`app/`).
- Server/API: Route handlers in `app/api/**/route.ts`.
- Business logic and integrations: `lib/**`.
- Persistence: Prisma + PostgreSQL (`prisma/schema.prisma`).

Rule: route handlers should stay thin, business logic should live in `lib/`.

## 3) TypeScript Standards

- Use strict typing, avoid `any`.
- Model shared contracts with interfaces/types in one place when reused.
- Prefer union types for finite domain states (`TripStatus`, `TripType`, etc.).
- Parse user input early and convert to canonical type before processing.

## 4) API Design (Next.js Route Handlers)

- Validate inputs before writing/reading DB.
- Return stable response shapes.
- Use correct HTTP status codes:
- `200` success read/update
- `201` success create
- `400` validation errors
- `404` not found
- `500` unexpected errors
- Never leak internal stack traces in responses.
- Keep logs actionable and short (`context + error message`).

## 5) Prisma + PostgreSQL

- Keep DB naming consistent and explicit (`snake_case` in DB, mapped via Prisma if needed).
- Always include indexes for frequent filters and joins.
- Use transactions for multi-step writes that must succeed/fail together.
- Select only needed fields in heavy queries.
- Avoid N+1 query patterns.
- Use migrations for schema changes; keep schema and code in sync.

## 6) State and Form Handling

- Prefer controlled inputs for critical operational forms.
- Keep derived values in `useMemo` (totals, variances, progress).
- Keep one parsing path for numeric input (same rules everywhere).
- Validate hard business constraints in both UI and API:
- Example: max material rows per trip, non-negative weights, step prerequisites.

## 7) Workflow/Timeline UX Rules

- Users should always see:
- current step
- what is required next
- why next action is blocked
- Do not duplicate dense information in multiple sections.
- Show summaries close to the action area (step-focused layout).
- Keep transitions reversible where business allows (back step supported).

## 8) Integrations (Automil)

- Wrap external calls in a dedicated integration module (`lib/integrations`).
- Set explicit timeout and error handling.
- Provide graceful fallback behavior (mock/empty state) when integration is unavailable.
- Never block core local workflow because of optional integration failure.

## 9) Performance

- Default to Server Components; use Client Components only for interactive views.
- Avoid unnecessary client-side re-renders and repeated fetches.
- Cache or memoize derived calculations where appropriate.
- Keep payloads lean and avoid overfetching.

## 10) Security and Data Safety

- Never commit secrets. Use `.env` / `.env.local`.
- Validate and sanitize all API input.
- Treat all external payloads as untrusted.
- Protect destructive actions with explicit checks.

## 11) Testing and Quality Gates

- Minimum gate before merge:
- `npm run lint`
- `npm run build`
- For complex business logic, add unit tests around pure logic in `lib/`.
- For key workflows (trip steps), prefer integration tests over only snapshot/UI tests.

## 12) Change Checklist (Definition of Done)

- Business rule implemented in UI and API where relevant.
- Error states handled and user-facing message is clear.
- No TypeScript or lint issues.
- Build passes.
- README/docs updated if behavior changed.

## 13) Naming and Code Style

- Use clear domain names (`trip`, `material`, `bag`, `partner`, `reconciliation`).
- Keep function names action-oriented (`updateTrip`, `addMaterialRow`, `loadTrips`).
- Keep components focused; split when file becomes hard to reason about.
- Add comments only where logic is non-obvious.
