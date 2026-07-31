---
'@c15t/react': patch
'@c15t/ui': patch
'c15t': patch
---

Add a `nonce` option for nonce-based Content Security Policies

The injected `<style id="c15t-theme">` element previously carried no nonce, so a strict CSP blocked it unless you allowed `'unsafe-inline'`. Setting `nonce` on the provider options now applies it to that stylesheet and to every `<script>` element created by the script loader. A per-script `nonce` still takes precedence.

```tsx
<ConsentManagerProvider options={{ mode: 'offline', nonce }}>
  {children}
</ConsentManagerProvider>
```
