# Technical Tree Evidence Matrix

Date: 2026-05-02

Scope: Repo-evidence matrix for deploy-ready Technical Tree compliance. Publishing is intentionally excluded. Deployment-live evidence is out of scope; deploy-ready evidence is in scope.

Source basis: current repository files plus `docs/technical-tree-compliance-report.md`. This file does not modify application code and does not claim missing citations, tests, infrastructure, or live deployment as complete.

Status legend:

- Complete: direct repo evidence exists.
- Partial: repo evidence exists but does not fully satisfy the node.
- Missing: no sufficient repo evidence found.
- Out of scope: intentionally excluded from this deliverable.

## Scope Boundaries

| Area | Scope decision |
| --- | --- |
| Publishing branch | Excluded from this matrix. |
| Deployment-live proof | Out of scope; do not require a live URL, cloud deployment record, or production traffic evidence in this package. |
| Deploy-ready proof | In scope; include build, CI, Docker/config, env separation, test, security, and documentation readiness evidence. |
| App code changes | Out of scope for this pass. |

## Research

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| RSCH-1-1 | Partial | `docs/research/literature-review.md` | Fill 10-19 real source records. |
| RSCH-2-1 | Partial | `docs/research/literature-review.md` | Fill 20-29 real source records. |
| RSCH-3-1 | Partial | `docs/research/literature-review.md` | Fill 30+ real source records. |
| RSCH-4-1 | Partial | `docs/research/literature-survey.md` | Complete source-backed literature survey. |
| RSCH-1-2 | Partial | `backend/src/modules/search`, `backend/src/modules/academic`, `backend/src/modules/social`, `backend/src/modules/services` | Add algorithm/design write-up. |
| RSCH-2-2 | Partial | `backend/src/modules/identity/infrastructure/identity.service.ts`, `backend/src/integrations/supabaseStorage.ts`, `backend/src/config/swagger.ts` | Document advanced API customizations and source references. |
| RSCH-3-2 | Partial | `backend/src/modules/*/domain`, `backend/src/modules/*/application`, `backend/src/modules/*/infrastructure`, `backend/src/modules/*/presentation` | Formalize custom layer/model rationale. |
| RSCH-4-2 | Missing | None | Define/evidence a reusable framework. |
| RSCH-1-3 | Missing | `docs/research/methodology.md` | Execute one comparative experiment. |
| RSCH-2-3 | Missing | `docs/research/methodology.md` | Compare 3+ methods with customized tooling. |
| RSCH-3-3 | Missing | `docs/research/methodology.md` | Run Design of Experiments. |
| RSCH-4-3 | Missing | `docs/research/methodology.md` | Build own experiment tool and compare 5+ methods. |
| RSCH-1-4 | Partial | `docs/research/visualization-plan.md` | Generate visual summary from real data. |
| RSCH-2-4 | Partial | `docs/research/visualization-plan.md` | Produce 2+ page visual summary with 3+ methods. |

## DevOps

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| DVPS-1 | Missing | `docker-compose.yml` only covers PostgreSQL/Redis | Add backend/frontend Dockerfiles or equivalent app container build evidence. |
| DVPS-2 | Partial | `docker-compose.yml` | Add frontend/backend services and DB wiring in compose. |
| DVPS-3 | Complete | `backend/src/routes/health.ts`, `backend/src/app.ts` | None for basic health endpoint. |
| DVPS-3-1 | Partial | `backend/src/app.ts`, `backend/src/shared/presentation/router.ts` | Document single application path or dependent configuration path explicitly. |
| DVPS-3-2 | Partial | `backend/src/config/env.ts`, `backend/src/config/validation.ts`, `.github/workflows/ci.yml` | Add clear dev/staging/prod config separation and deploy-ready env templates. |
| DVPS-3-2 alt path | Out of scope | None | Live cloud deployment is out of scope; deploy-ready workflow/config evidence remains in scope. |
| DVPS-4 | Missing | None | Add cloud resource security design, private networking plan/config, or secret/resource boundary evidence. |

