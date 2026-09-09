---
'@c15t/core': patch
'@c15t/react': patch
'@c15t/svelte': patch
'@c15t/vue': patch
---

The `nonce` option is applied again. It was documented but nothing read it: the React and Svelte providers now stamp it on the injected `<style id="c15t-theme">` element, and the script loader stamps it on every `<script>` it creates in every adapter, so a nonce-based Content Security Policy no longer blocks c15t's own DOM. A per-script `nonce` still takes precedence.
