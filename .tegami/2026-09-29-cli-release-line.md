---
packages:
  '@c15t/cli': patch
---

### Install c15t packages that match the CLI

`c15t setup --apply` and the interactive setup now install `c15t`, `@c15t/integrations` and `@c15t/dev-tools` from the CLI's own release line instead of npm `latest`. A prerelease CLI uses its dist-tag, for example `c15t@alpha` from a 3.0.0 alpha CLI, and a stable CLI uses its major version, for example `c15t@3`, for the packages released together with it. Packages that version on their own, such as `@c15t/ui`, `@c15t/integrations` and `@c15t/svelte`, install from `latest` on a stable CLI. Rerunning setup keeps c15t packages the app already declares on the same release line. A c15t package declared on another major or prerelease channel, such as `@c15t/react@^2` in a v2 app, is installed again from the CLI's line so it matches the code setup writes. Compound ranges such as `>=2 <3` and `^2 || ^3` count by the versions they admit. Under a prerelease CLI, a range that names no prerelease and also admits an earlier major, such as `>=2` or `*`, is installed again, because npm resolves it to the earlier stable release, and so is a dist-tag other than the CLI's own, such as `latest`. `workspace:`, `link:`, `file:` and `portal:` ranges are left as they are, and so are dist-tags under a stable CLI.

`c15t generate` boilerplate now lists the same pinned install command for its c15t packages, and the generated README no longer says the files target unpublished APIs.
