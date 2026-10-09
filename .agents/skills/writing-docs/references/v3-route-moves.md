# V3 route moves

Routes moved or merged during the v3 docs rewrite. The docs host owns the
redirects; add each row there with a permanent redirect. Every destination
here covers the old page's task.

| Old route | New route | Reason |
| --- | --- | --- |
| `/docs/guides/consent-state` | `/docs/concepts/consent-state` | Reference split; the permission and choice model moved to `/docs/concepts/how-consent-works` |
| `/docs/guides/data-fetching` | `/docs/concepts/data-fetching` | Moved to Concepts |
| `/docs/guides/deployment-modes` | `/docs/concepts/choose-your-setup` | Merged into the setup decision page |
| `/docs/frameworks/next/concepts/consent-categories` | `/docs/concepts/consent-categories` | Identical per-framework copies merged |
| `/docs/frameworks/react/concepts/consent-categories` | `/docs/concepts/consent-categories` | Identical per-framework copies merged |
| `/docs/frameworks/javascript/concepts/consent-categories` | `/docs/concepts/consent-categories` | Identical per-framework copies merged |
| `/docs/frameworks/next/concepts/policy-presets` | `/docs/concepts/policies` | Merged; the policy diagnostic moved to `/docs/frameworks/next/troubleshooting` |
| `/docs/frameworks/react/concepts/policy-presets` | `/docs/concepts/policies` | Merged; the policy diagnostic moved to `/docs/frameworks/react/troubleshooting` |
| `/docs/frameworks/javascript/concepts/policy-presets` | `/docs/concepts/policies` | Merged; the policy diagnostic moved to `/docs/frameworks/javascript/troubleshooting` |
| `/docs/frameworks/next/server-side` | `/docs/frameworks/next/rendering` | Merged into the Next.js rendering decision page; the layouts live in `/docs/frameworks/next/app-router` |
| `/docs/frameworks/next/data-fetching` | `/docs/frameworks/next/rendering#choose-how-the-server-gets-the-policy` | Merged into the Next.js rendering decision page |
| `/docs/frameworks/next/script-loader` | `/docs/frameworks/next/scripts` | Merged with the network blocker into one scripts and embeds page |
| `/docs/frameworks/react/script-loader` | `/docs/frameworks/react/scripts` | Merged into the React scripts and embeds page |
| `/docs/frameworks/javascript/script-tag` | `/docs/frameworks/html/quickstart` | The script tag became the HTML framework. Its reference moved to `/docs/frameworks/html/attributes-and-api`, styling to `/customize`, gating to `/scripts`, and `#optional-iab-entry` to `/docs/frameworks/html/iab` |
| `/docs/frameworks/javascript/script-loader` | `/docs/frameworks/javascript/scripts` | Renamed to the framework page-set slug |
| `/docs/frameworks/javascript/building-ui` | `/docs/frameworks/javascript/headless` | Merged into the headless runtime guide |
| `/docs/self-host/guides/framework-integration` | `/docs/self-host/quickstart#mount-the-request-handler` | Duplicated the quickstart's mount code; per-framework mounts merged into the quickstart |
| `/docs/comparison` | `/docs/comparisons` | Duplicate of the comparisons index |
| `/docs/frameworks/next/api-reference/data-fetching` | `/docs/frameworks/next/data-fetching-reference` | Flattened into the Next.js Advanced group; `/docs/frameworks/next/data-fetching` already redirects to the rendering page |
| `/docs/frameworks/next/hooks/overview` | `/docs/frameworks/next/hooks` | Single page, no index folder |
| `/docs/frameworks/react/hooks/overview` | `/docs/frameworks/react/hooks` | Single page, no index folder |
| `/docs/frameworks/next/iab/overview` | `/docs/frameworks/next/iab` | Single page, no index folder |
| `/docs/frameworks/react/iab/overview` | `/docs/frameworks/react/iab` | Single page, no index folder |
| `/docs/frameworks/javascript/iab/overview` | `/docs/frameworks/javascript/iab` | Single page, no index folder |
| `/docs/frameworks/javascript/api/overview` | `/docs/frameworks/javascript/api/kernel` | Named after its subject, the consent kernel |
| `/docs/frameworks/next/components/consent-manager-provider` | `/docs/frameworks/next/components/consent-root` | Named after the v3 component, `ConsentRoot` |
| `/docs/frameworks/react/components/consent-manager-provider` | `/docs/frameworks/react/components/consent-provider` | Named after the v3 component, `ConsentProvider` |
| `/docs/frameworks/next/scripts#gate-an-iframe-or-widget` | `/docs/frameworks/next/embeds` | Split into its own page; anchor links cannot redirect server-side |
| `/docs/frameworks/next/scripts#block-network-requests` | `/docs/frameworks/next/network-blocker` | Split into its own page; the route is live again, so drop any old `/docs/frameworks/next/network-blocker` redirect |
| `/docs/frameworks/react/scripts#gate-an-iframe-or-widget` | `/docs/frameworks/react/embeds` | Split into its own page |
| `/docs/frameworks/react/scripts#block-requests-an-sdk-sends-itself` | `/docs/frameworks/react/network-blocker` | Split into its own page; the route is live again, so drop any old `/docs/frameworks/react/network-blocker` redirect |
| `/docs/frameworks/tanstack-start/scripts#gate-an-iframe-or-widget` | `/docs/frameworks/tanstack-start/embeds` | Split into its own page |
| `/docs/frameworks/tanstack-start/scripts#block-requests-an-sdk-sends-itself` | `/docs/frameworks/tanstack-start/network-blocker` | Split into its own page |
| `/docs/frameworks/next/styling/overview` | `/docs/customization/overview` | v2 styling route; customization is shared across frameworks |
| `/docs/frameworks/next/styling/tokens` | `/docs/customization/tokens` | v2 styling route |
| `/docs/frameworks/next/styling/css-variables` | `/docs/customization/tokens` | v2 styling route; CSS variables are theme tokens |
| `/docs/frameworks/next/styling/slots` | `/docs/customization/slots` | v2 styling route |
| `/docs/frameworks/next/styling/classnames` | `/docs/customization/slots` | v2 styling route; class names attach to component parts |
| `/docs/frameworks/next/styling/tailwind` | `/docs/customization/tailwind` | v2 styling route |
| `/docs/frameworks/next/styling/color-scheme` | `/docs/customization/dark-mode` | v2 styling route; the dark mode page covers the color scheme |
| `/docs/frameworks/react/styling/overview` | `/docs/customization/overview` | v2 styling route; customization is shared across frameworks |
| `/docs/frameworks/react/styling/tokens` | `/docs/customization/tokens` | v2 styling route |
| `/docs/frameworks/react/styling/css-variables` | `/docs/customization/tokens` | v2 styling route; CSS variables are theme tokens |
| `/docs/frameworks/react/styling/slots` | `/docs/customization/slots` | v2 styling route |
| `/docs/frameworks/react/styling/classnames` | `/docs/customization/slots` | v2 styling route; class names attach to component parts |
| `/docs/frameworks/react/styling/tailwind` | `/docs/customization/tailwind` | v2 styling route |
| `/docs/frameworks/react/styling/color-scheme` | `/docs/customization/dark-mode` | v2 styling route; the dark mode page covers the color scheme |
| `/docs/frameworks/react/optimization` | `/docs/frameworks/react/rendering` | v2 route; rendering covers loading and performance choices |
| `/docs/frameworks/next/iframe-blocking` | `/docs/frameworks/next/embeds` | v2 route; the embeds page covers the iframe blocker |
| `/docs/frameworks/react/iframe-blocking` | `/docs/frameworks/react/embeds` | v2 route; the embeds page covers the iframe blocker |
| `/docs/frameworks/javascript/iframe-blocking` | `/docs/frameworks/javascript/modules/iframe-blocker` | v2 route |
| `/docs/frameworks/javascript/network-blocker` | `/docs/frameworks/javascript/modules/network-blocker` | v2 route |
| `/docs/integrations/granular-consent` | `/docs/frameworks/next/vendor-consent` | Became a framework page. Every framework that lists vendors has one: `next`, `tanstack-start`, `react`, `nuxt`, `vue`, `svelte`, `sveltekit` and `javascript` |
| `/docs/integrations/clear-on-revocation` | `/docs/frameworks/next/clear-on-revocation` | Became a framework page. Every framework has one at `/docs/frameworks/<framework>/clear-on-revocation` |
| `/docs/frameworks/javascript/modules/clear-on-revocation` | `/docs/frameworks/javascript/clear-on-revocation` | Merged with the option guide so JavaScript has one clear on revocation page, at the same slug as every other framework |

