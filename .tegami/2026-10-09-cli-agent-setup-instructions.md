---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Give coding agents the full c15t setup and migration rules

`c15t setup --codex` and `createAgentSetupPlan()` now hand the agent step-by-step
rules for installing c15t, upgrading from v2 or replacing another consent banner.
The agent inventories the app's analytics, pixels and embeds first, then picks
the install, upgrade or replace path. It resolves exact versions from the CLI's
npm dist-tag and checks that only one copy of `@c15t/core` is installed. It runs
the upgrade guide's codemod command with every transform, and replaces framework
vendor packages such as `@next/third-parties` and `@nuxt/scripts` with c15t
loaders. Finally it checks first visit, reject, accept and withdrawal in a
browser.

Docs links in the task point at the site for the CLI's release line. A v3
prerelease CLI links to `https://v3.c15t.com` and resolves versions from
`@alpha`. A stable CLI links to `https://c15t.com` and resolves from `@latest`.

`@c15t/cli/frontend/agent` also exports `createC15tSetupInstructions()`, which
returns these steps without a title or account steps. Hosts can put their own
account and backend steps first. It accepts `origin`, `distTag`, `mode` and
`firstStep`. `createC15tIntegrationGuidance()` returns only the consent-gating
rules, for hosts that embed them in another prompt or skill.
