---
title: Self-hosted migrations
description: Plan and apply the database migrations for an existing backend configuration.
group: cli
---

```bash
c15t self-host migrate --config ./c15t-backend.config.ts --plan --json
```

The configuration must export a supported `database` option. Configure the database connection before running a plan. Interactive migration can help create a missing configuration; unattended invocations require an existing file.

## Apply a reviewed migration

```bash
c15t self-host migrate --config ./c15t-backend.config.ts --apply --json
```

`--plan` inspects the database without applying schema changes. `--apply` explicitly authorizes application. Without either flag, an interactive terminal shows the plan and asks whether to proceed. An unattended invocation must select a mode. `--json` alone never applies migrations.

The result reports planned, applied, already-current, or cancelled work. Unsupported database shapes fail with an explanation. The command disposes its database connection when planning or application finishes, including failures.

The legacy source codemods and agent setup workflow do not replace this database migration step.
