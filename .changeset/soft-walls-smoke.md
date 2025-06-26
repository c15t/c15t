---
"@c15t/nextjs": patch
"@c15t/react": patch
"@c15t/cli": patch
---

refactor(react): deprecate `options` prop in favor of direct props

The `options` prop on `ConsentManagerProvider` is now deprecated. Instead of passing configuration as a nested object, spread the configuration properties directly as props:

```tsx
// Before
<ConsentManagerProvider options={{ mode: 'c15t', backendURL: '/api/c15t' }} />

// After
<ConsentManagerProvider mode="c15t" backendURL="/api/c15t" />
// or
<ConsentManagerProvider {...c15tOptions} />
```

The old `options` prop is still supported for backward compatibility but will be removed in a future version.