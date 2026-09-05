---
'@c15t/react': minor
'@c15t/vue': minor
---

`ConsentProvider` and the `c15tVue` plugin can render a consent runtime they
do not own.

Hosts without a single component tree — an Astro page whose islands cannot see
each other, a SvelteKit root layout — create one runtime with
`createConsentRuntime()` and hand it to whatever renders. `@c15t/svelte`'s
provider already took a `runtime` prop; React and Vue now match.

```tsx
<ConsentProvider runtime={runtime} options={{ theme }}>
  <ConsentDialog />
</ConsentProvider>
```

```ts
createApp(Dialog).use(c15tVue, { runtime }).mount(target);
```

A borrowed runtime is borrowed, not adopted: neither provider starts or
disposes it, and neither mounts the modules it already owns — no second
`init()`, no second persistence handle, no second `window.c15t`. In React the
IAB bridge republishes `runtime.iab` rather than calling `createIAB()` again,
which avoids a second `__tcfapi` on the page and keeps the TCF encoder out of
the preference-centre chunk.

Passing no `runtime` behaves exactly as before, and the Nuxt module is
untouched.
