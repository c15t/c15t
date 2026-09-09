/**
 * The v3 policy contract at the transport boundary (#1025).
 *
 * What these pin, independent of any kernel:
 *
 * - Every backend-bound request declares the contract it reads.
 * - A negotiated producer's `policyResolution` is passed through raw; a
 *   producer that predates the contract has its legacy field lifted; a
 *   negotiated producer whose response lacks the field is a failed payload,
 *   never a preserved or permissive policy.
 * - `Sec-GPC` is reported as a detected privacy signal, exactly, and never
 *   folded into the developer override.
 * - A save carries only the receipts the action confirmed, with the kernel's
 *   times and bases untouched, and a 2.x-shaped success body is a success.
 * - Offline resolution emits every outcome explicitly.
 */
import type {
	ConsentManifest,
	InitOutput,
	PolicyRule,
} from '@c15t/schema/types';
import {
	POLICY_CONTRACT_HEADER,
	readPolicyResolutionWire,
	SAFE_FALLBACK_POLICY_FINGERPRINTS,
} from '@c15t/schema/types';
import { describe, expect, test, vi } from 'vitest';

import type { ExplicitChoice } from '../consent-record/types';
import {
	buildConfirmedChoiceWire,
	buildSubjectPostBody,
	c15tProtocolHeaders,
	createHostedTransport,
	createOfflineTransport,
	mapInitOutputToInitResponse,
	mapPrivacySignals,
	resolveInitPolicyWire,
} from '../transports';
import type { SubjectSavePayload } from '../transports';
import { createManifestTransport } from '../transports/manifest';

// Deliberately missing the negotiated field: tests exercise untrusted responses.
const BASE_INIT = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	translations: { language: 'de', translations: {} as never },
} as unknown as InitOutput;

const MATCHED_WIRE = {
	fingerprints: {
		choice: 'c'.repeat(64),
		notice: 'n'.repeat(64),
		policy: 'p'.repeat(64),
	},
	matchedBy: 'country',
	policy: {
		actions: {
			allowed: ['accept', 'customize', 'reject'],
			equivalent: [['accept', 'reject']],
			required: ['accept', 'reject'],
		},
		copyRevision: null,
		id: 'eu',
		model: 'opt-in',
		preselectedCategories: [],
		privacySignals: { gpc: { denyCategories: [] } },
		prompt: 'choice',
		proof: { storeIp: false, storeLanguage: false, storeUserAgent: false },
		rights: ['disclosure', 'preferences'],
		scope: ['experience', 'functionality', 'marketing', 'measurement'],
		scopeMode: 'strict',
		validity: { choiceMs: 31_536_000_000, noticeMs: 31_536_000_000 },
	},
	policyId: 'eu',
	status: 'matched',
	version: 1,
} as const;

const LEGACY_POLICY = {
	consent: { categories: ['necessary', 'marketing'], gpc: true },
	id: 'legacy-eu',
	model: 'opt-in',
	ui: { mode: 'banner' },
} as const;

const respond = (body: unknown, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), {
		headers: { 'content-type': 'application/json', ...headers },
		status: 200,
	});

const CHOICE: ExplicitChoice = {
	categories: {
		marketing: {
			basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
			confirmedAt: 1_700_000_060_000,
			value: false,
		},
		measurement: {
			basis: { kind: 'legacy-v2', materialFingerprint: 'material-fp' },
			confirmedAt: 1_700_000_000_000,
			value: true,
		},
	},
	version: 3,
};

const PAYLOAD: SubjectSavePayload = {
	choice: CHOICE,
	confirmed: { actionAt: 1_700_000_060_000, categories: { marketing: false } },
	consentAction: 'custom',
	consents: {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: true,
		necessary: true,
	},
	givenAt: 1_700_000_060_000,
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subject: { subjectId: 'sub_test' },
	subjectId: 'sub_test',
	uiSource: 'banner',
	user: null,
};

