<script lang="ts">
	import { clearConsentRuntimeCache } from '@c15t/core';
	import { ConsentManagerProvider } from '@c15t/svelte';
	import { untrack, type Snippet } from 'svelte';

	import type { ConsentManagerOptions } from '../../../packages/svelte/src/lib/types';
	import {
		type ConsentRecord,
		defaultIABOptions,
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
	const initialTcString = untrack(
		() => props.tcString ?? 'COtybn4Otybn4AcABBENAPCgAAAAAAAAAAwAA4AuAAA'
	);
	const mergedOptions = {
		...defaultIABOptions,
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
