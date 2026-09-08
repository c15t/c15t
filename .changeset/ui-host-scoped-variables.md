---
'@c15t/ui': patch
---

Pair every `:root` selector in the published stylesheets with `:host`, so the theme tokens and each component's variables also apply when the UI renders inside a shadow root. `:host` matches nothing in the light DOM, so framework hosts render exactly as before.