describe('policy contract header', () => {
	test('every hosted request declares the contract next to the version', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(respond({ ok: true }));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		await transport.save(PAYLOAD);
		await transport.identify({ externalId: 'u' }, 'sub_test');
		await transport.recordPrivacyOptOut(
			{ categories: ['marketing'], recordedAt: 1, source: 'gpc' },
			'sub_test'
		);
		for (const call of fetchSpy.mock.calls) {
			const headers = (call[1] as RequestInit).headers as Record<
				string,
				string
			>;
			expect(headers[POLICY_CONTRACT_HEADER]).toBe('1');
			expect(headers['x-c15t-version']).toMatch(/^\d+\.\d+\.\d+/u);
		}
		expect(c15tProtocolHeaders[POLICY_CONTRACT_HEADER]).toBe('1');
	});
});

describe('resolveInitPolicyWire', () => {
	test('passes a negotiated producer wire through untouched', () => {
		const wire = resolveInitPolicyWire(
			{ ...BASE_INIT, policyResolution: MATCHED_WIRE as never },
			{ producerContract: 1 }
		);
		expect(wire).toBe(MATCHED_WIRE);
	});

	test('rejects a producer that predates the policy contract', () => {
		const payload = { ...BASE_INIT, policy: LEGACY_POLICY };
		expect(readPolicyResolutionWire(resolveInitPolicyWire(payload))).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});

	test('an absent legacy policy and the old no-banner sentinel cannot suppress a required prompt', () => {
		for (const payload of [
			BASE_INIT,
			{
				...BASE_INIT,
				policy: { id: 'no_banner', model: 'none', ui: { mode: 'none' } },
			},
		]) {
			expect(readPolicyResolutionWire(resolveInitPolicyWire(payload))).toEqual({
				policy: null,
				reason: 'unsupported-contract',
				status: 'failed',
			});
		}
	});

	test('fails a negotiated producer whose response lacks the field', () => {
		expect(
			readPolicyResolutionWire(
				resolveInitPolicyWire(
					{ ...BASE_INIT, policy: LEGACY_POLICY } as InitOutput,
					{ producerContract: 1 }
				)
			)
		).toEqual({ policy: null, reason: 'invalid-payload', status: 'failed' });
		// A declared contract this client does not speak, or cannot parse, is
		// refused before the body is considered at all.
		for (const producerContract of [2, null]) {
			expect(
				readPolicyResolutionWire(
					resolveInitPolicyWire(
						{ ...BASE_INIT, policy: LEGACY_POLICY } as InitOutput,
						{ producerContract }
					)
				)
			).toEqual({
				policy: null,
				reason: 'unsupported-contract',
				status: 'failed',
			});
		}
	});

	test('keeps an unsupported producer wire failed, never lifted', () => {
		const wire = resolveInitPolicyWire(
			{
				...BASE_INIT,
				policy: LEGACY_POLICY,
				policyResolution: {
					policy: null,
					reason: 'unsupported-contract',
					status: 'failed',
					version: 1,
				},
			} as InitOutput,
			{ producerContract: 1 }
		);
		expect(readPolicyResolutionWire(wire)).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});
});

describe('hosted init negotiation', () => {
	test('reads the producer contract from the response header', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValueOnce(
				respond(
					{ ...BASE_INIT, policy: LEGACY_POLICY },
					{
						[POLICY_CONTRACT_HEADER]: '1',
					}
				)
			)
			.mockResolvedValueOnce(respond({ ...BASE_INIT, policy: LEGACY_POLICY }));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});

		// Declared contract, no wire: failed, so no stale policy can stand in.
		const negotiated = await transport.init({ overrides: {}, user: null });
		expect(readPolicyResolutionWire(negotiated.policyResolution)).toEqual({
			policy: null,
			reason: 'invalid-payload',
			status: 'failed',
		});

		// No declaration: a producer from before the contract, lifted.
		const legacy = await transport.init({ overrides: {}, user: null });
		expect(readPolicyResolutionWire(legacy.policyResolution)).toMatchObject({
			reason: 'unsupported-contract',
			status: 'failed',
		});
		// The legacy field still rides along for the presentation bridge.
		expect(legacy).not.toHaveProperty('policy');
	});
});

