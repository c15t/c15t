import type { InitOutput } from '@c15t/schema/types';
import type { App } from 'vue';
import { onUnmounted, provide } from 'vue';
import { enTranslations } from '../../../packages/translations/src';
import { consentConfigKey } from '../../../packages/vue/src/runtime/composables/config';
import type { ConsentConfig } from '../../../packages/vue/src/runtime/config';
import {
	createVueConsentKernelContext,
	type VueConsentKernelContext,
} from '../../../packages/vue/src/runtime/kernel';
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
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	translations: {
		language: 'en',
		translations: enTranslations,
	},
	branding: 'c15t',
	policy: {
		id: 'storybook_vue_policy',
		model: 'opt-in',
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
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
				primaryActions: ['customize'],
				scrollLock: false,
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
				// Mirrors the react/svelte offline compact profile so the
				// widget/dialog footers group actions identically across
				// frameworks ([reject, accept] + [customize]).
				layout: [['reject', 'accept'], 'customize'],
				direction: 'row',
				uiProfile: 'compact',
				primaryActions: ['customize'],
				scrollLock: false,
			},
		},
	},
	policyDecision: {
		policyId: 'storybook_vue_policy',
		fingerprint: 'storybook_vue_fingerprint',
		matchedBy: 'default',
		country: 'DE',
		region: null,
		jurisdiction: 'GDPR',
	},
	policySnapshotToken: 'storybook_vue_token',
};

function storybookFetch(): typeof fetch {
	return (async (input: RequestInfo | URL, request?: RequestInit) => {
		const url = String(input);
		if (url.endsWith('/init')) {
			return new Response(JSON.stringify(storybookInit), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}
		if (url.endsWith('/subjects')) {
			const body = JSON.parse(String(request?.body ?? '{}')) as {
				subjectId?: string;
			};
			return new Response(
				JSON.stringify({ ok: true, subjectId: body.subjectId }),
				{
					status: 200,
					headers: { 'content-type': 'application/json' },
				}
			);
		}
		return new Response('not found', { status: 404 });
	}) as typeof fetch;
}

export const storybookConsentConfig: ConsentConfig = {
	backendURL: 'https://consent.example',
	domain: 'consent.example',
	consentCategories: [
		'necessary',
		'functionality',
		'measurement',
		'experience',
		'marketing',
	],
	customFetch: storybookFetch(),
	// Animations left ON to match the React/Svelte storybooks (their fixtures
	// don't disable them) so the Vue stories showcase the real dialog +
	// accordion motion. The parity-runner freezes animations itself via
	// Playwright's `animations: 'disabled'`, so screenshots stay stable.
	trapFocus: true,
	hideBranding: false,
} as ConsentConfig;

export function provideStorybookConsentContext(
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
}

export function useStorybookConsent(
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
}
