# Railway backend replacement

The identified Railway workload is the STANDBY Fastify API. Its source is
`letstakeabreak/JunctionX-2026-Gemini` at `8337186`, not the divergent upstream
repository. The Railway account currently returns an authentication error, and
its documented public `/healthz` URL currently returns 404. Neither observation
establishes whether the account contains data or additional services.

## Proposed destination and current state

`deploy/fly.toml` prepares one always-running Fly.io Machine in Tokyo (`nrt`).
The official shared CPU, 1 GB calculator gives USD 8.76 for 30 days of continuous
runtime; Asia outbound traffic is USD 0.04/GB, with tax and other usage separate.
There is no assumed free production tier. No Fly account,
Machine, subscription, or paid resource has been created by this change.

One process is required by the existing architecture: cases, uploaded bytes,
operations, memberships, and idempotency records are held in process memory.
Uploading 50 MiB and polling a 600-second provider operation must remain
possible. An autoscaling Vercel wrapper does not meet these requirements without
Blob/shared database/durable-job changes. Adding a Fly volume alone does not
persist the process's Maps. This move does not add restart recovery or high
availability; that requires a separate shared transactional store/job design.

## Before provisioning

1. Confirm the destination, intended Fly organization, final application name,
   region, and recurring cost. The checked-in name `standby-api-miro` is proposed,
   not a claim that the name is available or belongs to this account.
2. Sign into that account using `fly auth login`, and verify it with
   `fly auth whoami`. Do not create an unrelated account or use another team's
   default organization to get around missing authorization.
3. Configure a valid server-side `UPSTAGE_API_KEY` directly in Fly Secrets. A
   Vercel Sensitive value cannot be exported for this move. The previous
   Railway app could not be read, so its remaining agent overrides and secrets
   must be reconciled before cutover. Never place keys in frontend variables,
   command arguments, tracked files, or logs.
4. Set exact `STANDBY_ALLOWED_ORIGINS` for the real frontend domains. This is a
   public anonymous demo with UUID ownership isolation, not verified user login.
   Any optional bearer/JWT authentication must use private strong secrets.

## Deployment commands after account and cost confirmation

Run from the repository root, using the installed CLI's help for current flags:

```sh
export STANDBY_FLY_APP=standby-api-miro
fly auth whoami
fly apps create "$STANDBY_FLY_APP" --org YOUR_CONFIRMED_ORG
# Import a protected local file containing UPSTAGE_API_KEY and any required
# server-only overrides; do not echo its contents.
fly secrets import --stage --app "$STANDBY_FLY_APP" < /path/to/protected-backend-secrets
fly config validate --app "$STANDBY_FLY_APP" --config deploy/fly.toml
fly deploy --app "$STANDBY_FLY_APP" --config deploy/fly.toml --ha=false \
  --strategy immediate --remote-only --wait-timeout 10m \
  --build-arg "GIT_COMMIT_SHA=$(git rev-parse HEAD)"
fly scale count 1 --app "$STANDBY_FLY_APP"
fly status --app "$STANDBY_FLY_APP"
```

Use exactly one Machine. Deploying with default HA or multiple replicas can
route polling requests to a process that does not own the case. Production
startup rejects missing provider credentials and invalid origins. `/healthz`
is liveness and build identity; `/readyz` reports whether the instance accepts
new work. Neither endpoint proves that the external provider accepts its key.

The Fly deployment opts into its `Fly-Client-IP` header for the rate-limit key,
validating that it contains a single IP address and otherwise falling back to
the socket address. This mode requires Fly's injected application identity and
public ingress through `http_service`; do not expose the raw API port outside
that proxy or trust arbitrary `X-Forwarded-For` values. Verify distinct actual
clients after deployment before claiming observed per-client throttling.

## Gate frontend cutover on observed behavior

```sh
node scripts/backend-smoke.mjs --url "https://$STANDBY_FLY_APP.fly.dev" \
  --origin https://standby-junctionx.vercel.app \
  --expected-commit "$(git rev-parse HEAD)" --allow-writes --upload-mib 50
```

The smoke command creates only an isolated anonymous controlled fixture, checks
idempotency and cross-session access denial, and optionally retains a 50 MiB
transport fixture until that process exits. It performs no paid AI calls. Also
complete an actual bounded extraction with operator-provided controlled input,
observe the operation through completion after the initial HTTP 202, and verify
the review/workspace result from separate requests. Validate an operation that
lasts more than five minutes before asserting the full original time budget.

Only after these checks pass:

1. Set production `VITE_STANDBY_API_BASE_URL` on the affected Vercel frontends
   (`standby`, `standby-demo-junctionx`, and, if selected for the standalone API,
   `standby-3-7`) to the verified new HTTPS API origin.
2. Rebuild each frontend from its exact intended UI commit. The current UI
   commits differ; do not replace all three with the same branch accidentally.
   The deprecated `api/index.ts` now returns 503 instead of using an unsafe
   serverless in-memory backend or published JWT fallback. Do not deploy the
   new frontend source until its standalone API origin has been configured.
3. Check actual browser upload, operation polling, review and workspace on each
   production frontend. Record deployment IDs and public URLs.
4. Keep the old service and rollback configuration until those observations are
   complete. Existing in-memory Railway cases cannot be copied without a
   supported export path and account access. Do not claim a data migration.
5. Decommission Railway only after verifying no clients or jobs still use it.
   No old service, data, database, or account is deleted by this change.

## Subsequent deploys and recovery limits

Fly's termination window is at most 300 seconds and is best effort. It cannot
guarantee completion of an already-running 600-second job. Arrange maintenance,
stop new work and let existing jobs finish before deploying. An immediate
one-Machine rollout has downtime and clears memory. A rolling/blue-green rollout
with two unrelated in-memory stores is not a safe zero-downtime workaround.

Rollback means restoring the previous frontend API URL and rebuilding the same
frontend revision, then verifying it. It cannot restore lost process memory.
The Vercel integrations listing also returned 403, so no shared data store was
silently provisioned or represented as configured.
