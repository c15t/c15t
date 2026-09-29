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
| `/docs/guides/shared-consent-controls` | `/docs/integrations/existing-cmp` | Renamed to its task, keeping another CMP; the event dispatcher moved to `/docs/integrations/overview` |
| `/docs/frameworks/next/server-side` | `/docs/frameworks/next/rendering` | Merged into the Next.js rendering decision page; the layouts live in `/docs/frameworks/next/app-router` |
| `/docs/frameworks/next/data-fetching` | `/docs/frameworks/next/rendering#choose-how-the-server-gets-the-policy` | Merged into the Next.js rendering decision page |
| `/docs/frameworks/next/script-loader` | `/docs/frameworks/next/scripts` | Merged with the network blocker into one scripts and embeds page |
| `/docs/frameworks/next/network-blocker` | `/docs/frameworks/next/scripts#block-network-requests` | Merged into the scripts and embeds page |
| `/docs/frameworks/next/styling/overview` | `/docs/frameworks/next/customize` | Renamed to match the v3 framework page set |
| `/docs/frameworks/react/script-loader` | `/docs/frameworks/react/scripts` | Merged into the React scripts and embeds page |
| `/docs/frameworks/react/network-blocker` | `/docs/frameworks/react/scripts#block-requests-an-sdk-sends-itself` | Merged into the React scripts and embeds page |
| `/docs/frameworks/react/styling/overview` | `/docs/frameworks/react/customize` | Renamed to the framework `customize` page |
| `/docs/frameworks/javascript/script-tag` | `/docs/frameworks/html/quickstart` | The script tag became the HTML framework. Its reference moved to `/docs/frameworks/html/attributes-and-api`, styling to `/customize`, gating to `/scripts`, and `#optional-iab-entry` to `/docs/frameworks/html/iab` |
| `/docs/frameworks/javascript/script-loader` | `/docs/frameworks/javascript/scripts` | Renamed to the framework page-set slug |
| `/docs/frameworks/javascript/building-ui` | `/docs/frameworks/javascript/headless` | Merged into the headless runtime guide |
| `/docs/self-host/guides/framework-integration` | `/docs/self-host/quickstart#mount-the-request-handler` | Duplicated the quickstart's mount code; per-framework mounts merged into the quickstart |
| `/docs/comparison` | `/docs/comparisons` | Duplicate of the comparisons index |
