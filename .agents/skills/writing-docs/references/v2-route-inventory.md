# V2 routes absent from the v3 tree

Inventory from `origin/main`, 10 September 2026. Shared include files are excluded.
These routes remain absent after restoring the v3 integration and backend guides; this file
does not configure redirects. Existing routes retained by the rewrite are not listed.

Do not redirect all missing topics to the homepage or a generic overview. For
routes with a comparison target, review the old task against the destination
before selecting a permanent redirect. Migration pages explain changed contracts
but do not replace a versioned v2 reference. For the remaining routes, retain
access to the v2 documentation or write the missing v3 task before retiring it.
The private host owns version routing, canonical URLs and redirect status codes.

96 old public MDX paths need a publication decision.

| Old route | Publication decision |
| --- | --- |
| `/docs/ai-agents` | Compare with `/docs` before redirecting |
| `/docs/cli/commands/auth` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/cli/commands/codemods` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/cli/commands/generate` | Compare with `/docs/cli/commands/setup` before redirecting |
| `/docs/cli/commands/self-host` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/cli/commands/skills` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/cli/telemetry` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/contributing/docs-preview-action` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/contributing/documentation-setup` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/javascript/api/checking-consent` | Compare with `/docs/frameworks/javascript/api/overview` before redirecting |
| `/docs/frameworks/javascript/api/location-info` | Compare with `/docs/frameworks/javascript/api/overview` before redirecting |
| `/docs/frameworks/javascript/api/setting-consent` | Compare with `/docs/frameworks/javascript/api/overview` before redirecting |
| `/docs/frameworks/javascript/callbacks` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/javascript/concepts/client-modes` | Compare with `/docs/guides/deployment-modes` before redirecting |
| `/docs/frameworks/javascript/concepts/consent-models` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/javascript/concepts/cookie-management` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/javascript/concepts/glossary` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/javascript/concepts/initialization-flow` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/javascript/concepts/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/javascript/iframe-blocking` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/javascript/internationalization` | Compare with `/docs/customization/translations` before redirecting |
| `/docs/frameworks/javascript/network-blocker` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/javascript/optimization` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/javascript/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/next/building-headless-components` | Compare with `/docs/frameworks/next/headless` before redirecting |
| `/docs/frameworks/next/callbacks` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/next/components/consent-dialog-link` | Compare with `/docs/frameworks/next/components/consent-dialog-trigger` before redirecting |
| `/docs/frameworks/next/components/consent-dialog` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/components/consent-widget` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/components/frame` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/concepts/client-modes` | Compare with `/docs/guides/deployment-modes` before redirecting |
| `/docs/frameworks/next/concepts/consent-models` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/next/concepts/cookie-management` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/next/concepts/glossary` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/concepts/initialization-flow` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/next/concepts/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/next/hooks/use-color-scheme` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-consent-manager/checking-consent` | Compare with `/docs/frameworks/next/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/next/hooks/use-consent-manager/location-info` | Compare with `/docs/frameworks/next/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/next/hooks/use-consent-manager/setting-consent` | Compare with `/docs/frameworks/next/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/next/hooks/use-draggable` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-focus-trap` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-reduced-motion` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-ssr-status` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-text-direction` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/hooks/use-translations` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/iab/consent-banner` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/iab/consent-dialog` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/iab/use-gvl-data` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/iframe-blocking` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/internationalization` | Compare with `/docs/customization/translations` before redirecting |
| `/docs/frameworks/next/network-blocker` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/next/styling/classnames` | Compare with `/docs/customization/slots` before redirecting |
| `/docs/frameworks/next/styling/color-scheme` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/next/styling/css-variables` | Compare with `/docs/customization/tokens` before redirecting |
| `/docs/frameworks/next/styling/slots` | Compare with `/docs/customization/slots` before redirecting |
| `/docs/frameworks/next/styling/tailwind` | Compare with `/docs/customization/tokens` before redirecting |
| `/docs/frameworks/next/styling/tokens` | Compare with `/docs/customization/tokens` before redirecting |
| `/docs/frameworks/react/building-headless-components` | Compare with `/docs/frameworks/react/headless` before redirecting |
| `/docs/frameworks/react/callbacks` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/react/components/consent-dialog-link` | Compare with `/docs/frameworks/react/components/consent-dialog-trigger` before redirecting |
| `/docs/frameworks/react/components/consent-dialog` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/components/consent-widget` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/components/frame` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/concepts/client-modes` | Compare with `/docs/guides/deployment-modes` before redirecting |
| `/docs/frameworks/react/concepts/consent-models` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/react/concepts/cookie-management` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/react/concepts/glossary` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/concepts/initialization-flow` | Compare with `/docs/guides/consent-state` before redirecting |
| `/docs/frameworks/react/concepts/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/react/hooks/use-color-scheme` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-consent-manager/checking-consent` | Compare with `/docs/frameworks/react/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/react/hooks/use-consent-manager/location-info` | Compare with `/docs/frameworks/react/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/react/hooks/use-consent-manager/setting-consent` | Compare with `/docs/frameworks/react/hooks/use-consent-manager/overview` before redirecting |
| `/docs/frameworks/react/hooks/use-draggable` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-focus-trap` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-reduced-motion` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-ssr-status` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-text-direction` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/hooks/use-translations` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/iab/consent-banner` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/iab/consent-dialog` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/iab/use-gvl-data` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/iframe-blocking` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/internationalization` | Compare with `/docs/customization/translations` before redirecting |
| `/docs/frameworks/react/network-blocker` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/optimization` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/policy-packs` | Compare with `/docs/upgrade-v3` before redirecting |
| `/docs/frameworks/react/server-side` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/styling/classnames` | Compare with `/docs/customization/slots` before redirecting |
| `/docs/frameworks/react/styling/color-scheme` | Keep in a v2 archive or restore a dedicated v3 page; no equivalent verified |
| `/docs/frameworks/react/styling/css-variables` | Compare with `/docs/customization/tokens` before redirecting |
| `/docs/frameworks/react/styling/slots` | Compare with `/docs/customization/slots` before redirecting |
| `/docs/frameworks/react/styling/tailwind` | Compare with `/docs/customization/tokens` before redirecting |
| `/docs/frameworks/react/styling/tokens` | Compare with `/docs/customization/tokens` before redirecting |
