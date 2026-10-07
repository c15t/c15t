---
packages:
  "@c15t/cli":
    replay:
      - exit-prerelease(npm:@c15t/cli)
---

### Install c15t packages that match the CLI

`c15t setup --apply` and the interactive setup install c15t packages from the
CLI's own release line instead of npm `latest`. A prerelease CLI uses its
dist-tag, for example `c15t@alpha`. A stable CLI pins the packages released with
it, such as `c15t` and `@c15t/dev-tools`, to its major version, for example
`c15t@3`. Packages that version on their own, such as `@c15t/ui`,
`@c15t/integrations` and `@c15t/svelte`, install from `latest`.

Rerunning setup keeps packages already on the CLI's line and reinstalls ones on
another major or channel, such as `@c15t/react@^2` in a v2 app. `workspace:`,
`link:`, `file:` and `portal:` ranges are left alone. `c15t generate`
boilerplate lists the same pinned install command.
