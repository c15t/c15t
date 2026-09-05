import type { InitOutput } from '@c15t/schema/types';
import type { App } from 'vue';
import { onUnmounted, provide } from 'vue';

import {
	resolvePolicyRules,
	writePolicyResolutionWire,
} from '../../../packages/schema/src/types';
import { enTranslations } from '../../../packages/translations/src';
import { consentConfigKey } from '../../../packages/vue/src/runtime/composables/config';
import type { ConsentConfig } from '../../../packages/vue/src/runtime/config';
import { createVueConsentKernelContext } from '../../../packages/vue/src/runtime/kernel';
import type { VueConsentKernelContext } from '../../../packages/vue/src/runtime/kernel';
import {
	symbolActiveUI,
	symbolConsent,
	symbolInit,
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../../../packages/vue/src/runtime/utils/symbols';
import {
	storybookPolicy,
	storybookPresentation,
} from '../../storybook-consent-policy';

type StoryActiveUI = 'banner' | 'manager' | null;

export const storybookInit: InitOutput = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	policyResolution: writePolicyResolutionWire(
		resolvePolicyRules({
			countryCode: 'DE',
			regionCode: null,
			rules: [storybookPolicy],
		})
	),
	translations: {
		language: 'en',
		translations: enTranslations,
	},
};

const storybookFetch = function storybookFetch(): typeof fetch {
	return ((input: RequestInfo | URL, request?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/init')) {
			return new Response(JSON.stringify(storybookInit), {
				headers: {
					'content-type': 'application/json',
					'x-c15t-policy-contract': '1',
				},
				status: 200,
			});
		}
		if (url.endsWith('/subjects')) {
			const body = JSON.parse(String(request?.body ?? '{}')) as {
				subjectId?: string;
			};
			return new Response(
				JSON.stringify({ ok: true, subjectId: body.subjectId }),
				{
					headers: {
						'content-type': 'application/json',
						'x-c15t-policy-contract': '1',
					},
					status: 200,
				}
			);
		}
		return new Response('not found', { status: 404 });
	}) as typeof fetch;
};

export const storybookConsentConfig: ConsentConfig = {
	backendURL: 'https://consent.example',
	consentCategories: [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	],
	customFetch: storybookFetch(),
	domain: 'consent.example',
	hideBranding: false,
	presentation: storybookPresentation,

	// Animations left ON to match the React/Svelte storybooks (their fixtures
	// don't disable them) so the Vue stories showcase the real dialog +
	// accordion motion. The parity-runner freezes animations itself via
	// Playwright's `animations: 'disabled'`, so screenshots stay stable.
	trapFocus: true,
} as ConsentConfig;

export const provideStorybookConsentContext =
	function provideStorybookConsentContext(
		app: App | null,
		context: VueConsentKernelContext,
		config: ConsentConfig
	) {
		if (app) {
			app.provide(consentConfigKey, config);
			app.provide(symbolKernelContext, context);
			app.provide(symbolKernel, context.kernel);
			app.provide(symbolSnapshot, context.snapshot);
			app.provide(symbolInit, context.init);
			app.provide(symbolActiveUI, context.activeUI);
			app.provide(symbolConsent, context.storedConsent);
			return;
		}

		provide(consentConfigKey, config);
		provide(symbolKernelContext, context);
		provide(symbolKernel, context.kernel);
		provide(symbolSnapshot, context.snapshot);
		provide(symbolInit, context.init);
		provide(symbolActiveUI, context.activeUI);
		provide(symbolConsent, context.storedConsent);
	};

export const useStorybookConsent = function useStorybookConsent(
	activeUI: StoryActiveUI,
	configOverrides?: Partial<ConsentConfig>
) {
	const config = configOverrides
		? ({ ...storybookConsentConfig, ...configOverrides } as ConsentConfig)
		: storybookConsentConfig;
	const context = createVueConsentKernelContext({
		config,
		prefetch: storybookInit,
		producerContract: 1,
	});
	context.activeUI.value = activeUI;
	provideStorybookConsentContext(null, context, config);
	onUnmounted(() => context.dispose());
	return context;
};