## Security

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| SCRT-1 | Complete | `backend/src/modules/identity`, `backend/src/middleware/auth.ts` | None for username/password auth. |
| SCRT-2 | Partial | `backend/src/modules/identity/infrastructure/identity.service.ts` | Password hashing exists; document encryption-at-rest policy for sensitive fields. |
| SCRT-3-1 | Partial | `docs/access-control-matrix.md`, `backend/src/middleware/auth.ts`, `backend/src/modules/community/infrastructure/community.service.ts` | Centralize and test RBAC policy coverage. |
| SCRT-3-2 | Missing | `backend/src/middleware/upload.ts`, `backend/src/middleware/cvUpload.ts` | Add VirusTotal or equivalent malware scanning for uploaded files. |
| SCRT-4-1 | Complete | `backend/src/config/env.ts`, `backend/src/config/validation.ts` | None for env-based settings; secret manager remains separate node. |
| SCRT-4-2 | Partial | `docs/access-control-matrix.md`, `backend/src/modules/community/infrastructure/community.service.ts`, `backend/src/modules/social/infrastructure/moderation.service.ts` | Add central ABAC layer and ABAC decision logs. |
| SCRT-5 | Missing | None | Add KeyVault/secret manager integration or deploy-ready design evidence. |

## Web Application

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| WAPP-1 | Partial | `frontend/src/pages`, `backend/src/modules`, `docs/technical-tree-compliance-report.md` | Add explicit business logic specifications. |
| WAPP-2 | Complete | `backend/src/modules/identity`, `backend/src/middleware/auth.ts`, `backend/src/middleware/upload.ts`, `backend/src/middleware/cvUpload.ts` | None for auth/RBAC/upload baseline. |
| WAPP-3 | Partial | `backend/src/middleware/validateRequest.ts`, `backend/src/config/validation.ts`, `frontend/src/pages/*Form.tsx` | Standardize frontend form validation evidence across critical forms. |
| WAPP-4 | Partial | `frontend/src`, `backend/src/middleware/errorHandler.ts`, `docs/access-control-matrix.md` | Central ABAC proof and full responsive QA evidence. |
| WAPP-5-1 | Complete | `frontend/package.json`, `frontend/src/components`, `frontend/src/pages` | None for basic animation/transitions. |
| WAPP-6-3 | Complete | `frontend/src/context/AuthContext.tsx`, `frontend/src/context/ThemeContext.tsx`, `frontend/src/i18n/config.ts` | None for state persistence. |
| WAPP-7-3 | Complete | `frontend/src/i18n/config.ts`, `frontend/src/i18n/locales/en.json`, `frontend/src/i18n/locales/tr.json` | None for TR/EN localization baseline. |
| WAPP-5-2 | Partial | `backend/src/config/swagger.ts`, `migrations/*.sql` | ORM integration is missing; raw `pg` usage is not ORM evidence. |
| WAPP-6-2 | Complete | `backend/src/routes/health.ts`, `backend/src/app.ts` | None for health endpoint. |
| WAPP-7-2 | Partial | `backend/src/config/swagger.ts`, `backend/src/config/env.ts`, `backend/src/config/validation.ts` | Add API-doc/schema-validation separation per environment. |
| WAPP-6-1 | Partial | `backend/src/config/db.ts`, `backend/src/modules/*/infrastructure` | Async DB exists through `pg`; add stronger query-layer documentation if claiming full credit. |
| WAPP-7-1 | Missing | None | Add documented Backend-for-Frontend endpoints or layer. |

## Database

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| DTBS-1-1 | Complete | `migrations/*.sql` | None for naming convention baseline. |
| DTBS-1-2 | Missing | None | Add standalone local DB evidence if this path is pursued. |
| DTBS-2-1 | Complete | `backend/src/config/db.ts`, `migrations/*.sql`, `backend/package.json` | None for PostgreSQL baseline. |
| DTBS-3-1 | Partial | `backend/src/config/env.ts`, `backend/src/config/validation.ts` | Add explicit dev/staging/prod database separation evidence. |
| DTBS-1-3 | Missing | None | Add Base64/BLOB artifact storage strategy if this node is pursued. |
| DTBS-3-2 | Partial | `backend/src/integrations/supabaseStorage.ts`, `backend/scripts/supabase-storage-public-read.sql` | Make cloud artifact storage mandatory/configured and documented. |
| DTBS-1-4 | Partial | `backend/src/middleware/observability.ts`, `backend/src/utils/logger.ts` | Add Firebase/NewRelic/Sentry or equivalent request/exception logging integration evidence. |
| DTBS-1-5 | Missing | None | Add ABAC decision logging. |
| DTBS-2-2 | Partial | `backend/src/middleware/observability.ts`, `backend/src/middleware/requestId.ts`, `backend/src/utils/logger.ts` | Add trace logging/distributed tracing evidence. |

