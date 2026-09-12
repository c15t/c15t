---
title: Clear on revocation
description: Remove configured first-party cookies and Web Storage keys when
  their consent category is denied.
group: integrations
---
## Configure cleanup

Add `clearOnRevocation` to your provider or runtime options. Declare only the
data owned by each optional category:

```ts
import { hosted, type ClearOnRevocationConfig } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';

const clearOnRevocation = {
	measurement: {
		cookies: ['_ga', '_ga_*'],
		localStorage: ['analytics:*'],
	},
	marketing: {
		cookies: ['_fbp'],
		sessionStorage: ['campaign-id'],
	},
} satisfies ClearOnRevocationConfig;

const runtime = createConsentRuntime({
	mode: hosted({ url: '/api/c15t' }),
	clearOnRevocation,
});

// Start in the browser after mount. The endpoint must serve your c15t backend.
runtime.start();

// Call runtime.dispose() when the app no longer needs consent management.
```

For React, pass the same configuration through `ConsentProvider.options`:

```tsx
import type { ReactNode } from 'react';
import { ConsentProvider, hosted } from '@c15t/react';

const mode = hosted({ url: '/api/c15t' });

export function Consent({ children }: { children: ReactNode }) {
	return (
		<ConsentProvider
			options={{
				mode,
				clearOnRevocation: {
					measurement: { cookies: ['_ga', '_ga_*'] },
				},
			}}
		>
			{children}
		</ConsentProvider>
	);
}
```

The same option is available in Next.js and TanStack Start boundaries, Vue and
Nuxt configuration, Svelte providers, and Astro integration options. Solid and
other headless integrations can use `createConsentRuntime` as shown above.
Every adapter uses the same cleanup module.

Omitting `clearOnRevocation` leaves cleanup disabled. The provider option is
initial-only. Remount the provider to replace its cleanup configuration. For
a shared runtime, configure the runtime owner rather than a borrowing provider.

## Matching names and cookie scopes

Use an exact string or a nonempty prefix followed by `*`. `_ga_*` matches
`_ga_ABC123`; it does not match `_ga`. Regular expressions, wildcards in other
positions, and a bare `*` are unsupported. Web Storage keys may contain spaces,
Unicode, and punctuation. Cookie names use their raw spelling, without URL
decoding.

Cookies can share a name while having different domains or paths. Cleanup
tries the current host and its parent domains, and the current path and its
ancestors. To target a specific scope, use an object:

```ts
const clearOnRevocation = {
	measurement: {
		cookies: [
			{ name: 'analytics-id', domain: 'example.com', path: '/' },
			{ name: 'checkout-metrics', domain: '', path: '/checkout' },
			{ name: 'partitioned-metrics', partitioned: true },
		],
	},
};
```

An empty `domain` means host-only. Explicit domains and paths replace the
automatic attempts for that field. Exact names can be deleted at a configured
path even when the current page cannot read that cookie. Prefix matching can
only discover cookie names visible to the current page, so use an exact name
for a cookie on another path.

Partitioned cookies require `partitioned: true`; ordinary targets remove
unpartitioned cookies. Cookie deletion preserves the browser's `__Secure-`
and `__Host-` prefix requirements. c15t protects its own consent, notice,
privacy, pending-save, and IAB consent records in cookies and localStorage,
including configured custom storage keys, even if your patterns match them.
c15t does not store consent in sessionStorage, so targeted entries there are
removed even when their names match consent storage keys.

## When cleanup runs

The runtime attaches cleanup after persistence and the script loader. Cleanup
waits while the policy is pending. On the first settled snapshot, it removes
configured data for every denied category. This includes a new opt-in visitor
who has not made a choice and a returning visitor whose permission expired.

After that first pass, cleanup runs when a category changes from allowed to
denied. Saving a refusal, expiry, a policy change, Global Privacy Control,
or synchronized records can cause that transition. Under an opt-out policy,
an expired grant that remains effectively allowed does not trigger deletion.
The `necessary` category cannot be configured for cleanup.

If initialization fails, cleanup follows the settled safe fallback. Data may
be deleted before a later retry restores an allowed permission. Deletion is
not reversible.

Runtime construction, server rendering, draft checkbox edits, opening the
dialog, and disposal do not clear data. Cleanup does not poll storage or repeat
on unrelated UI updates.

## Use an existing kernel

For a manually assembled integration, attach the module in the browser after
persistence hydration and script-loader setup:

```ts
import { createClearOnRevocation } from '@c15t/core/modules/clear-on-revocation';

const cleanup = createClearOnRevocation({
	kernel,
	config: { measurement: { cookies: ['_ga', '_ga_*'] } },
	storageConfig,
});

// Stop observing consent when this integration is torn down.
cleanup.dispose();
```

Here `kernel` is your existing consent kernel. Pass the same `storageConfig`
used by persistence so cleanup protects custom record keys. Attaching the
module can immediately clear denied categories if the policy is already
settled. Do not also attach it when your provider or runtime owns cleanup.

## Browser limits

Cleanup can remove JavaScript-accessible first-party cookies and keys in the
current origin's `localStorage` and `sessionStorage`. It cannot remove
`HttpOnly` cookies or another origin's data. Keep `HttpOnly` protections and
use your server to expire cookies that require server access. Cookie deletion
must match the cookie's scope. See the
[browser cookie documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies).

Browser restrictions can prevent reads or deletions. Cleanup failures do not
block consent updates. A running SDK may write data again after a sweep, so
keep script gating and the integration's consent-change or teardown behavior
configured. Deleting a script element cannot undo JavaScript it already ran.
