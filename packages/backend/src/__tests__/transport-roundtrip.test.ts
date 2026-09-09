/**
 * The whole path a category choice travels, with nothing mocked in between:
 * this backend's HTTP routes, the `@c15t/core` hosted transport that talks
 * to them, the transport's subject-record mapper, and the pure consent
 * evaluator the kernel runs on the result.
 *
 * Every other test in this package stops at the HTTP boundary, and the core
 * transport tests stop at a fake fetch. This is where the two are shown to
 * agree about what a receipt means: the times and bases the client sent are
 * what the evaluator sees after a real write and read, a partial save leaves
 * the untouched category's original receipt in force, and a standing privacy
 * directive recorded through the privacy route restricts the evaluator's
 * permissions without ever touching the consent table.
 *
 * The core sources are imported by path on purpose. `@c15t/backend` does not
 * depend on `@c15t/core`, and a workspace dependency for one test would put
 * the client engine into the backend's dependency graph.
 */

import type { PolicyRule } from '@c15t/schema';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { evaluateConsentRecord } from '../../../core/src/consent-record/evaluate';
import { createEvaluationPolicy } from '../../../core/src/consent-record/evaluation-policy';
import { createHostedTransport } from '../../../core/src/transports/hosted';
import type { SubjectSavePayload } from '../../../core/src/transports/subject-body';
import { ENGINES } from './engines';
import { createHttpHarness } from './http-harness';
import type { HttpHarness } from './http-harness';

/** Frozen clocks. Receipts later than the server clock are refused. */
const T0 = 1_700_000_000_000;
const T1 = T0 + 60_000;
const NOW = T0 + 120_000;

const RULES: PolicyRule[] = [
	{
		categories: ['marketing', 'measurement'],
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in',
		privacySignals: { gpc: { denyCategories: ['marketing'] } },
		prompt: 'choice',
		scopeMode: 'strict',
	},
];

const payload = (
	subjectId: string,
	choice: SubjectSavePayload['choice'],
	confirmed: NonNullable<SubjectSavePayload['confirmed']>,
	consents: SubjectSavePayload['consents']
): SubjectSavePayload => ({
	choice,
	confirmed,
	consentAction: 'custom',
	consents,
	givenAt: confirmed.actionAt,
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subjectId,
	uiSource: 'banner',
	user: null,
});

