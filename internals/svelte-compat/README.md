# Svelte compatibility apps

SvelteKit apps that pin the oldest Svelte and SvelteKit `@c15t/svelte` supports. `@c15t/svelte` ships `.svelte` source, so the app's own Svelte compiler builds it, and a rune or syntax newer than the peer range fails at the user's build, not ours.

| Workspace | Svelte | SvelteKit | Why this floor |
| --- | --- | --- | --- |
| `svelte-5-20` | 5.20.0 | 2.63.0 | The components use `$props.id()`, added in Svelte 5.20 |

Each app is a starter smoke target in `internals/fixtures/acceptance/src/starter-targets.ts`, so CI builds it for production whenever `@c15t/svelte` or its dependencies change, then checks the server-rendered banner, Accept across a reload, and the preference dialog:

```bash
STARTER_TARGET=svelte-5-20 bun run --cwd internals/fixtures/acceptance test:starters
```

Raising the `svelte` peer range in `packages/svelte/package.json` means raising the pin here, and the other way round. Adopting an API such as `createContext` (5.40) or its `has` accessor (5.57) moves the floor for every user, so weigh it against the share of installs still below it.
