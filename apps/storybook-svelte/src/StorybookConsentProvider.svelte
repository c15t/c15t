<script lang="ts">
	import { ConsentManagerProvider } from '@c15t/svelte';
	import { clearConsentRuntimeCache } from 'c15t';
	import { untrack, type Snippet } from 'svelte';
	import type { ConsentManagerOptions } from '../../../packages/svelte/src/lib/types';
	import {
		type ConsentRecord,
		defaultConsentOptions,
		resetStorybookConsentState,
		seedStoredConsent,
		seedTCString,
	} from './storybook-consent-fixtures';

	const props = $props<{
		children: Snippet;
		options?: Partial<ConsentManagerOptions>;
		storedConsent?: ConsentRecord;
		tcString?: string | null;
	}>();

	const initialStoredConsent = untrack(() => props.storedConsent);
	const initialTcString = untrack(() => props.tcString ?? null);
	const mergedOptions = {
		...defaultConsentOptions,
		...(untrack(() => props.options) ?? {}),
	};

	if (typeof window !== 'undefined') {
		resetStorybookConsentState(clearConsentRuntimeCache);
		if (initialStoredConsent) {
			seedStoredConsent(initialStoredConsent);
		}
		seedTCString(initialTcString);
	}
</script>

<ConsentManagerProvider options={mergedOptions}>
	{@render props.children()}
</ConsentManagerProvider>
