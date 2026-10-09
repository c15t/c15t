---
packages:
  '@c15t/cli': patch
---

### Move `@c15t/react` and `@c15t/nextjs` imports to `c15t` in the v3 codemods

The v3 codemods left `@c15t/react` imports and `@c15t/react/styles.css`
imports in place, so an app that had switched its dependencies to `c15t`
still imported packages it no longer installed.

The new `packages-to-c15t` codemod runs before the other v3 codemods. It
points `@c15t/react` imports at `c15t/react`, `@c15t/nextjs` imports at
`c15t/next`, and, in a Next.js app, the `@c15t/react` root at `c15t/next`.
Subpaths such as `/headless` and `/components/consent-dialog-link` keep their
names. It points the `@c15t/react/postcss-tailwind3` and
`@c15t/nextjs/postcss-tailwind3` PostCSS plugins at `c15t/postcss-tailwind3`.
It removes `styles.css` imports, because v3 components add their own
styles. With Tailwind CSS 3 or a cascade layer it keeps the import, points it
at `c15t`, and leaves a `TODO(c15t v3)` comment to set `styles: false`.

```bash
npx @c15t/cli@alpha codemods packages-to-c15t --dry-run --json
```

If `package.json` lists `@c15t/react` or `@c15t/nextjs` without `c15t` v3,
the codemod keeps the scoped imports and prints a warning. It does not edit
`package.json`.
