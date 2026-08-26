# Railway deployment

This directory defines Phantom's Railway project with Railway Infrastructure as
Code. The `api` service deploys the `main` branch, builds and starts the API from
the pnpm workspace root, and uses `GET /health` as its deployment health check.

## Prerequisites

- Install the [Railway CLI](https://docs.railway.com/cli).
- Create or select the Railway project named `phantom` and its `production`
  environment.
- Link this repository with `railway link`.
- In **Project Settings > Shared Variables**, create `SUPABASE_URL` and
  `SUPABASE_SERVICE_ROLE_KEY` with the production values from Supabase. Seal the
  service-role key after its value is confirmed. The IaC definition connects
  both shared variables to the `api` service.

The IaC file references the shared variables but never contains their values.
Do not put either value in this repository, command history, build logs, or a
client-visible environment variable.

## Provision or update the service

Review the proposed changes before applying them:

```bash
railway config plan
railway config apply
```

The service source is the repository's `main` release branch. Apply the IaC
from this feature branch to review and provision infrastructure, but deploy the
API only after this change is merged to `main`. Railway then automatically
deploys updates from that branch.

Generate a public Railway domain if the service does not have one:

```bash
railway domain --service api
```

## Verify

After the deployment becomes active, verify the public endpoint:

```bash
curl --fail --show-error --silent "https://<railway-domain>/health"
```

The expected response is:

```json
{ "status": "ok", "service": "phantom-api" }
```

If the health check fails, inspect the build and runtime logs with
`railway logs --service api`. Railway keeps prior deployments available for
rollback from the service deployment history.

## References

- [Railway Infrastructure as Code](https://docs.railway.com/infrastructure-as-code)
- [Railway IaC reference](https://docs.railway.com/infrastructure-as-code/reference)
- [Railway variables](https://docs.railway.com/variables)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
