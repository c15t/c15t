---
packages:
  '@c15t/cli': patch
---

### Install c15t packages that match the CLI

`c15t setup --apply` and the interactive setup now install `c15t`, `@c15t/integrations` and `@c15t/dev-tools` from the CLI's own release line instead of npm `latest`. A prerelease CLI uses its dist-tag, for example `c15t@alpha` from a 3.0.0 alpha CLI, and a stable CLI uses its major version, for example `c15t@3`. Rerunning setup still recognizes packages that are already installed.

`c15t generate` boilerplate now lists the same pinned install command for its c15t packages, and the generated README no longer says the files target unpublished APIs.
