# Cross-framework comparisons

Start the React, Svelte, and Vue Storybooks, then run:

```sh
PARITY_FRAMEWORKS=react,svelte,vue bun run --cwd apps/parity-runner test:parity
```

The default URLs are ports 6006, 6007, and 6008. Override them with
`REACT_STORYBOOK_URL`, `SVELTE_STORYBOOK_URL`, and `VUE_STORYBOOK_URL`.

## DevTools

Run just the DevTools comparisons:

```sh
PARITY_FRAMEWORKS=react,svelte,vue bun run --cwd apps/parity-runner test:parity devtools.spec.ts
```

This checks all seven tabs and the circular launcher at desktop and mobile
sizes, in light and dark mode. It compares the floating panel itself, including
its portaled content, through DOM, accessibility, computed styles, and exact
screenshots. It also rejects horizontal overflow and off-screen placement.

React is the reference for each browser run. Screenshots are attached to the
Playwright report, so no OS-specific baseline update is needed. These checks
still run when CI passes `--ignore-snapshots`. They detect differences between
frameworks, not a visual change shared by every framework. Revision counters,
generated instance IDs, and anonymized script IDs are normalized; event history
is cleared before comparison.

Storybook's `devtools` stories also run the shared consent/script interaction
contract in each framework. React has a separate story using the real TanStack
Devtools host, including host unmount/remount. That story is tested for behavior
and deliberately excluded from visual comparisons.

```sh
STORYBOOK_URL=http://127.0.0.1:6006 bun run --cwd apps/storybook-react test-storybook --includeTags devtools
```
