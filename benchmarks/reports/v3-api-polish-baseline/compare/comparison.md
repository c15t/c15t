# Benchmark Regression Report

Generated at: 2026-10-09T18:49:09.438Z

Base: b410db25f81caade4fb15cb8ba2dfef52b7b1835 | Head: bce619034d5451b1058f0f847c480301a9ce096c

## Summary

- Profile: regression | Enforcement: off | Result: fail
- Results: 13/13 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 66 passed, 20 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 86 expected
- FAIL: budget failed @c15t/examples-payload-bench:astro-static:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 18.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:astro-static:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 17.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:astro:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 15.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:javascript:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 29.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:javascript:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 23.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:javascript:examples-payload#offlinePolicyBytes: offlinePolicyBytes is 101894, above the allowance of 0
- FAIL: budget failed @c15t/examples-payload-bench:nextjs-pages-router:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 188.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:nextjs-pages-router:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 61.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:nextjs:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 117.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:nextjs:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 62.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:nuxt-static:examples-payload#nonEnLocaleBytes: nonEnLocaleBytes is 149175, above the allowance of 0
- FAIL: budget failed @c15t/examples-payload-bench:nuxt:examples-payload#resolverBytes: resolverBytes is 82184, above the allowance of 0
- FAIL: budget failed @c15t/examples-payload-bench:react:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 16.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:svelte:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 32.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:svelte:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 83.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:sveltekit:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 3.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:sveltekit:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 71.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:vue:examples-payload#initialJsGzip: initialJsGzip exceeded byte budget by 156.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:vue:examples-payload#initialJsBrotli: initialJsBrotli exceeded byte budget by 92.00 bytes
- FAIL: budget failed @c15t/examples-payload-bench:vue:examples-payload#nonEnLocaleBytes: nonEnLocaleBytes is 68511, above the allowance of 0

## @c15t/examples-payload-bench :: astro-static

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 32 | 34 | 2 | 6.25 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 67159 | 67164 | 5 | 0.007 |
| documentGzip | 12302 | 12301 | -1 | -0.008 |
| emittedClientJsGzip | 233921 | 233946 | 25 | 0.011 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 71045 | 71062 | 17 | 0.024 |
| initialJsGzip | 81257 | 81275 | 18 | 0.022 |
| initialJsRaw | 241356 | 241370 | 14 | 0.006 |
| initialJsRequests | 11 | 11 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 18.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 17.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: astro

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 14 | 14 | 0 | 0 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 69324 | 69322 | -2 | -0.003 |
| documentGzip | 12663 | 12662 | -1 | -0.008 |
| emittedClientJsGzip | 233934 | 233946 | 12 | 0.005 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 65148 | 65146 | -2 | -0.003 |
| initialJsGzip | 74524 | 74539 | 15 | 0.02 |
| initialJsRaw | 225276 | 225290 | 14 | 0.006 |
| initialJsRequests | 7 | 7 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 15.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -2.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: html

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 770 | 770 | 0 | 0 |
| bannerVisibleMs | 49 | 46 | -3 | -6.122 |
| crossOriginRequests | 2 | 2 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 511 | 511 | 0 | 0 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 81025 | 81025 | 0 | 0 |
| initialJsGzip | 96296 | 96296 | 0 | 0 |
| initialJsRaw | 357667 | 357667 | 0 | 0 |
| initialJsRequests | 1 | 1 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by 0.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by 0.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- emittedClientJsGzip not measured

