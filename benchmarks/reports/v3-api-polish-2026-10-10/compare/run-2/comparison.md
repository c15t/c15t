# Benchmark Regression Report

Generated at: 2026-10-10T09:12:16.769Z

Base: b410db25f81caade4fb15cb8ba2dfef52b7b1835 | Head: 4add1f511db74e0bce3caa6c21376010a35dff8b-dirty

## Summary

- Profile: regression | Enforcement: off | Result: fail
- Results: 13/13 expected results compared; missing head 0; missing base 0; unexpected 0
- Budgets: 85 passed, 1 failed, 0 missing head metric, 0 missing base metric, 0 unevaluated (arm), 0 missing definitions, 0 definition mismatches of 86 expected
- FAIL: budget failed @c15t/examples-payload-bench:vue:examples-payload#crossOriginRequests: crossOriginRequests exceeded byte budget by 1.00 bytes

## @c15t/examples-payload-bench :: astro-static

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3982 | 3982 | n/a |
| bannerVisibleMs | 32 | 32 | 0 | 0 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 67159 | 71156 | 3997 | 5.952 |
| documentGzip | 12302 | 12303 | 1 | 0.008 |
| emittedClientJsGzip | 233921 | 217477 | -16444 | -7.03 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 71045 | 67404 | -3641 | -5.125 |
| initialJsGzip | 81257 | 77158 | -4099 | -5.044 |
| initialJsRaw | 241356 | 228736 | -12620 | -5.229 |
| initialJsRequests | 11 | 10 | -1 | -9.091 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -4099.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -3641.00 bytes |
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
| acceptJsGzip | 0 | 3982 | 3982 | n/a |
| bannerVisibleMs | 14 | 15 | 1 | 7.143 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 69324 | 73608 | 4284 | 6.18 |
| documentGzip | 12663 | 12661 | -2 | -0.016 |
| emittedClientJsGzip | 233934 | 342954 | 109020 | 46.603 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 65148 | 60547 | -4601 | -7.062 |
| initialJsGzip | 74524 | 69278 | -5246 | -7.039 |
| initialJsRaw | 225276 | 208844 | -16432 | -7.294 |
| initialJsRequests | 7 | 6 | -1 | -14.286 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -5246.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -4601.00 bytes |
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
| bannerVisibleMs | 49 | 50 | 1 | 2.041 |
| crossOriginRequests | 2 | 2 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 511 | 511 | 0 | 0 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 81025 | 80925 | -100 | -0.123 |
| initialJsGzip | 96296 | 96159 | -137 | -0.142 |
| initialJsRaw | 357667 | 357347 | -320 | -0.089 |
| initialJsRequests | 1 | 1 | 0 | 0 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -137.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -100.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js
- emittedClientJsGzip not measured

