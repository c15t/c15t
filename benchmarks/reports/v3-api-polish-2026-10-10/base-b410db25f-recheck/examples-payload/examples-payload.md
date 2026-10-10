# Examples payload

- Checkout: `../c15t-b410-bench` at `b410db25f81caade4fb15cb8ba2dfef52b7b1835`
- Generated: 2026-10-10T09:11:51.293Z
- Fixture backend latency: 0 ms
- Sizes in bytes. JS and CSS are first load (until network idle after load); dialog and accept are the extra JS each interaction loads.

## First load

| Example | Kind | JS gzip | JS br | JS raw | JS reqs | CSS gzip | HTML gzip | dialog JS | accept JS | emitted JS | banner ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nextjs | server | 262340 | 226750 | 925021 | 13 | 113 | 13652 | 0 | 0 | 416131 | 14 |
| nextjs-pages-router | server | 229530 | 199620 | 773765 | 15 | 113 | 12537 | 0 | 0 | 358767 | 16 |
| nuxt | server | 172674 | 152447 | 485150 | 35 | 13224 | 10997 | 0 | 0 | 297519 | 15 |
| nuxt-static | spa | 236609 | 205302 | 715139 | 34 | 13224 | 1568 | 0 | 0 | 294107 | 56 |
| tanstack-start | server | 210461 | 180454 | 709987 | 8 | 0 | 12751 | 0 | 0 | 238529 | 14 |
| astro | server | 74529 | 65138 | 225282 | 7 | 0 | 12661 | 69322 | 0 | 233935 | 13 |
| astro-static | server | 81263 | 71026 | 241362 | 11 | 0 | 12301 | 67164 | 0 | 233932 | 39 |
| react | spa | 149629 | 127144 | 511120 | 3 | 0 | 336 | 24820 | 24820 | 186771 | 47 |
| javascript | spa | 117774 | 100024 | 413582 | 4 | 0 | 428 | 0 | 0 | 124616 | 47 |
| html | spa | 96296 | 81025 | 357667 | 1 | 0 | 511 | 0 | 770 | n/a | 47 |
| vue | spa | 198888 | 172870 | 608449 | 22 | 12380 | 636 | 0 | 0 | 253571 | 40 |
| svelte | spa | 137293 | 117776 | 485765 | 5 | 113 | 274 | 0 | 0 | 174350 | 34 |
| sveltekit | server | 150573 | 132180 | 515246 | 19 | 0 | 12900 | 0 | 0 | 186984 | 14 |

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
| react | 144656 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| javascript | 101866 | 0 | 101866 | 0 | 0 | 0 | 1 | 0 | 1 |
| html | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 |
| vue | 44083 | 112594 | 0 | 68511 | 0 | 0 | 0 | 0 | 0 |
| svelte | 104352 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
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
