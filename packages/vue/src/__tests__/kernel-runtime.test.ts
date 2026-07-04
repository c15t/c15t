import type { InitOutput } from '@c15t/schema/types';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { c15tVue } from '../index';
import ConsentRoot from '../runtime/components/consent-root.vue';

const initFixture: InitOutput = {
	jurisdiction: 'GDPR',
	location: {
		countryCode: 'DE',
		regionCode: null,
	},
	translations: {
		language: 'en',
		translations: {
			common: {
				acceptAll: 'Accept all',
				rejectAll: 'Reject all',
				customize: 'Customize',
				save: 'Save',
			},
			cookieBanner: {
				title: 'Cookie choices',
				description: 'Pick how c15t may use cookies.',
			},
			consentManagerDialog: {
				title: 'Privacy preferences',
				description: 'Manage your choices.',
			},
			consentTypes: {
				necessary: {
					title: 'Necessary',
					description: 'Required cookies.',
				},
				functionality: {
					title: 'Functionality',
					description: 'Feature cookies.',
				},
				experience: {
					title: 'Experience',
					description: 'Experience cookies.',
				},
				measurement: {
					title: 'Measurement',
					description: 'Analytics cookies.',
				},
				marketing: {
					title: 'Marketing',
					description: 'Advertising cookies.',
				},
			},
			frame: {
				title: 'Privacy',
				actionButton: 'Manage',
			},
			legalLinks: {
				privacyPolicy: 'Privacy policy',
				termsOfService: 'Terms of service',
				cookiePolicy: 'Cookie policy',
			},
		},
	},
	branding: 'c15t',
	policy: {
		id: 'policy_gdpr',
		model: 'opt-in',
		consent: {
			categories: ['necessary', 'measurement', 'marketing'],
			scopeMode: 'strict',
		},
		ui: {
			mode: 'banner',
			banner: {
				allowedActions: ['reject', 'accept', 'customize'],
			},
			dialog: {
				allowedActions: ['reject', 'accept', 'customize'],
			},
		},
	},
	policyDecision: {
		policyId: 'policy_gdpr',
		fingerprint: 'fingerprint_gdpr',
		matchedBy: 'country',
		country: 'DE',
		region: null,
		jurisdiction: 'GDPR',
	},
	policySnapshotToken: 'token_gdpr',
};

function createFetchMock() {
	const subjectBodies: unknown[] = [];
	const fetchMock = vi.fn(
		async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			if (url.endsWith('/init')) {
				return new Response(JSON.stringify(initFixture), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				});
			}
			if (url.endsWith('/subjects')) {
				const body = JSON.parse(String(init?.body ?? '{}')) as {
					subjectId?: string;
				};
				subjectBodies.push(body);
				return new Response(
					JSON.stringify({ ok: true, subjectId: body.subjectId }),
					{
						status: 200,
						headers: { 'content-type': 'application/json' },
					}
				);
			}
			return new Response('not found', { status: 404 });
		}
	);

	return { fetchMock, subjectBodies };
}

async function mountRoot() {
	const { fetchMock, subjectBodies } = createFetchMock();
	vi.stubGlobal('fetch', fetchMock);
	const wrapper = mount(ConsentRoot, {
		global: {
			plugins: [
				[
					c15tVue,
					{
						backendURL: 'https://consent.example',
						domain: 'consent.example',
						consentCategories: ['necessary', 'measurement', 'marketing'],
					},
				],
			],
		},
	});
	await flushPromises();
	return { wrapper, fetchMock, subjectBodies };
}

beforeEach(() => {
	document.body.innerHTML = '';
	window.localStorage.clear();
	document.cookie = 'c15t=; max-age=0; path=/';
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.innerHTML = '';
	window.localStorage.clear();
	document.cookie = 'c15t=; max-age=0; path=/';
});

describe('@c15t/vue kernel runtime', () => {
	test('renders the banner from kernel init state', async () => {
		const { wrapper } = await mountRoot();

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeTruthy();
		expect(document.body.textContent).toContain('Cookie choices');

		wrapper.unmount();
	});

	test('hides the banner on consent and posts through the hosted transport', async () => {
		const { wrapper, subjectBodies } = await mountRoot();

		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-actions-accept-button"]'
			)
			?.click();
		await flushPromises();
		await Promise.resolve();

		expect(
			document.querySelector('[data-testid="consent-banner-root"]')
		).toBeNull();
		expect(subjectBodies).toHaveLength(1);
		expect(subjectBodies[0]).toMatchObject({
			domain: 'consent.example',
			type: 'cookie_banner',
			preferences: {
				necessary: true,
				measurement: true,
				marketing: true,
			},
			consentAction: 'all',
			policySnapshotToken: 'token_gdpr',
		});

		wrapper.unmount();
	});

	test('persists consent with the v2-compatible c15t storage payload', async () => {
		const { wrapper } = await mountRoot();

		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-actions-reject-button"]'
			)
			?.click();
		await flushPromises();
		await Promise.resolve();

		const stored = JSON.parse(window.localStorage.getItem('c15t') ?? '{}');
		expect(stored).toMatchObject({
			consents: {
				necessary: true,
				measurement: false,
				marketing: false,
			},
			consentInfo: {
				subjectId: expect.stringMatching(/^sub_/),
			},
		});
		expect(document.cookie).toContain('c15t=');

		wrapper.unmount();
	});
});
