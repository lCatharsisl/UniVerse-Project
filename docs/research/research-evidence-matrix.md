# Research Evidence Matrix

Date: 2026-05-02

Scope: Research branch only. Publishing is excluded. This matrix records documentation and repository evidence available after this documentation pass.

Status legend:

- Complete: requirement is fully evidenced by repo artifacts and filled research content.
- Partial: supporting structure or implementation evidence exists, but required source/experiment detail is incomplete.
- Missing: no sufficient repo evidence exists yet.

| Node | Requirement | Current status | Evidence path(s) | Missing items |
| --- | --- | --- | --- | --- |
| RSCH-1-1 | Literature review of 10-19 studies | Partial | `docs/research/literature-review.md` | Fill at least 10 source slots with real citations, summaries, relevance notes, and synthesis. |
| RSCH-2-1 | Literature review of 20-29 studies | Partial | `docs/research/literature-review.md` | Fill at least 20 source slots and add comparative synthesis. |
| RSCH-3-1 | Literature review of 30+ studies | Partial | `docs/research/literature-review.md` | Fill at least 30 source slots and validate all bibliographic metadata. |
| RSCH-4-1 | Literature survey | Partial | `docs/research/literature-survey.md` | Replace placeholder slot references with real citations and write final source-backed survey. |
| RSCH-1-2 | Basic algorithm design and implementation | Partial | `backend/src/modules/search`, `backend/src/modules/academic`, `backend/src/modules/social`, `backend/src/modules/services`, `backend/src/middleware/validateRequest.ts` | Add algorithm/design write-up with inputs, outputs, constraints, and limitations. |
| RSCH-2-2 | Advanced API use with customizations | Partial | `backend/src/modules/identity/infrastructure/identity.service.ts`, `backend/src/integrations/supabaseStorage.ts`, `backend/src/config/swagger.ts`, `backend/src/modules/campus-info/infrastructure/menu.parser.ts` | Document API customizations and cite official API/source references. |
| RSCH-3-2 | Custom implementation of algorithms/layers/models | Partial | `backend/src/modules/*/domain`, `backend/src/modules/*/application`, `backend/src/modules/*/infrastructure`, `backend/src/modules/*/presentation` | Write architecture/layer rationale and show how the layers are reused across modules. |
| RSCH-4-2 | Developing a framework | Missing | None documented | Define and evidence a project-specific reusable framework, conventions, generator, package, or extension mechanism. |
| RSCH-1-3 | Basic parameter tuning and comparison with 1 other method | Missing | `docs/research/methodology.md` | Execute at least one comparative experiment and store results. |
| RSCH-2-3 | Advanced experiment customization and comparison with 3+ methods | Missing | `docs/research/methodology.md` | Build/customize experiment harness and compare at least 3 methods. |
| RSCH-3-3 | Advanced parameter tuning with Design of Experiments | Missing | `docs/research/methodology.md` | Define DoE factors/levels, execute runs, and analyze results. |
| RSCH-4-3 | Own experimenting tool and comparison with 5+ methods | Missing | `docs/research/methodology.md` | Build project-specific tool, compare 5+ methods, and preserve repeatable outputs. |
| RSCH-1-4 | Basic visual summary | Partial | `docs/research/visualization-plan.md` | Generate charts/tables from filled literature or experiment data. |
| RSCH-2-4 | 2+ page visual summary and 3+ visualization methods | Partial | `docs/research/visualization-plan.md` | Produce final 2+ page visual appendix with at least 3 real visualization methods. |

## Immediate Research Gaps

| Priority | Gap | Recommended next action |
| --- | --- | --- |
| P0 | Real citations missing | Fill S01-S30 in `docs/research/literature-review.md`. |
| P0 | Experiments not executed | Choose one deploy-ready experiment track from `docs/research/methodology.md` and record baseline results. |
| P1 | Survey not source-backed | Convert `docs/research/literature-survey.md` from structure to final narrative after citations are filled. |
| P1 | Visualization data missing | Use source-slot and experiment outputs to populate charts in `docs/research/visualization-plan.md`. |
| P2 | Framework node has no evidence | Decide whether UniVerse will claim RSCH-4-2; if yes, document reusable framework conventions and examples. |
