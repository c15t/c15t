---
'@c15t/react': patch
'@c15t/nextjs': patch
'@c15t/ui': patch
---

Harden the prebuilt consent-surface branding against host-page CSS so the INTH wordmark stays correctly sized across docs, marketing sites, and other embedded app shells.

- `@c15t/react`: wrap the INTH full logo in the shared wordmark container instead of attaching the branding sizing class directly to the raw `svg`, so the stock branding path behaves consistently with the c15t wordmark.
- `@c15t/ui`: move the logo constraints onto the internal branding wrapper and the nested `svg`, adding explicit flex, max-width, block-layout, and aspect-ratio rules so global host-page `svg` styles cannot blow up or collapse the INTH mark.
- `@c15t/nextjs`: keep the published styled surface behavior aligned with the hardened React/UI branding path used by the prebuilt consent banner and dialog components.