describe('unsupported producer contract', () => {
	test('fails closed whatever the body says', async () => {
		const permissiveBody = {
			...BASE_INIT,
			policy: { id: 'open', model: 'opt-out', ui: { mode: 'none' } },
			policyResolution: {
				...MATCHED_WIRE,
				policy: { ...MATCHED_WIRE.policy, model: 'opt-out', prompt: 'none' },
			},
		};
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				respond(permissiveBody, { [POLICY_CONTRACT_HEADER]: '99' })
			);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		const response = await transport.init({ overrides: {}, user: null });
		// An unknown contract makes the body no evidence at all: the kernel
		// adopts the safe opt-in fallback rather than the opt-out it carries.
		expect(readPolicyResolutionWire(response.policyResolution)).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
		expect(
			readPolicyResolutionWire(
				resolveInitPolicyWire(permissiveBody as never, {
					producerContract: null,
				})
			)
		).toEqual({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	});
});

describe('privacy signals', () => {
	test('reports Sec-GPC exactly and never as an override', () => {
		expect(mapPrivacySignals({ 'sec-gpc': '1' })).toEqual({ gpc: true });
		expect(mapPrivacySignals({ 'sec-gpc': '0' })).toEqual({ gpc: false });
		expect(mapPrivacySignals({ 'sec-gpc': 'true' })).toBeUndefined();
		expect(mapPrivacySignals({})).toBeUndefined();

		const mapped = mapInitOutputToInitResponse(BASE_INIT, { 'sec-gpc': '1' });
		expect(mapped.resolvedPrivacySignals).toEqual({ gpc: true });
		expect(mapped.resolvedOverrides).not.toHaveProperty('gpc');
	});
});

describe('save body receipts', () => {
	test('sends only the receipts the action confirmed, with their own times and bases', () => {
		const body = buildSubjectPostBody(PAYLOAD, { domain: 'example.com' });
		expect(body.choice).toEqual({
			categories: {
				marketing: {
					basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
					confirmedAt: 1_700_000_060_000,
					value: false,
				},
			},
			version: 3,
		});
		// The complete map of explicit values travels for backends that read
		// it: never the effective permissions, which a GPC mask or a strict
		// scope may have denied against the subject's own grant.
		expect(body.preferences).toEqual({
			marketing: false,
			measurement: true,
			necessary: true,
		});
		expect(body.givenAt).toBe(1_700_000_060_000);
	});

	test('keeps a legacy basis and its material fingerprint when reconfirmed', () => {
		const wire = buildConfirmedChoiceWire({
			choice: CHOICE,
			confirmed: { actionAt: 1, categories: { measurement: true } },
		});
		expect(wire?.categories.measurement?.basis).toEqual({
			kind: 'legacy-v2',
			materialFingerprint: 'material-fp',
		});
	});

	test('omits an empty confirmation and rejects payloads without receipts', () => {
		expect(
			buildConfirmedChoiceWire({
				choice: CHOICE,
				confirmed: { actionAt: 1, categories: {} },
			})
		).toBeUndefined();
		const {
			choice: _choice,
			confirmed: _confirmed,
			...legacyPayload
		} = PAYLOAD;
		expect(() =>
			// @ts-expect-error Deliberately exercise a removed kernel payload at the boundary.
			buildSubjectPostBody(legacyPayload, { domain: 'example.com' })
		).toThrow();
	});

	test('reuses the identical body on replay', () => {
		const first = buildSubjectPostBody(PAYLOAD, { domain: 'example.com' });
		const second = buildSubjectPostBody(PAYLOAD, { domain: 'example.com' });
		expect(second).toEqual(first);
	});
});

describe('hosted save result', () => {
	test('treats a 2.x-shaped success body as a successful save', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			respond({
				consentId: 'cns_1',
				domain: 'example.com',
				domainId: 'dom_1',
				givenAt: '2023-11-14T22:14:20.000Z',
				subjectId: 'sub_test',
				type: 'cookie_banner',
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		// Without this, every real save was read as `ok: undefined` and queued
		// for replay forever.
		await expect(transport.save(PAYLOAD)).resolves.toEqual({
			ok: true,
			subjectId: 'sub_test',
		});
	});
});

describe('hosted subject record boundary', () => {
	const subjectRead = {
		consents: [
			{
				givenAt: '2023-11-14T22:13:20.000Z',
				id: 'cns_1',
				isLatestPolicy: true,
				preferences: { marketing: true, necessary: true },
				type: 'cookie_banner',
			},
		],
		isValid: true,
		privacyDirectives: [
			{
				authority: 'subject',
				categories: ['marketing'],
				id: 'pdr_1',
				recordedAt: 1_700_000_100_000,
				signalHeader: true,
				source: 'gpc',
			},
		],
		subject: {
			createdAt: '2023-11-14T22:13:20.000Z',
			externalId: 'person-42',
			id: 'sub_test',
		},
		subjectChoice: {
			categories: {
				marketing: {
					basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
					confirmedAt: 1_700_000_060_000,
					value: false,
				},
			},
			version: 3,
		},
	};

	test('loadSubjectRecord maps the backend record onto hydration records', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(respond(subjectRead));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			now: () => 1_700_000_200_000,
		});
		const records = await transport.loadSubjectRecord('sub_test');
		expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/c15t/subjects/sub_test');
		expect(records).toEqual({
			choice: subjectRead.subjectChoice,
			now: 1_700_000_200_000,
			optOutDirectives: [
				{
					categories: ['marketing'],
					recordedAt: 1_700_000_100_000,
					source: 'gpc',
				},
			],
			subject: { externalId: 'person-42', subjectId: 'sub_test' },
		});
	});

	test('loadSubjectRecord derives legacy grants from a 2.x backend read and invents no refusal', async () => {
		const {
			subjectChoice: _omitted,
			privacyDirectives: _none,
			...legacyRead
		} = subjectRead;
		const fetchSpy = vi.fn().mockResolvedValue(respond(legacyRead));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			now: () => 1_700_000_200_000,
		});
		const records = await transport.loadSubjectRecord('sub_test');
		expect(records?.choice).toEqual({
			categories: {
				marketing: {
					basis: { kind: 'legacy-v2' },
					confirmedAt: 1_700_000_000_000,
					value: true,
				},
			},
			version: 3,
		});
		expect(records?.optOutDirectives).toEqual([]);
	});

	test('loadSubjectRecord refuses to salvage an item whose receipts it cannot read', async () => {
		const { subjectChoice: _omitted, ...legacyRead } = subjectRead;
		const fetchSpy = vi.fn().mockResolvedValue(
			respond({
				...legacyRead,
				consents: [
					{
						...legacyRead.consents[0],
						choice: { categories: { marketing: { value: true } }, version: 99 },
					},
				],
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			now: () => 1_700_000_200_000,
		});
		const records = await transport.loadSubjectRecord('sub_test');
		expect(records?.choice).toBeNull();
	});

	test('loadSubjectRecord carries the identity provider as stored', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			respond({
				...subjectRead,
				subject: {
					...subjectRead.subject,
					externalId: '001%2520',
					identityProvider: 'custom%20',
				},
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			now: () => 1_700_000_200_000,
		});
		const records = await transport.loadSubjectRecord('sub_test');
		expect(records?.subject).toEqual({
			externalId: '001%2520',
			identityProvider: 'custom%20',
			subjectId: 'sub_test',
		});
	});

	test('loadSubjectRecord drops a receipt set the reader cannot validate rather than salvaging grants', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(
			respond({
				...subjectRead,
				subjectChoice: {
					categories: {
						marketing: {
							basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
							// Later than the reader's clock.
							confirmedAt: 1_700_000_300_000,
							value: true,
						},
					},
					version: 3,
				},
			})
		);
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			now: () => 1_700_000_200_000,
		});
		const records = await transport.loadSubjectRecord('sub_test');
		expect(records?.choice).toBeNull();
	});

	test('loadSubjectRecord returns null for an unknown subject', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(new Response('{"message":"nope"}', { status: 404 }));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		await expect(transport.loadSubjectRecord('sub_nobody')).resolves.toBeNull();
	});

	test('recordPrivacyOptOut posts to the privacy route and never the consent route', async () => {
		const fetchSpy = vi.fn().mockResolvedValue(respond({ ok: true }));
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		await transport.recordPrivacyOptOut(
			{
				categories: ['marketing', 'measurement'],
				recordedAt: 1,
				source: 'gpc',
			},
			'sub_test'
		);
		const [url, init] = fetchSpy.mock.calls[0] ?? [];
		expect(url).toBe('/api/c15t/subjects/sub_test/privacy-directives');
		expect((init as RequestInit).method).toBe('POST');
		expect(JSON.parse((init as RequestInit).body as string)).toEqual({
			categories: ['marketing', 'measurement'],
			recordedAt: 1,
			source: 'gpc',
		});
	});

	test('recordPrivacyOptOut sends nothing without a server subject', async () => {
		const fetchSpy = vi.fn();
		const transport = createHostedTransport({
			backendURL: '/api/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
		});
		await transport.recordPrivacyOptOut(
			{ categories: ['marketing'], recordedAt: 1, source: 'gpc' },
			null
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('offline transport resolution', () => {
	const rules: PolicyRule[] = [
		{
			id: 'eu',
			match: { countries: ['DE'] },
			model: 'opt-in',
			prompt: 'choice',
		},
		{
			id: 'ca',
			match: { regions: [{ country: 'US', region: 'CA' }] },
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'notice',
		},
	];

	test('resolves v3 rules once per init with precomputed fingerprints', async () => {
		const transport = createOfflineTransport({ policyRules: rules });
		const response = await transport.init?.({
			overrides: { country: 'US', region: 'CA' },
			user: null,
		});
		const resolution = readPolicyResolutionWire(response?.policyResolution);
		expect(resolution).toMatchObject({ policyId: 'ca', status: 'matched' });
		if (resolution.status === 'matched') {
			expect(resolution.policy.prompt).toBe('notice');
			expect(resolution.fingerprints.choice).not.toBe(
				SAFE_FALLBACK_POLICY_FINGERPRINTS.choice
			);
		}
		// The legacy field is the strictest v2 shape for the old kernel: a
		// notice-with-GPC rule cannot be expressed, so it is the opt-in banner.
		expect(response).not.toHaveProperty('policy');
	});

	test('emits unconfigured, no-match and failed explicitly', async () => {
		const read = async (
			transport: ReturnType<typeof createOfflineTransport>,
			country?: string
		) =>
			readPolicyResolutionWire(
				(await transport.init?.({ overrides: { country }, user: null }))
					?.policyResolution
			);

		expect(await read(createOfflineTransport(), 'DE')).toEqual({
			policy: null,
			status: 'unconfigured',
		});
		expect(
			await read(createOfflineTransport({ policyRules: rules }), 'BR')
		).toEqual({ policy: null, status: 'no-match' });
		expect(await read(createOfflineTransport({ policyRules: rules }))).toEqual({
			policy: null,
			reason: 'insufficient-inputs',
			status: 'failed',
		});
		expect(
			await read(
				createOfflineTransport({
					policyRules: [
						{
							id: 'bad',
							match: { isDefault: true },
							model: 'opt-in',
							prompt: 'none',
						},
					],
				}),
				'DE'
			)
		).toEqual({
			policy: null,
			reason: 'invalid-configuration',
			status: 'failed',
		});
	});

	test('offline rules retain the explicit GPC mapping', async () => {
		const transport = createOfflineTransport({
			policyRules: [
				{
					id: 'local',
					match: { isDefault: true },
					model: 'opt-in',
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'choice',
				},
			],
		});
		const response = await transport.init({ overrides: {}, user: null });
		expect(readPolicyResolutionWire(response.policyResolution)).toMatchObject({
			policy: { privacySignals: { gpc: { denyCategories: ['marketing'] } } },
			status: 'matched',
		});
		expect(response).not.toHaveProperty('policy');
	});

	test('removed policy packs cannot override configured rules', async () => {
		const options = { policyPacks: [], policyRules: rules };
		const response = await createOfflineTransport(options).init({
			overrides: { country: 'DE' },
			user: null,
		});
		expect(readPolicyResolutionWire(response.policyResolution)).toMatchObject({
			policyId: 'eu',
			status: 'matched',
		});
	});
});

describe('identity without a server subject', () => {
	const manifest: ConsentManifest = {
		branding: 'c15t',
		policyPacks: [],
		revision: 'r',
		schemaVersion: 2,
	};
	const user = { externalId: 'person', identityProvider: 'idp' };
	const directive = {
		categories: ['marketing' as const],
		recordedAt: 1,
		source: 'gpc' as const,
	};

	test.each([
		{
			build: (fetch: typeof globalThis.fetch) =>
				createHostedTransport({
					backendURL: 'https://api.example.com/c15t',
					fetch,
				}),
			label: 'hosted',
		},
		{
			build: (fetch: typeof globalThis.fetch) =>
				createManifestTransport({
					backendURL: 'https://api.example.com/c15t',
					fetch,
					manifest,
				}),
			label: 'manifest',
		},
	])(
		'$label resolves identify locally and acts only on the subject the kernel passes',
		async ({ build }) => {
			const fetchSpy = vi
				.fn()
				.mockResolvedValue(
					respond({ consentId: 'cns_1', subjectId: 'sub_test' })
				);
			const transport = build(fetchSpy as unknown as typeof globalThis.fetch);

			await expect(transport.identify(user, null)).resolves.toBeUndefined();
			await expect(
				transport.recordPrivacyOptOut(directive, null)
			).resolves.toBeUndefined();
			expect(fetchSpy).not.toHaveBeenCalled();

			// The save carries the identity; the transport remembers no subject.
			await transport.save({ ...PAYLOAD, user });
			const [saveCall] = fetchSpy.mock.calls;
			const saveInit = saveCall?.[1] as RequestInit;
			expect(JSON.parse(saveInit.body as string)).toMatchObject({
				externalSubjectId: 'person',
				identityProvider: 'idp',
			});
			await transport.identify(user, null);
			await transport.recordPrivacyOptOut(directive, null);
			expect(fetchSpy).toHaveBeenCalledTimes(1);

			// Only the subject the kernel passes is acted on.
			await transport.recordPrivacyOptOut(directive, 'sub_test');
			expect(fetchSpy.mock.calls[1]?.[0]).toBe(
				'https://api.example.com/c15t/subjects/sub_test/privacy-directives'
			);
		}
	);
});

describe('manifest transport', () => {
	test('refetches a manifest after a failed fetch instead of caching the rejection', async () => {
		let calls = 0;
		const fetchSpy = vi.fn(() => {
			calls += 1;
			return Promise.resolve(
				calls === 1
					? new Response('offline', { status: 503 })
					: respond({
							branding: 'c15t',
							policyPacks: [],
							revision: 'r',
							schemaVersion: 2,
						})
			);
		});
		const transport = createManifestTransport({
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifestURL: 'https://api.example.com/c15t/manifest',
		});
		await expect(transport.init({ overrides: {}, user: null })).rejects.toThrow(
			/\/manifest responded 503/u
		);
		// The kernel's retry must reach the network again, not the cached
		// failure.
		const response = await transport.init({ overrides: {}, user: null });
		expect(readPolicyResolutionWire(response.policyResolution)).toEqual({
			policy: null,
			status: 'no-match',
		});
		expect(calls).toBe(2);
		// A success is cached: a third init does not fetch again.
		await transport.init({ overrides: {}, user: null });
		expect(calls).toBe(2);
	});

	test('declares the contract on the manifest fetch and maps the save body', async () => {
		const fetchSpy = vi
			.fn()
			.mockResolvedValue(
				respond({ consentId: 'cns_1', subjectId: 'sub_test' })
			);
		const transport = createManifestTransport({
			backendURL: 'https://api.example.com/c15t',
			fetch: fetchSpy as unknown as typeof globalThis.fetch,
			manifest: {
				branding: 'c15t',
				policyPacks: [],
				revision: 'r',
				schemaVersion: 2,
			},
		});
		await expect(transport.save(PAYLOAD)).resolves.toEqual({
			ok: true,
			subjectId: 'sub_test',
		});
		const [, init] = fetchSpy.mock.calls[0] ?? [];
		const headers = (init as RequestInit).headers as Record<string, string>;
		expect(headers[POLICY_CONTRACT_HEADER]).toBe('1');
		expect(JSON.parse((init as RequestInit).body as string).choice).toEqual({
			categories: {
				marketing: {
					basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
					confirmedAt: 1_700_000_060_000,
					value: false,
				},
			},
			version: 3,
		});
	});
});
