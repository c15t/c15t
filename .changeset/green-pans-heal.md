---
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/ui': patch
---

Harden the prebuilt consent-surface branding against host-page CSS so the INTH and c15t wordmarks stay correctly sized across docs, marketing sites, and other embedded app shells.

- `@c15t/react`: wrap both prebuilt full-logo branding paths in shared internal wordmark containers instead of attaching sizing classes directly to the raw `svg` elements.
- `@c15t/ui`: move the logo constraints onto the internal branding wrappers and nested `svg` elements, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse either wordmark.
- `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.
