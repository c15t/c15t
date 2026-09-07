---
'c15t': minor
'@c15t/react': minor
'@c15t/nextjs': minor
'@c15t/ui': minor
'@c15t/vue': minor
'@c15t/svelte': minor
'@c15t/astro': minor
---

Consent banners now come in four shapes, chosen without changing the policy.
Set `presentation.prompt.variant` on the provider, or `variant` on the
banner, to `floating` (a corner card), `bar` (full-width edge bar), `widget`
(a compact chip), or `wall` (a centered card over a backdrop). Each variant
has its own `position` values, and `blocking` bundles the backdrop, scroll
lock, focus trap, and no outside dismissal into one setting.

Defaults follow the prompt: a notice renders as a bottom bar, a choice prompt
as a floating card at the bottom left, and a wall is always blocking while a
notice never is. A defaulted corner mirrors for right-to-left languages; a
position you set stays put. Invalid combinations fall back to the variant
default and log `invalid-position`, `blocking-forbidden`, or
`blocking-required` in development.

Every adapter emits `data-variant`, `data-position`, and `data-blocking` on
the banner root next to `data-prompt` and `data-model`, and the stylesheet
keys each variant's geometry on them. `@c15t/ui` adds
`--consent-banner-widget-max-width` and `--consent-banner-wall-max-width`.

React exposes `variant`, `position`, and `blocking` props on `ConsentBanner`
and `ConsentBanner.Root`, `useConsentBannerSurface()` for compound parts, and
re-exports `PromptVariant` and `PromptPosition`. Vue and Svelte take the same
three props; Vue's `useConsentPolicyActions` returns `variant`, `position`,
`positionSource`, and `blocking`. The Next.js server shell and Astro render
the same attributes and the overlay before hydration.

Vue's `bannerPosition` config is deprecated. It still works and maps to
`presentation.prompt.position`; move to `presentation` to pick a variant.
