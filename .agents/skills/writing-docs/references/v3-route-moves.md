# V3 route moves

Routes moved or merged during the v3 docs rewrite. The docs host owns the
redirects; add each row there with a permanent redirect. Unlike
[v2-route-inventory.md](v2-route-inventory.md), every destination here covers
the old page's task.

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
| `/docs/frameworks/next/styling/tailwind` | `/docs/customization/overview` | v2 styling route; no customization page covers Tailwind yet, so send it to the overview |
| `/docs/frameworks/next/styling/color-scheme` | `/docs/customization/overview` | v2 styling route; no customization page covers dark mode yet, so send it to the overview |
| `/docs/frameworks/react/styling/overview` | `/docs/customization/overview` | v2 styling route; customization is shared across frameworks |
| `/docs/frameworks/react/styling/tokens` | `/docs/customization/tokens` | v2 styling route |
| `/docs/frameworks/react/styling/css-variables` | `/docs/customization/tokens` | v2 styling route; CSS variables are theme tokens |
| `/docs/frameworks/react/styling/slots` | `/docs/customization/slots` | v2 styling route |
| `/docs/frameworks/react/styling/classnames` | `/docs/customization/slots` | v2 styling route; class names attach to component parts |
| `/docs/frameworks/react/styling/tailwind` | `/docs/customization/overview` | v2 styling route; no customization page covers Tailwind yet, so send it to the overview |
| `/docs/frameworks/react/styling/color-scheme` | `/docs/customization/overview` | v2 styling route; no customization page covers dark mode yet, so send it to the overview |
| `/docs/frameworks/react/optimization` | `/docs/frameworks/react/rendering` | v2 route; rendering covers loading and performance choices |
| `/docs/frameworks/next/iframe-blocking` | `/docs/frameworks/next/embeds` | v2 route; the embeds page covers the iframe blocker |
| `/docs/frameworks/react/iframe-blocking` | `/docs/frameworks/react/embeds` | v2 route; the embeds page covers the iframe blocker |
| `/docs/frameworks/javascript/iframe-blocking` | `/docs/frameworks/javascript/modules/iframe-blocker` | v2 route |
| `/docs/frameworks/javascript/network-blocker` | `/docs/frameworks/javascript/modules/network-blocker` | v2 route |