## Testing / Quality Assurance

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| TEST-1 | Missing | None | Add manual test plan and execution record. |
| TEST-2 | Complete | `frontend/src/test/app.smoke.test.tsx`, `frontend/vitest.smoke.config.ts` | None for smoke baseline. |
| TEST-3 | Complete | `backend/src/test/auth.integration.test.ts`, `backend/src/test/social.integration.test.ts`, `backend/src/test/community.integration.test.ts`, `backend/src/test/messaging.integration.test.ts` | None for current endpoint integration baseline. |
| TEST-4 | Missing | `backend/src/middleware/rateLimiter.ts` | Add rate limiting tests. |
| TEST-5-1 | Missing | None | Add E2E security tests for auth, role bypass, upload bypass, CORS/CSRF-style negative flows where applicable. |
| TEST-5-2 | Missing | None | Add cross-browser UI tests, for example Playwright Chromium/Firefox/WebKit. |
| TEST-5-3 | Partial | `backend/src/modules/identity/infrastructure/*.test.ts`, `backend/src/modules/search/utils/hashtags.test.ts` | Expand backend data model, validation, and data-method coverage. |
| TEST-6-1 | Missing | None | Add frontend API/controller interaction tests with mocked HTTP. |
| TEST-6-2 | Partial | `backend/src/modules/identity/infrastructure/*.test.ts`, `backend/src/modules/search/utils/hashtags.test.ts` | Expand backend validation/data method tests. |
| TEST-7-1 | Partial | `frontend/src/test/languageswitch.interaction.test.tsx`, `frontend/src/test/loadingbutton.interaction.test.tsx`, `frontend/src/test/searchbar.interaction.test.tsx` | Add broader frontend integration flows. |
| TEST-7-2 | Complete | `backend/src/test/*.integration.test.ts` | None for high-level API baseline; keep expanding as modules change. |

## Version Control

| Node | Status | Repo evidence path(s) | Missing items |
| --- | --- | --- | --- |
| VCTL-1 | Partial | Git repository, `.github/workflows/ci.yml` | Add workflow documentation proving GitHub Flow practice. |
| VCTL-2 | Missing | None | Add release tags and release notes when releases are cut. |
| VCTL-3 | Partial | `.github/workflows/ci.yml`, `backend/package.json`, `frontend/package.json`, `package.json` | Align CI with root scripts and fix frontend build/lint blockers. |
| VCTL-4 | Partial | `package.json`, `backend/vitest.integration.config.ts`, `backend/src/test/*.integration.test.ts` | Run backend integration tests in GitHub Actions and publish evidence. |
| VCTL-5 | Missing | None | Add advanced workflow documentation and supporting branch/release practice. |
| VCTL-6 | Missing | None | Add deploy-ready CD workflow; live deployment remains out of scope for this package. |

## Deploy-Ready Priority Gaps

| Priority | Gap | Blocks |
| --- | --- | --- |
| P0 | Frontend build/lint blockers remain reported in `docs/technical-tree-compliance-report.md` | CI/deploy-ready claim |
| P0 | CI workflow does not match root CI coverage | VCTL-3, VCTL-4 |
| P0 | Backend/frontend Dockerization missing | DVPS-1, DVPS-2 |
| P1 | Dev/staging/prod config separation incomplete | DVPS-3-2, DTBS-3-1, WAPP-7-2 |
| P1 | Security hardening gaps: malware scanning, KeyVault/secret manager, central ABAC, ABAC logs | SCRT-3-2, SCRT-4-2, SCRT-5, DTBS-1-5 |
| P1 | Test coverage gaps: rate limit, E2E security, cross-browser, frontend integration | TEST-4, TEST-5-1, TEST-5-2, TEST-6-1, TEST-7-1 |
| P2 | Research placeholders still need real citations, experiments, and charts | Research branch completion |
