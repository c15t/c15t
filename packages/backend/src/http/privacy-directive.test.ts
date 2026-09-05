/**
 * Privacy directives through the HTTP surface, on every engine.
 *
 * What these pin: a directive is recorded without a consent row, without a
 * consent audit entry and without touching the consent-saving route; it
 * survives later saves; it reaches only the subject that asserted it unless
 * an authenticated caller asserted it for an identity; and a browser that
 * links itself to someone else's external id can neither push a directive
 * onto that person nor read theirs.
 */

import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const API_KEY = 'sk_privacy';
const T0 = 1_700_000_000_000;
const authed = { Authorization: `Bearer ${API_KEY}` };

const directive = { categories: ['marketing'], recordedAt: T0, source: 'gpc' };

const save = (subjectId: string) => ({
	domain: 'example.com',
	givenAt: T0,
	preferences: { marketing: true, necessary: true },
	subjectId,
	type: 'cookie_banner',
});

for (const engine of ENGINES) {
	describe(`privacy directives over HTTP (${engine.name})`, () => {
		let harness: HttpHarness;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, {
				apiKeys: [API_KEY],
				manifest: { appName: 'Privacy' },
				tenantId: 'tenant_p',
			});
			// A subject has to exist before it can assert a directive; the
			// consent-saving route is how subjects come to exist for a device.
			await harness.json('POST', '/subjects', save('sub_gpc1'));
		});

		afterEach(async () => {
			await harness.dispose();
		});

		it('records a directive for a subject without writing consent', async () => {
			const consentsBefore = await harness.count('consent');
			const recorded = await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive,
				{ 'sec-gpc': '1' }
			);
			assert.strictEqual(recorded.status, 200, JSON.stringify(recorded.body));
			assert.strictEqual(recorded.body.ok, true);
			assert.strictEqual(recorded.body.created, true);
			assert.deepStrictEqual(recorded.body.directive, {
				authority: 'subject',
				categories: ['marketing'],
				id: (recorded.body.directive as { id: string }).id,
				recordedAt: T0,
				signalHeader: true,
				source: 'gpc',
			});

			// No consent row, no decision, no consent audit entry.
			assert.strictEqual(await harness.count('consent'), consentsBefore);
			assert.strictEqual(await harness.count('runtimePolicyDecision'), 0);
			assert.strictEqual(
				await harness.count('auditLog', {
					column: 'actionType',
					value: 'consent_given',
				}),
				1
			);
			assert.strictEqual(
				await harness.count('auditLog', {
					column: 'actionType',
					value: 'privacy_opt_out_recorded',
				}),
				1
			);
		});

		it('records the same request once and notes when the signal header was absent', async () => {
			const first = await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive
			);
			const replay = await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive
			);
			assert.strictEqual(first.body.created, true);
			assert.strictEqual(replay.body.created, false);
			assert.strictEqual(
				(replay.body.directive as { signalHeader: boolean }).signalHeader,
				false
			);
			assert.strictEqual(await harness.count('privacyDirective'), 1);
		});

		it('is readable by the subject and survives a later consent save', async () => {
			await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive
			);
			// An ordinary save later must not remove the standing directive.
			const later = await harness.json('POST', '/subjects', {
				...save('sub_gpc1'),
				givenAt: T0 + 1000,
			});
			assert.strictEqual(later.status, 200);

			const listed = await harness.json(
				'GET',
				'/subjects/sub_gpc1/privacy-directives'
			);
			assert.strictEqual(listed.status, 200);
			assert.strictEqual((listed.body.directives as unknown[]).length, 1);

			const subject = await harness.json('GET', '/subjects/sub_gpc1');
			assert.strictEqual(
				(subject.body.privacyDirectives as unknown[]).length,
				1
			);
		});

		it('rejects a malformed directive, a future one and an unknown subject', async () => {
			const malformed = await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				{ ...directive, categories: ['necessary'] }
			);
			assert.strictEqual(malformed.status, 400);

			const future = await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				{ ...directive, recordedAt: Date.now() + 60_000 }
			);
			assert.strictEqual(future.status, 400);

			const unknown = await harness.json(
				'POST',
				'/subjects/sub_nobody/privacy-directives',
				directive
			);
			assert.strictEqual(unknown.status, 404);
			assert.strictEqual(await harness.count('privacyDirective'), 0);
		});

		it('never lets a browser-asserted link carry a directive to another profile', async () => {
			// The victim: a second subject legitimately linked to an identity by
			// the authenticated path.
			await harness.json('POST', '/subjects', save('sub_victim1'));
			await harness.json(
				'PATCH',
				'/subjects/sub_victim1',
				{ externalId: 'person-42', identityProvider: 'idp' },
				authed
			);

			// The attacker: links its own subject to the victim's identity through
			// the public route, then records a directive for itself.
			await harness.json('PATCH', '/subjects/sub_gpc1', {
				externalId: 'person-42',
				identityProvider: 'idp',
			});
			await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive
			);

			const victim = await harness.json(
				'GET',
				'/subjects/sub_victim1/privacy-directives'
			);
			assert.deepStrictEqual(victim.body.directives, []);
		});

		it('never lets a browser-asserted link read identity-level directives', async () => {
			// An authenticated caller asserts a directive for the identity.
			const identity = await harness.json(
				'POST',
				'/privacy-directives',
				{ ...directive, externalId: 'person-42', identityProvider: 'idp' },
				authed
			);
			assert.strictEqual(identity.status, 200, JSON.stringify(identity.body));

			// A browser claims that identity for its own subject.
			await harness.json('PATCH', '/subjects/sub_gpc1', {
				externalId: 'person-42',
				identityProvider: 'idp',
			});
			const spoofed = await harness.json(
				'GET',
				'/subjects/sub_gpc1/privacy-directives'
			);
			assert.deepStrictEqual(spoofed.body.directives, []);

			// The same subject, linked through the authenticated path, sees it.
			await harness.json(
				'PATCH',
				'/subjects/sub_gpc1',
				{ externalId: 'person-42', identityProvider: 'idp' },
				authed
			);
			const trusted = await harness.json(
				'GET',
				'/subjects/sub_gpc1/privacy-directives'
			);
			assert.strictEqual((trusted.body.directives as unknown[]).length, 1);
			assert.strictEqual(
				(trusted.body.directives as { authority: string }[])[0]?.authority,
				'api'
			);
		});

		it('applies an identity directive to every trusted profile of that identity, and only that identity', async () => {
			await harness.json('POST', '/subjects', save('sub_second1'));
			await harness.json(
				'PATCH',
				'/subjects/sub_gpc1',
				{ externalId: 'person-42', identityProvider: 'idp' },
				authed
			);
			await harness.json(
				'PATCH',
				'/subjects/sub_second1',
				{ externalId: 'person-42', identityProvider: 'other-idp' },
				authed
			);

			const recorded = await harness.json(
				'POST',
				'/privacy-directives',
				{ ...directive, externalId: 'person-42', identityProvider: 'idp' },
				authed
			);
			assert.strictEqual(recorded.body.subjects, 1);

			const first = await harness.json(
				'GET',
				'/subjects/sub_gpc1/privacy-directives'
			);
			assert.strictEqual((first.body.directives as unknown[]).length, 1);
			// Same externalId, different provider: a different identity.
			const second = await harness.json(
				'GET',
				'/subjects/sub_second1/privacy-directives'
			);
			assert.deepStrictEqual(second.body.directives, []);

			const byIdentity = await harness.json(
				'GET',
				'/privacy-directives?externalId=person-42&identityProvider=idp',
				undefined,
				authed
			);
			assert.strictEqual((byIdentity.body.directives as unknown[]).length, 1);
		});

		it('requires an API key for identity-level directives', async () => {
			const write = await harness.json('POST', '/privacy-directives', {
				...directive,
				externalId: 'person-42',
				identityProvider: 'idp',
			});
			assert.strictEqual(write.status, 401);
			const read = await harness.json(
				'GET',
				'/privacy-directives?externalId=person-42&identityProvider=idp'
			);
			assert.strictEqual(read.status, 401);
			assert.strictEqual(await harness.count('privacyDirective'), 0);
		});

		it('is invisible to another tenant', async () => {
			await harness.json(
				'POST',
				'/subjects/sub_gpc1/privacy-directives',
				directive
			);
			const other = harness.appWith({
				apiKeys: [API_KEY],
				tenantId: 'tenant_q',
			});
			const read = await harness.json(
				'GET',
				'/subjects/sub_gpc1/privacy-directives',
				undefined,
				{},
				other
			);
			assert.strictEqual(read.status, 404);
		});
	});
}
