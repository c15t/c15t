---
packages:
  c15t:
    replay:
      - exit-prerelease(npm:c15t)
  "@c15t/react":
    replay:
      - exit-prerelease(npm:@c15t/react)
  "@c15t/nextjs":
    replay:
      - exit-prerelease(npm:@c15t/nextjs)
  "@c15t/tanstack-start":
    replay:
      - exit-prerelease(npm:@c15t/tanstack-start)
  "@c15t/svelte":
    replay:
      - exit-prerelease(npm:@c15t/svelte)
  "@c15t/astro":
    replay:
      - exit-prerelease(npm:@c15t/astro)
  "@c15t/ui":
    replay:
      - exit-prerelease(npm:@c15t/ui)
---

### Render theme CSS on the server

Breaking. The browser no longer generates theme CSS. `ConsentProvider` and
`ConsentRoot` stop rendering a `<style id="c15t-theme">` element, which saves
about 1.7 KB gzip per visitor. The package stylesheet already carries the
default tokens.

Render custom tokens with the new `ConsentTheme` component, exported from
`@c15t/react`, `@c15t/nextjs`, `@c15t/tanstack-start` and the `c15t/react`,
`c15t/next` and `c15t/tanstack-start` entries. It is not a client component,
so render it from a Server Component. It takes `theme`, `colorScheme`
(`'light'`, `'dark'` or `'system'`) and `nonce`. `generateThemeCSS()` from
`@c15t/ui/theme` escapes `<`, so its output is safe inside a `<style>` element.

`@c15t/svelte` no longer injects token CSS after hydration, and `@c15t/astro`
renders the integration's `theme` tokens on the server.

#### Migration

- Next.js App Router. Move the theme to a module without `'use client'` and
  render `<ConsentTheme theme={theme} />` in the root layout. Move
  `colorScheme` and `nonce` there too. Keep `options.theme` on `ConsentRoot`
  only for `consentActions` and slot styles.
- Next.js Pages Router. Render `ConsentTheme` in `pages/_document.tsx`.
- TanStack Start. Return `generateThemeCSS(theme)` from a `createServerFn` in
  the root loader and render it in a `<style id="c15t-theme">` in the head.
- React without SSR. Render `ConsentTheme` next to the provider, or put the
  output of `generateThemeCSS(theme)` in your stylesheet.
- SvelteKit. Return `generateThemeCSS(theme)` from `+layout.server.ts` and
  render it in `<svelte:head>`.
- Astro. Keep tokens in the integration's `theme`. Tokens in the client
  entrypoint's `theme` are no longer applied.
- To toggle light and dark at runtime, render `ConsentTheme` without
  `colorScheme` and toggle the `dark` class on `<html>`.
- Keep importing the package stylesheet.