## @c15t/examples-payload-bench :: javascript

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 48 | 45 | -3 | -6.25 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 428 | 428 | 0 | 0 |
| emittedClientJsGzip | 124616 | 124646 | 30 | 0.024 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 100024 | 100047 | 23 | 0.023 |
| initialJsGzip | 117774 | 117803 | 29 | 0.025 |
| initialJsRaw | 413582 | 413637 | 55 | 0.013 |
| initialJsRequests | 4 | 4 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 101866 | 101894 | 28 | 0.027 |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 101866 | 101894 | 28 | 0.027 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 29.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 23.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | no | offlinePolicyBytes is 101894, above the allowance of 0 |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nextjs-pages-router

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 15 | 25 | 10 | 66.667 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 12535 | 12535 | 0 | 0 |
| emittedClientJsGzip | 358779 | 358973 | 194 | 0.054 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 199717 | 199778 | 61 | 0.031 |
| initialJsGzip | 229534 | 229722 | 188 | 0.082 |
| initialJsRaw | 773717 | 774204 | 487 | 0.063 |
| initialJsRequests | 15 | 15 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 188.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 61.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nextjs

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 17 | 24 | 7 | 41.176 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 13651 | 13647 | -4 | -0.029 |
| emittedClientJsGzip | 416170 | 416274 | 104 | 0.025 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 226828 | 226890 | 62 | 0.027 |
| initialJsGzip | 262370 | 262487 | 117 | 0.045 |
| initialJsRaw | 925015 | 925455 | 440 | 0.048 |
| initialJsRequests | 13 | 13 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 117.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 62.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nuxt-static

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 63 | 74 | 11 | 17.46 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 1568 | 1569 | 1 | 0.064 |
| emittedClientJsGzip | 294107 | 294107 | 0 | 0 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 13224 | 13224 | 0 | 0 |
| initialJsBrotli | 205302 | 205302 | 0 | 0 |
| initialJsGzip | 236609 | 236609 | 0 | 0 |
| initialJsRaw | 715139 | 715139 | 0 | 0 |
| initialJsRequests | 34 | 34 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 1 | 1 | 0 | 0 |
| nonEnLocaleBytes | 149175 | 149175 | 0 | 0 |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 149175 | 149175 | 0 | 0 |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by 0.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by 0.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | no | nonEnLocaleBytes is 149175, above the allowance of 0 |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nuxt

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 16 | 17 | 1 | 6.25 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 10997 | 10997 | 0 | 0 |
| emittedClientJsGzip | 297519 | 297519 | 0 | 0 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 13224 | 13224 | 0 | 0 |
| initialJsBrotli | 152447 | 152447 | 0 | 0 |
| initialJsGzip | 172674 | 172674 | 0 | 0 |
| initialJsRaw | 485150 | 485150 | 0 | 0 |
| initialJsRequests | 35 | 35 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 82184 | 82184 | 0 | 0 |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by 0.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by 0.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | no | resolverBytes is 82184, above the allowance of 0 |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: react

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 24820 | 24819 | -1 | -0.004 |
| bannerVisibleMs | 42 | 48 | 6 | 14.286 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 24820 | 24819 | -1 | -0.004 |
| documentGzip | 336 | 334 | -2 | -0.595 |
| emittedClientJsGzip | 186771 | 186792 | 21 | 0.011 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 127144 | 127054 | -90 | -0.071 |
| initialJsGzip | 149629 | 149645 | 16 | 0.011 |
| initialJsRaw | 511120 | 511175 | 55 | 0.011 |
| initialJsRequests | 3 | 3 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 144656 | 144670 | 14 | 0.01 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 16.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -90.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: svelte

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 42 | 33 | -9 | -21.429 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 273 | 274 | 1 | 0.366 |
| emittedClientJsGzip | 174340 | 174379 | 39 | 0.022 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 117873 | 117956 | 83 | 0.07 |
| initialJsGzip | 137288 | 137320 | 32 | 0.023 |
| initialJsRaw | 485764 | 485820 | 56 | 0.012 |
| initialJsRequests | 5 | 5 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 104347 | 104377 | 30 | 0.029 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 32.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 83.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: sveltekit

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 21 | 14 | -7 | -33.333 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 12898 | 12856 | -42 | -0.326 |
| emittedClientJsGzip | 186980 | 186983 | 3 | 0.002 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 132146 | 132217 | 71 | 0.054 |
| initialJsGzip | 150569 | 150572 | 3 | 0.002 |
| initialJsRaw | 515245 | 515246 | 1 | 0 |
| initialJsRequests | 19 | 19 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 3.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 71.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: tanstack-start

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 13 | 14 | 1 | 7.692 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 12745 | 12750 | 5 | 0.039 |
| emittedClientJsGzip | 238529 | 238335 | -194 | -0.081 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 180454 | 180201 | -253 | -0.14 |
| initialJsGzip | 210461 | 210270 | -191 | -0.091 |
| initialJsRaw | 709987 | 709152 | -835 | -0.118 |
| initialJsRequests | 8 | 8 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -191.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -253.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: vue

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 0 | 0 | n/a |
| bannerVisibleMs | 42 | 38 | -4 | -9.524 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 636 | 635 | -1 | -0.157 |
| emittedClientJsGzip | 253571 | 253727 | 156 | 0.062 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 12380 | 12380 | 0 | 0 |
| initialJsBrotli | 172870 | 172962 | 92 | 0.053 |
| initialJsGzip | 198888 | 199044 | 156 | 0.078 |
| initialJsRaw | 608449 | 608846 | 397 | 0.065 |
| initialJsRequests | 22 | 22 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 68511 | 68511 | 0 | 0 |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 112594 | 112750 | 156 | 0.139 |
| snapshotBytes | 44083 | 44239 | 156 | 0.354 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | no | initialJsGzip exceeded byte budget by 156.00 bytes |
| initialJsBrotli | evaluated | no | initialJsBrotli exceeded byte budget by 92.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | no | nonEnLocaleBytes is 68511, above the allowance of 0 |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

