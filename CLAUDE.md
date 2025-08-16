# Claude Code Implementation Guide for ObsidianComments

## Project Overview
You are implementing a collaborative Markdown editor with real-time editing and commenting features. The project repository is at https://github.com/pangeafate/ObsidianComments.

## Server is available at 138.197.187.49 via SSH
Online access is at https://obsidiancomments.serverado.app/

## Test-Driven Development Process

### TDD Cycle
1. **Red**: Write a failing test that defines desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Test Writing Guidelines
- Test one behavior at a time
- Use descriptive test names that explain what is being tested
- Follow Arrange-Act-Assert pattern
- Test both success and failure scenarios
- Mock external dependencies appropriately

### Backend Testing Requirements

**Unit Test Coverage**
- All service methods must have tests
- Database models need validation tests
- Utility functions require edge case tests
- Error handling must be tested

**Integration Test Coverage**
- Every API endpoint needs request/response tests
- WebSocket events require connection tests
- Database transactions need rollback tests
- Redis sessions need expiration tests

**Test Organization**
- Group tests by feature/module
- Use descriptive describe blocks
- Setup and teardown test databases
- Isolate tests from each other

### Frontend Testing Requirements

**Component Testing**
- Test rendering with different props
- Test user interactions
- Test state changes
- Test error boundaries

**Hook Testing**
- Test custom hooks in isolation
- Mock external dependencies
- Test loading states
- Test error scenarios

**E2E Testing**
- Test complete user workflows
- Test multi-user scenarios
- Test error recovery
- Test performance metrics

## Deployement guidelines
- Deployments are done only via CI/CD github actions
1) repo & workflow hygiene

 Workflows live under .github/workflows/ with clear names and on: triggers (PR, push to main, tags, manual).

 Pin actions by version or SHA (avoid @master).

 Use reusable workflows for shared logic (build/test/release).

 Keep secrets out of code; use Environments for env-specific secrets.

 Define a CODEOWNERS for protected paths.

 Document pipeline in docs/ci-cd.md.

2) security & permissions

 Set permissions: at job/workflow level (principle of least privilege); default to read-all.

 Prefer OpenID Connect (OIDC) for cloud auth (no long-lived keys).

 Use actions/cache with safe paths only; avoid caching untrusted content.

 Enable dependency and secret scanning; add SAST/DAST steps if applicable.

 Lock runners (labels) and consider self-hosted isolation for secrets/builds.

 Use environments with required reviewers for prod.

3) build & test quality gates

 Deterministic build: lockfiles checked in; reproducible container builds.

 Fast tests first (lint/type/unit), then integration/e2e behind a flag.

 Artifact the build output (binaries/images/manifests).

 Test reports uploaded (jUnit) and coverage thresholds enforced.

 Use matrix strategy for critical versions (e.g., runtime, OS).

 Fail fast on critical steps; use continue-on-error: false by default.

4) performance & cost

 Use concurrency groups to cancel superseded runs (e.g., per branch).

 Cache deps (npm/pip/maven/docker layers) with keys + restore keys.

 Reuse artifacts between jobs instead of rebuilding.

 Set artifact retention days sensibly.

5) release versioning

 Source of truth: tags, conventional commits, or release-please.

 Imprint version/commit into build (--build-arg GIT_SHA, etc.).

 Signed tags/releases for prod.

6) deployment strategy

 Separate staging and production environments with gates.

 Strategy defined: canary, blue/green, rolling; include automated health checks.

 Database migrations: pre-checked, backward-compatible, gated step.

 Feature flags for risky changes.

 Infra as Code (Terraform/Helm/Kustomize) reviewed and applied via CI.

7) observability & notifications

 Emit build metadata to logs/telemetry (commit, tag, actor).

 Post deploy: run smoke tests and record release in tracking tool.

 Alerts routed to the right channel (Slack/Teams) only on failure or after prod success.

8) rollback & recovery

 “One-click” rollback job (previous artifact/tag/helm revision).

 DB rollback plan or safe forward-only with feature flags.

 Keep the last N artifacts easily retrievable.

9) compliance & audit

 Protected branches; status checks required.

 Environment approvals logged.

 Immutable audit trail: artifact SHAs, action SHAs, job logs retained.

minimal, safe GitHub Actions deployment template
name: ci-cd

on:
  push:
    branches: [ main ]
    paths-ignore: [ "**.md" ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:
    inputs:
      target_env:
        description: "Environment to deploy"
        required: false
        default: "staging"

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  id-token: write          # for OIDC to cloud
  deployments: write       # create GitHub Deployments
  statuses: write

env:
  APP_NAME: myapp
  CACHE_VERSION: v1

jobs:
  build_test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    strategy:
      matrix:
        node: [18]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - name: Install
        run: npm ci
      - name: Lint
        run: npm run lint
      - name: Unit tests
        run: npm test -- --ci --reporters=jest-junit
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ env.APP_NAME }}-${{ github.sha }}
          path: |
            dist/**
            package.json
            package-lock.json

  docker_image:
    needs: build_test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: ${{ env.APP_NAME }}-${{ github.sha }}
          path: artifact
      - name: Login to registry via OIDC
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build & push image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ghcr.io/${{ github.repository }}/app:${{ github.sha }}
          build-args: |
            GIT_SHA=${{ github.sha }}

  deploy_staging:
    needs: docker_image
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: ${{ steps.deploy.outputs.app_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Configure cloud creds (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Deploy
        id: deploy
        run: |
          # example: helm upgrade --install ...
          echo "app_url=https://staging.example.com" >> "$GITHUB_OUTPUT"
      - name: Smoke test
        run: curl -fS ${{ steps.deploy.outputs.app_url }}/healthz
      - name: Create GitHub Deployment
        uses: chrnorm/deployment-action@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: staging
          ref: ${{ github.sha }}
          description: "Staging deploy"

  deploy_production:
    if: github.ref == 'refs/heads/main'
    needs: [deploy_staging]
    runs-on: ubuntu-latest
    environment:
      name: production           # protect with required reviewers
      url: ${{ steps.deploy.outputs.app_url }}
    steps:
      - uses: actions/checkout@v4
      - name: Configure cloud creds (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Run DB migrations (gated)
        run: ./scripts/migrate.sh --non-interactive
      - name: Deploy
        id: deploy
        run: |
          # example: helm upgrade --install ...
          echo "app_url=https://example.com" >> "$GITHUB_OUTPUT"
      - name: Post-deploy health check
        run: curl -fS ${{ steps.deploy.outputs.app_url }}/healthz
      - name: Create GitHub Deployment
        uses: chrnorm/deployment-action@v2
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: production
          ref: ${{ github.sha }}
          description: "Prod deploy"

  rollback_production:
    if: failure() && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Configure cloud creds (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN_PROD }}
          aws-region: ${{ secrets.AWS_REGION }}
      - name: Roll back to previous release
        run: ./scripts/rollback.sh

environment & secrets model (recommended)

Environments:

dev (optional): ephemeral PR previews via pull_request and environment: pr-<num>.

staging: auto-deploy on merge to main.

production: manual approval; required reviewers.

Secrets (by environment):

Cloud role ARN (for OIDC), region, registry write, DB/url, API keys.

GITHUB_TOKEN with restricted permissions; grant packages: write only where needed.

nice extras

Release notes bot (release-please or changesets).

Auto-tag Docker images with latest, semver, and short SHA.

Performance smoke (p95 latency) as a post-deploy check.

Comment PRs with the preview/staging URL and test summary.

Scheduled job to prune old artifacts/images.