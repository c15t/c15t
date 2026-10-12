/**
 * A save the browser queued and replays after its policy snapshot token
 * expired.
 *
 * The browser keeps a failed save for up to 7 days and replays it with the
 * click time as `givenAt` and the token it had then. Tokens live 30
 * minutes. These tests run the backend and the core hosted transport on a
 * fake clock to show which late saves are recorded and which are refused.
 */

import type { PolicyRule } from '@c15t/schema';
import { afterEach, assert, beforeEach, describe, it, vi } from 'vitest';

import { createHostedTransport } from '../../../core/src/transports/hosted';
import { isConsentSaveRejection } from '../../../core/src/transports/save-rejection';
import type { SubjectSavePayload } from '../../../core/src/transports/subject-body';
import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';
import type { createApp } from './app';

const SIGNING_KEY = 'test-signing-key-at-least-32-chars-long';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** When the visitor loaded the page and `/init` minted the token. */
const T_INIT = 1_800_000_000_000;
/** When the visitor clicked, well inside the token's 30 minutes. */
const T_CLICK = T_INIT + 5 * MINUTE;

const RULES: PolicyRule[] = [
	{
		categories: ['marketing', 'measurement'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'strict',
	},
];

const body = (token: string, givenAt: number) => ({
	domain: 'example.com',
	givenAt,
	policySnapshotToken: token,
	preferences: { marketing: true, measurement: false, necessary: true },
	subjectId: 'sub_queued1',
	type: 'cookie_banner',
});

const savePayload = (
	token: string,
	givenAt: number,
	choiceFingerprint: string
): SubjectSavePayload => ({
	choice: {
		categories: {
			marketing: {
				basis: { fingerprint: choiceFingerprint, kind: 'choice-v1' },
				confirmedAt: givenAt,
				value: true,
			},
		},
		version: 3,
	},
	confirmed: { actionAt: givenAt, categories: { marketing: true } },
	consentAction: 'custom',
	consents: {
		experience: false,
		functionality: false,
		marketing: true,
		measurement: false,
		necessary: true,
	},
	givenAt,
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: token,
	subjectId: 'sub_queued1',
	uiSource: 'dialog',
	user: null,
});

describe.each(ENGINES)('late consent saves ($name)', (engine) => {
	let harness: HttpHarness;
	let token: string;
	let choiceFingerprint: string;

	beforeEach(async () => {
		vi.useFakeTimers({ now: T_INIT, toFake: ['Date'] });
		harness = await createHttpHarness(engine, {
			manifest: { appName: 'Replay', policyRules: RULES },
			policySnapshot: { signingKey: SIGNING_KEY },
			tenantId: 'tenant_replay',
		});
		const init = await harness.json('GET', '/init', undefined, {
			'x-c15t-country': 'DE',
		});
		token = init.body.policySnapshotToken as string;
		choiceFingerprint = (
			init.body.policyResolution as { fingerprints: { choice: string } }
		).fingerprints.choice;
		assert.isString(token);
	});

	afterEach(async () => {
		vi.useRealTimers();
		await harness.dispose();
	});

	const replayAt = (
		now: number,
		payload = body(token, T_CLICK),
		app?: ReturnType<typeof createApp>
	) => {
		vi.setSystemTime(now);
		return harness.json('POST', '/subjects', payload, {}, app);
	};

	const code = (response: { body: Record<string, unknown> }) =>
		(response.body.cause as { code?: string; reason?: string } | undefined)
			?.code;

	it('records a live save as before', async () => {
		const saved = await replayAt(T_CLICK);
		assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
		assert.strictEqual(
			await harness.count('consent', {
				column: 'runtimePolicySource',
				value: 'snapshot_token',
			}),
			1
		);
	});

	it('records a replay after the token expired, at the click time, flagged as replayed', async () => {
		const saved = await replayAt(T_INIT + 2 * DAY);
		assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
		assert.strictEqual(
			new Date(saved.body.givenAt as string).getTime(),
			T_CLICK
		);
		assert.strictEqual(
			await harness.count('consent', {
				column: 'runtimePolicySource',
				value: 'snapshot_token_replayed',
			}),
			1
		);
	});

	it('refuses a replay that arrives after the replay window', async () => {
		const saved = await replayAt(T_INIT + 30 * MINUTE + 7 * DAY + MINUTE);
		assert.strictEqual(saved.status, 409);
		assert.strictEqual(code(saved), 'POLICY_SNAPSHOT_EXPIRED');
		assert.strictEqual(await harness.count('consent'), 0);
	});

	it('refuses a choice made after the token expired', async () => {
		const clickedLate = T_INIT + 45 * MINUTE;
		const saved = await replayAt(clickedLate, body(token, clickedLate));
		assert.strictEqual(saved.status, 409);
		assert.strictEqual(code(saved), 'POLICY_SNAPSHOT_EXPIRED');
	});

	it('refuses a replay claiming a click long before the token was minted', async () => {
		const saved = await replayAt(
			T_INIT + DAY,
			body(token, T_INIT - 60 * MINUTE)
		);
		assert.strictEqual(saved.status, 409);
		assert.strictEqual(code(saved), 'POLICY_SNAPSHOT_EXPIRED');
	});

	it('refuses a replay against a policy that changed since the visitor saw it', async () => {
		const changed = harness.appWith({
			manifest: {
				appName: 'Replay',
				policyRules: RULES.map((rule) => ({
					...rule,
					categories: ['marketing'],
				})),
			},
			policySnapshot: { signingKey: SIGNING_KEY },
			tenantId: 'tenant_replay',
		});
		const saved = await replayAt(T_INIT + DAY, body(token, T_CLICK), changed);
		assert.strictEqual(saved.status, 422);
		assert.strictEqual(code(saved), 'STALE_POLICY');
		assert.strictEqual(
			(saved.body.cause as { reason?: string }).reason,
			'policy-changed'
		);
		assert.strictEqual(await harness.count('consent'), 0);
	});

	it('refuses a tampered token, live or late', async () => {
		const [header, claims, signature] = token.split('.');
		const forged = JSON.parse(
			Buffer.from(claims ?? '', 'base64url').toString()
		) as { exp: number };
		forged.exp += 30 * DAY;
		const tampered = [
			header,
			Buffer.from(JSON.stringify(forged)).toString('base64url'),
			signature,
		].join('.');

		for (const now of [T_CLICK, T_INIT + DAY]) {
			// oxlint-disable-next-line no-await-in-loop -- Two clocks, one after the other.
			const saved = await replayAt(now, body(tampered, T_CLICK));
			assert.strictEqual(saved.status, 409);
			assert.strictEqual(code(saved), 'POLICY_SNAPSHOT_INVALID');
		}
		assert.strictEqual(await harness.count('consent'), 0);
	});

	it('refuses every late save when the replay window is 0', async () => {
		const strict = harness.appWith({
			manifest: { appName: 'Replay', policyRules: RULES },
			policySnapshot: { replayWindowSeconds: 0, signingKey: SIGNING_KEY },
			tenantId: 'tenant_replay',
		});
		const saved = await replayAt(
			T_INIT + 31 * MINUTE,
			body(token, T_CLICK),
			strict
		);
		assert.strictEqual(saved.status, 409);
		assert.strictEqual(code(saved), 'POLICY_SNAPSHOT_EXPIRED');
	});

	describe('through the hosted transport', () => {
		const transportFor = (app = harness.app) =>
			createHostedTransport({
				backendURL: 'https://backend.test',
				domain: 'example.com',
				fetch: ((input: string | URL | Request, init?: RequestInit) =>
					app.request(
						new URL(String(input)).pathname,
						init
					)) as typeof globalThis.fetch,
			});

		it('saves a replay inside the window', async () => {
			vi.setSystemTime(T_INIT + DAY);
			const result = await transportFor().save(
				savePayload(token, T_CLICK, choiceFingerprint)
			);
			assert.isTrue(result.ok);
		});

		it('reports a refusal the client should not retry', async () => {
			vi.setSystemTime(T_INIT + 8 * DAY);
			const error = await transportFor()
				.save(savePayload(token, T_CLICK, choiceFingerprint))
				.then(
					() => null,
					(caught: unknown) => caught
				);
			assert.isTrue(isConsentSaveRejection(error));
			assert.strictEqual(
				(error as { code: string }).code,
				'POLICY_SNAPSHOT_EXPIRED'
			);
		});

		it('reports a server failure as retryable', async () => {
			const failing = createHostedTransport({
				backendURL: 'https://backend.test',
				domain: 'example.com',
				fetch: () =>
					Promise.resolve(Response.json({ message: 'down' }, { status: 503 })),
			});
			const error = await failing
				.save(savePayload(token, T_CLICK, choiceFingerprint))
				.then(
					() => null,
					(caught: unknown) => caught
				);
			assert.instanceOf(error, Error);
			assert.isFalse(isConsentSaveRejection(error));
		});
	});
});