## Removed routes

These pages were removed, not moved, so no page covers their whole task.
Redirect each route to the closest page that remains.

The guide to running c15t beside another consent platform was removed, along
with the v2 shared consent controls page it replaced. The integrations
overview keeps the event controls.

| Old route | Redirect to | Reason |
| --- | --- | --- |
| `/docs/guides/shared-consent-controls` | `/docs/integrations/overview` | Removed with the existing-CMP guide; the overview covers sending events only to allowed integrations |
| `/docs/integrations/existing-cmp` | `/docs/integrations/overview` | Removed |

React Native is not published with v3, so its pages were removed, not moved.
No page covers their task. Redirect each route to `/docs/frameworks` so old
links land on the framework list. Do not mention React Native, Expo or
`@c15t/react-native` in the published docs until the package ships.

| Old route | Redirect to | Reason |
| --- | --- | --- |
| `/docs/frameworks/react-native` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/quickstart` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/usage` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/configuration` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/native-behaviour` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/platform-support` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/frameworks/react-native/troubleshooting` | `/docs/frameworks` | Removed, not published in v3 |
| `/docs/upgrade-v3` | `/changelog/3.0.0#upgrading` | Split up. Client steps live in the Next.js, React and JavaScript upgrade guides; the backend and Node.js SDK steps moved to `/docs/self-host/upgrade-v3`. Old `#upgrade-a-self-hosted-backend` and `#update-the-nodejs-sdk` anchors cannot redirect server-side |
