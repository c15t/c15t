# Examples payload

- Checkout: `.` at `bce619034d5451b1058f0f847c480301a9ce096c`
- Generated: 2026-10-09T18:48:57.336Z
- Fixture backend latency: 0 ms
- Sizes in bytes. JS and CSS are first load (until network idle after load); dialog and accept are the extra JS each interaction loads.

## First load

| Example | Kind | JS gzip | JS br | JS raw | JS reqs | CSS gzip | HTML gzip | dialog JS | accept JS | emitted JS | banner ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 262487 | 226890 | 925455 | 13 | 113 | 13647 | 0 | 0 | 416274 | 24 |
| nextjs-pages-router | server | 229722 | 199778 | 774204 | 15 | 113 | 12535 | 0 | 0 | 358973 | 25 |
| nuxt | server | 172674 | 152447 | 485150 | 35 | 13224 | 10997 | 0 | 0 | 297519 | 17 |
| nuxt-static | spa | 236609 | 205302 | 715139 | 34 | 13224 | 1569 | 0 | 0 | 294107 | 74 |
| tanstack-start | server | 210270 | 180201 | 709152 | 8 | 0 | 12750 | 0 | 0 | 238335 | 14 |
| astro | server | 74539 | 65146 | 225290 | 7 | 0 | 12662 | 69322 | 0 | 233946 | 14 |
| astro-static | server | 81275 | 71062 | 241370 | 11 | 0 | 12301 | 67164 | 0 | 233946 | 34 |
| react | spa | 149645 | 127054 | 511175 | 3 | 0 | 334 | 24819 | 24819 | 186792 | 48 |
| javascript | spa | 117803 | 100047 | 413637 | 4 | 0 | 428 | 0 | 0 | 124646 | 45 |
| html | spa | 96296 | 81025 | 357667 | 1 | 0 | 511 | 0 | 770 | n/a | 46 |
| vue | spa | 199044 | 172962 | 608846 | 22 | 12380 | 635 | 0 | 0 | 253727 | 38 |
| svelte | spa | 137320 | 117956 | 485820 | 5 | 113 | 274 | 0 | 0 | 174379 | 33 |
| sveltekit | server | 150572 | 132217 | 515246 | 19 | 0 | 12856 | 0 | 0 | 186983 | 14 |

## Boundaries and requests

Boundary bytes are the gzip sizes of first-load JS assets that contain the boundary marker.

| Example | snapshotBytes | resolverBytes | offlinePolicyBytes | nonEnLocaleBytes | iabBytes | devtoolsBytes | init | manifest | cross-origin |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nextjs-pages-router | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nuxt | 0 | 82184 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| nuxt-static | 0 | 149175 | 0 | 149175 | 0 | 0 | 0 | 1 | 1 |
| tanstack-start | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| astro | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| astro-static | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| react | 144670 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| javascript | 101894 | 0 | 101894 | 0 | 0 | 0 | 1 | 0 | 1 |
| html | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| vue | 44239 | 112750 | 0 | 68511 | 0 | 0 | 0 | 0 | 0 |
| svelte | 104377 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
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
