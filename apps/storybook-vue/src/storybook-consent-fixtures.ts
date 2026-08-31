import type { InitOutput } from '@c15t/schema/types';
import type { App } from 'vue';
import { onUnmounted, provide } from 'vue';

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

type StoryActiveUI = 'banner' | 'manager' | null;

export const storybookInit: InitOutput = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	policy: {
		consent: {
			categories: [
				'necessary',
				'functionality',
				'measurement',
				'experience',
				'marketing',
			],
			scopeMode: 'permissive',
		},
		id: 'storybook_vue_policy',
		model: 'opt-in',
		ui: {
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryActions: ['customize'],
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				direction: 'row',
				// Mirrors the react/svelte offline compact profile so the
				// widget/dialog footers group actions identically across
				// frameworks ([reject, accept] + [customize]).
				layout: [['reject', 'accept'], 'customize'],
				primaryActions: ['customize'],
				scrollLock: false,

				uiProfile: 'compact',
			},
			mode: 'banner',
		},
	},
	policyDecision: {
		country: 'DE',
		fingerprint: 'storybook_vue_fingerprint',
		jurisdiction: 'GDPR',
		matchedBy: 'default',
		policyId: 'storybook_vue_policy',
		region: null,
	},
	policySnapshotToken: 'storybook_vue_token',
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
				headers: { 'content-type': 'application/json' },
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
					headers: { 'content-type': 'application/json' },
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
	});
	context.activeUI.value = activeUI;
	provideStorybookConsentContext(null, context, config);
	onUnmounted(() => context.dispose());
	return context;
};
