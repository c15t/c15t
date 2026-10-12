# Examples payload

- Checkout: `.` at `4add1f511db74e0bce3caa6c21376010a35dff8b-dirty`
- Generated: 2026-10-10T09:10:44.391Z
- Fixture backend latency: 0 ms
- Sizes in bytes. JS and CSS are first load (until network idle after load); dialog and accept are the extra JS each interaction loads.

## First load

| Example | Kind | JS gzip | JS br | JS raw | JS reqs | CSS gzip | HTML gzip | dialog JS | accept JS | emitted JS | banner ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 233665 | 201184 | 822395 | 9 | 113 | 13666 | 25111 | 3987 | 449467 | 15 |
| nextjs-pages-router | server | 201022 | 173905 | 670144 | 11 | 113 | 12523 | 25123 | 3987 | 392276 | 15 |
| nuxt | server | 162115 | 142593 | 458207 | 27 | 13224 | 10929 | 3909 | 3909 | 348924 | 16 |
| nuxt-static | spa | 177031 | 155406 | 506763 | 28 | 13224 | 1497 | 3909 | 3909 | 347957 | 50 |
| tanstack-start | server | 185241 | 158237 | 614666 | 5 | 0 | 12796 | 24802 | 3908 | 347106 | 14 |
| astro | server | 69278 | 60547 | 208844 | 6 | 0 | 12661 | 73608 | 3982 | 342954 | 15 |
| astro-static | server | 77158 | 67404 | 228736 | 10 | 0 | 12303 | 71156 | 3982 | 217477 | 32 |
| react | spa | 146078 | 124111 | 495936 | 6 | 0 | 396 | 24848 | 3908 | 274337 | 45 |
| javascript | spa | 96377 | 82496 | 349795 | 3 | 0 | 415 | 0 | 3982 | 198367 | 44 |
| html | spa | 96159 | 80925 | 357347 | 1 | 0 | 511 | 0 | 770 | n/a | 50 |
| vue | spa | 117856 | 103233 | 342506 | 11 | 11842 | 499 | 3908 | 3908 | 270225 | 35 |
| svelte | spa | 129101 | 110519 | 458276 | 4 | 113 | 274 | 3982 | 3982 | 261296 | 38 |
| sveltekit | server | 146387 | 128127 | 501700 | 19 | 0 | 12904 | 3909 | 3909 | 311601 | 15 |

## Boundaries and requests

Boundary bytes are the gzip sizes of first-load JS assets that contain the boundary marker.

| Example | snapshotBytes | resolverBytes | offlinePolicyBytes | nonEnLocaleBytes | iabBytes | devtoolsBytes | init | manifest | cross-origin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nextjs-pages-router | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nuxt | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nuxt-static | 92639 | 18750 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| tanstack-start | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| astro | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| astro-static | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| react | 137901 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| javascript | 84451 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| html | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| vue | 67322 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| svelte | 100121 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| sveltekit | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Notes

- **nextjs**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **nextjs-pages-router**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **nuxt**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **nuxt-static**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **tanstack-start**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **astro**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **astro-static**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **react**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **javascript**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **html**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **vue**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **svelte**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- **sveltekit**: Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