## @c15t/examples-payload-bench :: javascript

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3982 | 3982 | n/a |
| bannerVisibleMs | 48 | 44 | -4 | -8.333 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 0 | 0 | n/a |
| documentGzip | 428 | 415 | -13 | -3.037 |
| emittedClientJsGzip | 124616 | 198367 | 73751 | 59.183 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 100024 | 82496 | -17528 | -17.524 |
| initialJsGzip | 117774 | 96377 | -21397 | -18.168 |
| initialJsRaw | 413582 | 349795 | -63787 | -15.423 |
| initialJsRequests | 4 | 3 | -1 | -25 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 101866 | 0 | -101866 | -100 |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 101866 | 84451 | -17415 | -17.096 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -21397.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -17528.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nextjs-pages-router

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3987 | 3987 | n/a |
| bannerVisibleMs | 15 | 15 | 0 | 0 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 25123 | 25123 | n/a |
| documentGzip | 12535 | 12523 | -12 | -0.096 |
| emittedClientJsGzip | 358779 | 392276 | 33497 | 9.336 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 199717 | 173905 | -25812 | -12.924 |
| initialJsGzip | 229534 | 201022 | -28512 | -12.422 |
| initialJsRaw | 773717 | 670144 | -103573 | -13.386 |
| initialJsRequests | 15 | 11 | -4 | -26.667 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -28512.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -25812.00 bytes |
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
| acceptJsGzip | 0 | 3987 | 3987 | n/a |
| bannerVisibleMs | 17 | 15 | -2 | -11.765 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 25111 | 25111 | n/a |
| documentGzip | 13651 | 13666 | 15 | 0.11 |
| emittedClientJsGzip | 416170 | 449467 | 33297 | 8.001 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 226828 | 201184 | -25644 | -11.305 |
| initialJsGzip | 262370 | 233665 | -28705 | -10.941 |
| initialJsRaw | 925015 | 822395 | -102620 | -11.094 |
| initialJsRequests | 13 | 9 | -4 | -30.769 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -28705.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -25644.00 bytes |
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
| acceptJsGzip | 0 | 3909 | 3909 | n/a |
| bannerVisibleMs | 63 | 50 | -13 | -20.635 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 3909 | 3909 | n/a |
| documentGzip | 1568 | 1497 | -71 | -4.528 |
| emittedClientJsGzip | 294107 | 347957 | 53850 | 18.31 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 13224 | 13224 | 0 | 0 |
| initialJsBrotli | 205302 | 155406 | -49896 | -24.304 |
| initialJsGzip | 236609 | 177031 | -59578 | -25.18 |
| initialJsRaw | 715139 | 506763 | -208376 | -29.138 |
| initialJsRequests | 34 | 28 | -6 | -17.647 |
| initRequests | 0 | 1 | 1 | n/a |
| manifestRequests | 1 | 0 | -1 | -100 |
| nonEnLocaleBytes | 149175 | 0 | -149175 | -100 |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 149175 | 18750 | -130425 | -87.431 |
| snapshotBytes | 0 | 92639 | 92639 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -59578.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -49896.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: nuxt

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3909 | 3909 | n/a |
| bannerVisibleMs | 16 | 16 | 0 | 0 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 3909 | 3909 | n/a |
| documentGzip | 10997 | 10929 | -68 | -0.618 |
| emittedClientJsGzip | 297519 | 348924 | 51405 | 17.278 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 13224 | 13224 | 0 | 0 |
| initialJsBrotli | 152447 | 142593 | -9854 | -6.464 |
| initialJsGzip | 172674 | 162115 | -10559 | -6.115 |
| initialJsRaw | 485150 | 458207 | -26943 | -5.554 |
| initialJsRequests | 35 | 27 | -8 | -22.857 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 82184 | 0 | -82184 | -100 |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -10559.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -9854.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |
| snapshotBytes | evaluated | yes | snapshotBytes is 0 (allowance 0) |
| resolverBytes | evaluated | yes | resolverBytes is 0 (allowance 0) |
| manifestRequests | evaluated | yes | manifestRequests is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: react

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 24820 | 3908 | -20912 | -84.255 |
| bannerVisibleMs | 42 | 45 | 3 | 7.143 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 24820 | 24848 | 28 | 0.113 |
| documentGzip | 336 | 396 | 60 | 17.857 |
| emittedClientJsGzip | 186771 | 274337 | 87566 | 46.884 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 127144 | 124111 | -3033 | -2.385 |
| initialJsGzip | 149629 | 146078 | -3551 | -2.373 |
| initialJsRaw | 511120 | 495936 | -15184 | -2.971 |
| initialJsRequests | 3 | 6 | 3 | 100 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 144656 | 137901 | -6755 | -4.67 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -3551.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -3033.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: svelte

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3982 | 3982 | n/a |
| bannerVisibleMs | 42 | 38 | -4 | -9.524 |
| crossOriginRequests | 1 | 1 | 0 | 0 |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 3982 | 3982 | n/a |
| documentGzip | 273 | 274 | 1 | 0.366 |
| emittedClientJsGzip | 174340 | 261296 | 86956 | 49.877 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 113 | 113 | 0 | 0 |
| initialJsBrotli | 117873 | 110519 | -7354 | -6.239 |
| initialJsGzip | 137288 | 129101 | -8187 | -5.963 |
| initialJsRaw | 485764 | 458276 | -27488 | -5.659 |
| initialJsRequests | 5 | 4 | -1 | -20 |
| initRequests | 1 | 1 | 0 | 0 |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 104347 | 100121 | -4226 | -4.05 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -8187.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -7354.00 bytes |
| crossOriginRequests | evaluated | yes | crossOriginRequests increased by 0.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

