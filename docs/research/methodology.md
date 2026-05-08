# Implementation and Experimentation Methodology

Date: 2026-05-02

Purpose: Define how UniVerse can be evaluated against the Technical Tree Research implementation and experimentation nodes without changing app code in this pass.

## Implementation Methodology

| Node | Requirement | Repo evidence available now | Missing for full claim |
| --- | --- | --- | --- |
| RSCH-1-2 | Basic algorithm design and implementation | Search, menu parsing, appointment availability, feed retrieval, notifications, and validation logic exist under `backend/src/modules/*` and `backend/src/middleware/*`. | Document the selected algorithms, inputs, outputs, complexity, and limitations. |
| RSCH-2-2 | Advanced API use with customizations | Microsoft auth service, Supabase storage integration, Swagger, PDF/menu parsing, and Postgres-backed search provide candidates. | Document customization details and cite API docs or literature sources. |
| RSCH-3-2 | Custom implementation of algorithms/layers/models | Modular backend layers exist: domain, application, infrastructure, presentation for several modules. | Provide a formal architecture explanation and justify custom layers with evidence. |
| RSCH-4-2 | Developing a framework | No project-specific reusable framework is documented. | Define reusable conventions, generators, shared abstractions, or extension points before claiming this node. |

## Candidate Implementation Artifacts

| Artifact | Evidence path | Research angle | Documentation needed |
| --- | --- | --- | --- |
| Search workflow | `backend/src/modules/search` | Query parsing, hashtag handling, PostgreSQL search | Algorithm description and benchmark plan |
| Appointment workflow | `backend/src/modules/academic`, `migrations/019_appointments_slot_locking.sql` | Availability, slot locking, conflict prevention | State model and race-condition analysis |
| Social feed workflow | `backend/src/modules/social` | Feed retrieval, comments, likes, reposts, moderation | Ranking or ordering rules and moderation model |
| Notifications workflow | `backend/src/modules/notifications` | Event-to-notification flow | Delivery semantics and failure behavior |
| Messaging workflow | `backend/src/modules/messaging` | Conversations, unread state, mute controls | Consistency, privacy, and performance considerations |
| Upload/storage workflow | `backend/src/middleware/upload.ts`, `backend/src/middleware/cvUpload.ts`, `backend/src/integrations/supabaseStorage.ts` | File upload validation and storage routing | Threat model and malware scanning gap |
| API documentation workflow | `backend/src/config/swagger.ts` | Swagger/OpenAPI support | Environment-specific API documentation gap |

## Experimentation Methodology

| Node | Requirement | Proposed evidence deliverable | Current status |
| --- | --- | --- | --- |
| RSCH-1-3 | Basic parameter tuning, basic experimentation tool, comparison with 1 other method | Manual or scripted comparison of UniVerse workflow latency/usability against one baseline campus system or static portal prototype. | Not yet executed. |
| RSCH-2-3 | Advanced experimenting tool customization and comparative analysis with 3+ methods | Scripted benchmark/test harness comparing UniVerse against at least 3 baselines or configurations. | Not yet executed. |
| RSCH-3-3 | Advanced parameter tuning with Design of Experiments | DoE matrix for selected parameters such as pagination size, search query strategy, cache strategy, rate limits, and DB indexing. | Not yet executed. |
| RSCH-4-3 | Own experimenting tool and extensive comparative analysis with 5+ other methods | Project-specific evaluation harness with repeatable runs, result exports, and 5+ baseline/config comparisons. | Not yet executed. |

## Proposed Experiment Tracks

| Track | Parameters | Metrics | Baselines or variants |
| --- | --- | --- | --- |
| Search performance | Query type, page size, index strategy, language, hashtag use | p50/p95 latency, result count, error rate, relevance proxy | Static filtering, SQL `LIKE`, PostgreSQL full-text, hashtag-only, combined query |
| Feed and community workflows | Feed size, comment depth, user role, moderation state | p50/p95 latency, failed requests, authorization denials, DB query count if instrumented | Current REST endpoint, paginated variant, role-filtered variant, cached variant |
| Upload flow | File type, size, storage backend, validation rule | success rate, rejection accuracy, upload latency, security finding count | Local disk, Supabase Storage, MIME validation only, future malware scan variant |
| Appointment scheduling | Concurrent requests, slot count, staff availability shape | conflict rate, success rate, lock contention, latency | Naive insert, DB constraint/lock, serialized request, optimistic retry |
| Frontend reliability | Browser, route, locale, viewport | page load success, interaction success, visual issue count | Chromium, Firefox, WebKit, mobile viewport, desktop viewport |

## Experiment Record Template

```text
Experiment ID:
Research node:
Date:
Hypothesis:
Dataset or seed data:
Parameters:
Baseline methods:
Execution command:
Metrics:
Results table path:
Visualization path:
Interpretation:
Limitations:
Follow-up:
```

## Minimum Deploy-Ready Research Evidence

For deployment-ready compliance, the team should prioritize:

- Reproducible commands for build, unit, integration, and smoke tests.
- Evidence that failed builds and CI issues have been resolved.
- Docker/backend/frontend service packaging evidence.
- Environment separation for dev, staging, and production without live deployment proof.
- Security test scenarios for auth bypass, role bypass, upload bypass, rate limiting, and invalid input.
- Experiment tables that can be re-run from a clean checkout.
