# Version Control Workflow

This document is the project evidence for Technical Tree `VCTL-1`, `VCTL-2`, and `VCTL-5`.

## Workflow Choice

UniVerse uses **GitHub Flow with release tags**.

Rationale:

- The project is a web application with one main deployable product.
- Short-lived feature branches reduce merge risk.
- CI gates are easier to reason about than long-running release branches.
- Release tags provide explicit points for staging/production promotion.

## Branch Rules

| Branch Type | Pattern | Purpose |
| --- | --- | --- |
| Main | `main` | Stable integration branch. |
| Feature | `feature/<short-name>` or `codex/<short-name>` | New user-facing or technical work. |
| Fix | `fix/<short-name>` or `codex/<short-name>` | Bug fixes and CI fixes. |
| Docs | `docs/<short-name>` or `codex/<short-name>` | Documentation-only changes. |

Rules:

- Do not commit directly to `main` except emergency fixes approved by the team.
- Keep branches short-lived.
- Rebase or merge from `main` before opening a pull request if branch drift is large.
- Do not mix unrelated feature, refactor, and formatting changes in one pull request.

## Pull Request Gates

Every pull request must pass:

- Backend TypeScript check/build.
- Backend unit tests.
- Backend integration tests.
- Frontend lint.
- Frontend smoke tests.
- Frontend production build.

Manual review must confirm:

- No secrets or `.env` values are committed.
- New endpoints have auth/authorization behavior documented.
- New migrations are reversible or safely repeatable.
- User-facing UI changes are checked on mobile and desktop.

## Release Tagging

Release tags use semantic versioning:

```text
vMAJOR.MINOR.PATCH
```

Examples:

```text
v0.1.0
v0.2.0
v1.0.0
```

Tagging procedure:

1. Confirm `main` is green in CI.
2. Run local preflight from repo root:

```bash
npm run ci
```

3. Create an annotated tag:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
```

4. Push the tag:

```bash
git push origin v0.1.0
```

5. Record release notes with:

- commit hash,
- included feature/fix summary,
- migration notes,
- manual test result,
- known limitations.

## Deployment-Ready Policy

Live deployment may be manual or disabled, but every release tag must be deploy-ready:

- Docker images can be built.
- Health/readiness endpoints pass.
- Required environment variables are documented.
- Database migrations are listed in order.
- Rollback notes are available.

