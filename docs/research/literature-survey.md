# Literature Survey

Date: 2026-05-02

Purpose: Provide a survey structure for RSCH-4-1. This file is not a completed literature survey yet because the repository does not currently contain verified source details. The team must fill the source slots in `docs/research/literature-review.md` before converting this into final survey evidence.

## Survey Thesis Draft

UniVerse can be positioned as an integrated campus service and social platform. The expected literature argument is that student-facing platforms improve value when they combine reliable service access, identity-aware permissions, searchable information, community interaction, and deployment-ready engineering practices. This thesis remains provisional until backed by real sources.

## Comparative Survey Matrix

| Survey dimension | Source slots to cite | Expected comparison | Current UniVerse evidence | Gap to close |
| --- | --- | --- | --- | --- |
| Campus platform scope | S01-S03 | Compare single-purpose student portals against integrated campus apps. | `frontend/src/pages/*`, `backend/src/modules/*` show multiple campus workflows. | Need sources proving why integration matters. |
| Engagement and community | S04-S06 | Compare feed, community spaces, messaging, notifications, moderation, and reporting models. | `backend/src/modules/social`, `backend/src/modules/community`, `backend/src/modules/messaging`, `backend/src/modules/notifications` | Need empirical evidence for engagement and moderation choices. |
| Campus operations | S07-S10 | Compare service workflows such as lost/found, appointments, menus, maps, search, and job/event forms. | `backend/src/modules/services`, `backend/src/modules/academic`, `backend/src/modules/campus-info`, `backend/src/modules/search` | Need source-backed service design rationale. |
| Identity and authorization | S11-S15 | Compare password auth, SSO, RBAC, ABAC, and upload threat controls. | `backend/src/modules/identity`, `backend/src/middleware/auth.ts`, `docs/access-control-matrix.md`, `backend/src/middleware/upload.ts` | Need source-backed ABAC/RBAC model and malware scanning rationale. |
| Backend/API maintainability | S16-S20 | Compare REST, OpenAPI, validation, modular layering, and health/readiness checks. | `backend/src/config/swagger.ts`, `backend/src/middleware/validateRequest.ts`, `backend/src/routes/health.ts` | Need literature and official standards to support API choices. |
| Quality and deploy readiness | S21-S30 | Compare automated testing, CI, Docker, staging/prod separation, secret management, observability, and cloud readiness. | `.github/workflows/ci.yml`, `package.json`, `docker-compose.yml`, `backend/src/middleware/observability.ts` | Need expanded tests and deploy-ready config evidence. |

## Survey Narrative Outline

1. Campus digital platform requirements.
2. Integrated social/service architecture for student workflows.
3. Identity, authorization, and upload security for university contexts.
4. API design, validation, and modular backend maintainability.
5. Testing, CI, containerization, and deploy-ready compliance.
6. Research gap: evidence-based comparison of UniVerse against baseline campus-service approaches.

## Source-to-Decision Traceability

| Decision area | Required source slots | Repo decision to justify | Current status |
| --- | --- | --- | --- |
| Integrated app rather than isolated tools | S01-S03, S07-S10 | Single product containing feed, search, appointments, menu, lost/found, and job/event workflows | Source support missing |
| Community/social layer | S04-S06 | Social feed, communities, moderation, reporting, notifications | Source support missing |
| University identity | S11-S12 | Password auth plus Microsoft identity support | Source support missing |
| RBAC/ABAC controls | S13-S14 | Role and owner/member checks | Source support missing |
| File upload constraints | S15 | MIME/size/storage controls and future malware scanning | Source support missing |
| REST API with Swagger | S16-S17 | Express REST API and `/api-docs` | Source support missing |
| Modular backend structure | S18 | Modules split by identity, social, services, academic, messaging, notifications, search | Source support missing |
| Validation and error handling | S19 | Zod validation and centralized error handler | Source support missing |
| Health/readiness | S20 | Health endpoint and DB readiness | Source support missing |
| Deploy-ready quality gates | S21-S30 | Build, test, CI, Docker, env separation, secret management, observability | Source support missing |

## Completion Checklist

- Fill at least 30 source slots in `docs/research/literature-review.md`.
- Replace placeholder source slot references with real citations.
- Add a synthesis paragraph for each survey dimension.
- Add at least one limitations paragraph per dimension.
- Add a final research-gap paragraph explaining what UniVerse contributes or demonstrates.