describe.each(ENGINES)(
	'backend producer, hosted transport, mapper and evaluator ($name)',
	(engine) => {
		let harness: HttpHarness;
		let transport: ReturnType<typeof createHostedTransport>;
		let choiceFingerprint: string;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				manifest: { appName: 'Roundtrip', policyRules: RULES },
				tenantId: 'tenant_rt',
			});
			transport = createHostedTransport({
				backendURL: 'https://backend.test/c15t',
				domain: 'example.com',
				// The real app answers the transport's fetches.
				fetch: ((input: string | URL | Request, init?: RequestInit) =>
					harness.app.request(
						new URL(String(input)).pathname.replace(/^\/c15t/u, ''),
						init
					)) as typeof globalThis.fetch,
				headers: { 'x-c15t-country': 'DE' },
				now: () => NOW,
			});
			const init = await harness.json('GET', '/init', undefined, {
				'x-c15t-country': 'DE',
				'x-c15t-policy-contract': '1',
			});
			choiceFingerprint = (
				init.body.policyResolution as { fingerprints: { choice: string } }
			).fingerprints.choice;
		});

		afterEach(async () => {
			await harness.dispose();
		});

		const evaluationPolicy = () =>
			createEvaluationPolicy({
				choice: { fingerprint: choiceFingerprint, maxAgeMs: 31_536_000_000 },
				gpcDenyCategories: ['marketing'],
				model: 'opt-in',
				notice: { fingerprint: 'notice-fp', maxAgeMs: 31_536_000_000 },
				prompt: 'choice',
				scope: ['marketing', 'measurement'],
				scopeMode: 'strict',
			});

		const receipt = (value: boolean, confirmedAt: number) => ({
			basis: { fingerprint: choiceFingerprint, kind: 'choice-v1' as const },
			confirmedAt,
			value,
		});

		it('carries two partial saves through HTTP and back into the evaluator with their own times', async () => {
			const subjectId = 'sub_roundtrip1';

			const first = await transport.save(
				payload(
					subjectId,
					{
						categories: {
							marketing: receipt(true, T0),
							measurement: receipt(true, T0),
						},
						version: 3,
					},
					{ actionAt: T0, categories: { marketing: true, measurement: true } },
					{
						experience: false,
						functionality: false,
						marketing: true,
						measurement: true,
						necessary: true,
					}
				)
			);
			assert.deepStrictEqual(first, { ok: true, subjectId });

			// The second act confirms marketing only. The complete receipt still
			// carries measurement from T0, but only marketing travels.
			const second = await transport.save(
				payload(
					subjectId,
					{
						categories: {
							marketing: receipt(false, T1),
							measurement: receipt(true, T0),
						},
						version: 3,
					},
					{ actionAt: T1, categories: { marketing: false } },
					{
						experience: false,
						functionality: false,
						marketing: false,
						measurement: true,
						necessary: true,
					}
				)
			);
			assert.deepStrictEqual(second, { ok: true, subjectId });
			assert.strictEqual(await harness.count('consent'), 2);

			const records = await transport.loadSubjectRecord(subjectId);
			assert.isNotNull(records);
			assert.deepStrictEqual(records?.choice, {
				categories: {
					marketing: receipt(false, T1),
					measurement: receipt(true, T0),
				},
				version: 3,
			});
			assert.deepStrictEqual(records?.subject, { subjectId });

			const evaluation = evaluateConsentRecord({
				choice: records?.choice ?? null,
				noticeDismissal: null,
				now: NOW,
				optOuts: records?.optOutDirectives,
				policy: evaluationPolicy(),
			});
			assert.strictEqual(evaluation.permissions.marketing, false);
			assert.strictEqual(evaluation.permissions.measurement, true);
			assert.deepStrictEqual(evaluation.promptRequirement, { kind: 'none' });
			// The measurement grant expires from its own T0, not from the later act.
			assert.strictEqual(
				evaluation.categories.measurement.expiresAt,
				T0 + 31_536_000_000
			);
		});

		it('records a standing privacy directive through the privacy route and the evaluator restricts on it', async () => {
			const subjectId = 'sub_roundtrip2';
			await transport.save(
				payload(
					subjectId,
					{ categories: { marketing: receipt(true, T0) }, version: 3 },
					{ actionAt: T0, categories: { marketing: true } },
					{
						experience: false,
						functionality: false,
						marketing: true,
						measurement: false,
						necessary: true,
					}
				)
			);
			const consentsBefore = await harness.count('consent');

			await transport.recordPrivacyOptOut(
				{ categories: ['marketing'], recordedAt: T1, source: 'gpc' },
				subjectId
			);

			// A privacy request, not a consent: the consent table is untouched.
			assert.strictEqual(await harness.count('consent'), consentsBefore);
			assert.strictEqual(await harness.count('privacyDirective'), 1);

			const records = await transport.loadSubjectRecord(subjectId);
			assert.deepStrictEqual(records?.optOutDirectives, [
				{ categories: ['marketing'], recordedAt: T1, source: 'gpc' },
			]);

			const evaluation = evaluateConsentRecord({
				choice: records?.choice ?? null,
				noticeDismissal: null,
				now: NOW,
				optOuts: records?.optOutDirectives,
				policy: evaluationPolicy(),
			});
			// The explicit grant is intact; the directive restricts on top of it.
			assert.strictEqual(records?.choice?.categories.marketing?.value, true);
			assert.strictEqual(evaluation.permissions.marketing, false);
			assert.deepStrictEqual(evaluation.restrictions.marketing, [
				'opt-out-directive',
			]);
		});

		it('reads a save made by a client without receipts as legacy receipts the evaluator grandfathers', async () => {
			const subjectId = 'sub_roundtrip3';
			// A pre-receipt client sends the legacy HTTP wire, not today's SavePayload.
			const saved = await harness.json('POST', '/subjects', {
				consentAction: 'custom',
				domain: 'example.com',
				givenAt: T0,
				jurisdictionModel: 'opt-in',
				preferences: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
				},
				subjectId,
				type: 'cookie_banner',
				uiSource: 'banner',
			});
			assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));

			const records = await transport.loadSubjectRecord(subjectId);
			assert.deepStrictEqual(records?.choice?.categories.marketing, {
				basis: { kind: 'legacy-v2' },
				confirmedAt: T0,
				value: true,
			});
			assert.deepStrictEqual(records?.choice?.categories.measurement, {
				basis: { kind: 'legacy-v2' },
				confirmedAt: T0,
				value: false,
			});

			const evaluation = evaluateConsentRecord({
				choice: records?.choice ?? null,
				noticeDismissal: null,
				now: NOW,
				policy: evaluationPolicy(),
			});
			// A legacy receipt without a material fingerprint is grandfathered.
			assert.strictEqual(evaluation.categories.marketing.authority, 'valid');
			assert.strictEqual(evaluation.permissions.marketing, true);
			assert.strictEqual(evaluation.permissions.measurement, false);
		});
	}
);
