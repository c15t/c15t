# @c15t/embed

`@c15t/embed` is the browser runtime for script-tag integrations.

It reads `window.__c15tEmbedPayload` and mounts React-parity c15t UI
(`ConsentManagerProvider`, `ConsentBanner`, `ConsentDialog`) in the page.

## Usage

```ts
import '@c15t/embed';
```

The runtime auto-initializes in the browser and listens for embed payload updates.
