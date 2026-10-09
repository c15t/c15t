---
packages:
  '@c15t/cli': patch
---

### Keep the app's own `ConsentProvider` working after `consent-provider-options`

When a file declares its own `ConsentProvider`, such as a wrapper around
`ConsentManagerProvider`, the codemod now imports
`ConsentProvider as ConsentManagerProvider` and leaves the JSX alone. It used
to import `ConsentProvider` over the wrapper's name, so the wrapper rendered
itself.
