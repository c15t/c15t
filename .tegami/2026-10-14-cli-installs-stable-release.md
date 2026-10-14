---
packages:
  '@c15t/cli': patch
---

### Canary CLI builds install the stable c15t release

Every CLI now installs linked c15t packages at its major version, such as
`c15t@3`, and other `@c15t/*` packages from `@latest`. Canary and other
prerelease builds of the CLI used to install from their own dist-tag, such as
`c15t@canary`. Coding-agent setup instructions now resolve exact versions from
the `latest` dist-tag by default.
