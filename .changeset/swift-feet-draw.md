---
"@c15t/backend": minor
"@c15t/cli": minor
"c15t": minor
"@c15t/dev-tools": minor
"@c15t/iab": minor
"@c15t/logger": minor
"@c15t/nextjs": minor
"@c15t/node-sdk": minor
"@c15t/react": minor
"@c15t/schema": minor
"@c15t/scripts": minor
"@c15t/translations": minor
"@c15t/ui": minor
---

Expanded the script loader with a registry-backed provider system and a much
broader set of consent-aware integrations. New helpers cover analytics,
advertising pixels, functional tools, and tag managers, including Ahrefs,
Cloudflare Web Analytics, Fathom, Hotjar, Matomo, Microsoft Clarity, Mixpanel,
Plausible, PromptWatch, Rybbit, Segment, Umami, Vercel Analytics, Reddit Pixel,
Snapchat Pixel, and Crisp/Intercom.

Provider manifests now share common utilities for script URL resolution, boolean
data attributes, install-step builders, Google consent mapping, and lifecycle
execution. The package also includes registry metadata, focused provider tests,
and engine coverage so script helpers resolve predictable loader URLs,
attributes, consent callbacks, and queued vendor calls.

Google Tag and Google Tag Manager boot timestamps now resolve during script
lifecycle execution instead of helper construction, which keeps documented setup
patterns compatible with Next.js Cache Components prerendering.

PostHog now supports explicit EU/US region selection, keeps the bootstrap script
host aligned with an explicit API host, and exposes loading modes for immediate
cookieless consent sync, consent-gated loading, or disabling the helper without
issuing a PostHog network request.

Updated the docs and CLI generation prompts so these providers are discoverable
from the integration docs and script-loader setup flows.