## @c15t/examples-payload-bench :: sveltekit

| Metric | Base Median | Head Median | Delta | Delta % |
| --- | ---: | ---: | ---: | ---: |
| acceptJsGzip | 0 | 3909 | 3909 | n/a |
| bannerVisibleMs | 21 | 15 | -6 | -28.571 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 3909 | 3909 | n/a |
| documentGzip | 12898 | 12904 | 6 | 0.047 |
| emittedClientJsGzip | 186980 | 311601 | 124621 | 66.649 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 132146 | 128127 | -4019 | -3.041 |
| initialJsGzip | 150569 | 146387 | -4182 | -2.777 |
| initialJsRaw | 515245 | 501700 | -13545 | -2.629 |
| initialJsRequests | 19 | 19 | 0 | 0 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -4182.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -4019.00 bytes |
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
| acceptJsGzip | 0 | 3908 | 3908 | n/a |
| bannerVisibleMs | 13 | 14 | 1 | 7.692 |
| crossOriginRequests | 0 | 0 | 0 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 24802 | 24802 | n/a |
| documentGzip | 12745 | 12796 | 51 | 0.4 |
| emittedClientJsGzip | 238529 | 347106 | 108577 | 45.519 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 0 | 0 | 0 | n/a |
| initialJsBrotli | 180454 | 158237 | -22217 | -12.312 |
| initialJsGzip | 210461 | 185241 | -25220 | -11.983 |
| initialJsRaw | 709987 | 614666 | -95321 | -13.426 |
| initialJsRequests | 8 | 5 | -3 | -37.5 |
| initRequests | 0 | 0 | 0 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 0 | 0 | 0 | n/a |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 0 | 0 | 0 | n/a |
| snapshotBytes | 0 | 0 | 0 | n/a |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -25220.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -22217.00 bytes |
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
| acceptJsGzip | 0 | 3908 | 3908 | n/a |
| bannerVisibleMs | 42 | 35 | -7 | -16.667 |
| crossOriginRequests | 0 | 1 | 1 | n/a |
| devtoolsBytes | 0 | 0 | 0 | n/a |
| dialogJsGzip | 0 | 3908 | 3908 | n/a |
| documentGzip | 636 | 499 | -137 | -21.541 |
| emittedClientJsGzip | 253571 | 270225 | 16654 | 6.568 |
| iabBytes | 0 | 0 | 0 | n/a |
| initialCssGzip | 12380 | 11842 | -538 | -4.346 |
| initialJsBrotli | 172870 | 103233 | -69637 | -40.283 |
| initialJsGzip | 198888 | 117856 | -81032 | -40.743 |
| initialJsRaw | 608449 | 342506 | -265943 | -43.708 |
| initialJsRequests | 22 | 11 | -11 | -50 |
| initRequests | 0 | 1 | 1 | n/a |
| manifestRequests | 0 | 0 | 0 | n/a |
| nonEnLocaleBytes | 68511 | 0 | -68511 | -100 |
| offlinePolicyBytes | 0 | 0 | 0 | n/a |
| resolverBytes | 112594 | 0 | -112594 | -100 |
| snapshotBytes | 44083 | 67322 | 23239 | 52.716 |

| Budget | Status | Pass | Message |
| --- | --- | --- | --- |
| initialJsGzip | evaluated | yes | initialJsGzip increased by -81032.00 bytes |
| initialJsBrotli | evaluated | yes | initialJsBrotli increased by -69637.00 bytes |
| crossOriginRequests | evaluated | no | crossOriginRequests exceeded byte budget by 1.00 bytes |
| offlinePolicyBytes | evaluated | yes | offlinePolicyBytes is 0 (allowance 0) |
| nonEnLocaleBytes | evaluated | yes | nonEnLocaleBytes is 0 (allowance 0) |

Notes:
- Blocked internet requests: https://eu-assets.i.posthog.com/static/array.js

