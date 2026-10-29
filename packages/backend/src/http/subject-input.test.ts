/**
 * What the subject write routes accept, through the HTTP surface on every
 * engine: JSON bodies only, a bounded `domain` limited by `allowedDomains`
 * when set, and identity links limited to verified ones under
 * `identityToken.requireVerifiedLinks`. A refused request writes nothing.
 */

import { SignJWT } from 'jose';
import { afterEach, assert, beforeEach, describe, it } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const API_KEY = 'sk_subject_input';
const SIGNING_KEY = 'identity-signing-key-for-subject-input-tests';

const save = {
	domain: 'example.com',
	givenAt: 1_700_000_000_000,
	preferences: { measurement: true, necessary: true },
	subjectId: 'sub_input1',
	type: 'cookie_banner',
};

/** An identity token as `@c15t/node-sdk`'s `createIdentityToken` signs it. */
const tokenFor = (externalId: string) =>
	new SignJWT({})
		.setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
		.setIssuer('c15t')
		.setAudience('c15t-identity')
		.setSubject(externalId)
		.setIssuedAt()
		.setExpirationTime(Math.floor(Date.now() / 1000) + 600)
		.sign(new TextEncoder().encode(SIGNING_KEY));

for (const engine of ENGINES) {
	describe(`subject write input (${engine.name})`, () => {
		let harness: HttpHarness;

		beforeEach(async () => {
			harness = await createHttpHarness(engine, { apiKeys: [API_KEY] });
		});

		afterEach(async () => {
			await harness.dispose();
		});

		const written = async () => ({
			consents: await harness.count('consent'),
			domains: await harness.count('domain'),
			subjects: await harness.count('subject'),
		});
		const nothing = { consents: 0, domains: 0, subjects: 0 };

		describe('JSON bodies only', () => {
			it.each([
				['text/plain', { 'Content-Type': 'text/plain;charset=UTF-8' }],
				['a form', { 'Content-Type': 'application/x-www-form-urlencoded' }],
				['no type', {}],
			])('refuses a save sent as %s', async (_label, headers) => {
				const response = await harness.app.request('/subjects', {
					// Bytes, so the request carries no type unless one is set.
					body: new TextEncoder().encode(JSON.stringify(save)),
					headers,
					method: 'POST',
				});

				assert.strictEqual(response.status, 415);
				assert.strictEqual(
					(await response.json()).cause.code,
					'UNSUPPORTED_MEDIA_TYPE'
				);
				assert.deepStrictEqual(await written(), nothing);
			});

			it('refuses a link sent as text/plain before creating the subject', async () => {
				const response = await harness.app.request('/subjects/sub_input1', {
					body: JSON.stringify({ externalId: 'ext_1' }),
					headers: {
						Authorization: `Bearer ${API_KEY}`,
						'Content-Type': 'text/plain',
					},
					method: 'PATCH',
				});

				assert.strictEqual(response.status, 415);
				assert.deepStrictEqual(await written(), nothing);
			});

			it('accepts JSON with a charset', async () => {
				const response = await harness.app.request('/subjects', {
					body: JSON.stringify(save),
					headers: { 'Content-Type': 'application/json; charset=utf-8' },
					method: 'POST',
				});

				assert.strictEqual(response.status, 200, await response.clone().text());
			});
		});

		describe('domain', () => {
			it.each([
				['empty', ''],
				['longer than a host name', `${'a'.repeat(250)}.com`],
				['carrying a control character', 'example.com\nforged-line'],
			])('refuses a domain that is %s', async (_label, domain) => {
				const saved = await harness.json('POST', '/subjects', {
					...save,
					domain,
				});

				assert.strictEqual(saved.status, 400);
				assert.deepStrictEqual(saved.body.cause, {
					code: 'INPUT_VALIDATION_FAILED',
				});
				assert.deepStrictEqual(await written(), nothing);
			});

			it('records any domain when allowedDomains is unset', async () => {
				const saved = await harness.json('POST', '/subjects', {
					...save,
					domain: 'anything.example.net',
				});

				assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
			});

			describe('with allowedDomains', () => {
				const restricted = () =>
					harness.appWith({
						allowedDomains: ['example.com', '*.example.org'],
						apiKeys: [API_KEY],
					});

				it.each([
					['an exact entry', 'example.com'],
					['the www. host of an entry', 'www.example.com'],
					['a subdomain under a wildcard entry', 'shop.example.org'],
				])('records a save for %s', async (_label, domain) => {
					const saved = await harness.json(
						'POST',
						'/subjects',
						{ ...save, domain },
						{},
						restricted()
					);

					assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
					assert.strictEqual(saved.body.domain, domain);
				});

				it.each([
					['a domain no entry names', 'other.example.net'],
					['the apex of a wildcard entry', 'example.org'],
					['a value that is not a bare host', 'example.com/extra'],
				])('refuses %s and writes nothing', async (_label, domain) => {
					const saved = await harness.json(
						'POST',
						'/subjects',
						{ ...save, domain },
						{},
						restricted()
					);

					assert.strictEqual(saved.status, 400);
					assert.deepStrictEqual(saved.body.cause, {
						code: 'DOMAIN_NOT_ALLOWED',
					});
					assert.deepStrictEqual(await written(), nothing);
				});

				it('refuses an empty list at startup', () => {
					assert.throws(
						() => harness.appWith({ allowedDomains: [] }),
						/allowedDomains is empty/u
					);
				});
			});
		});

		describe('identityToken.requireVerifiedLinks', () => {
			const strict = () =>
				harness.appWith({
					apiKeys: [API_KEY],
					identityToken: {
						requireVerifiedLinks: true,
						signingKey: SIGNING_KEY,
					},
				});

			const externalIdOf = async (subjectId: string) => {
				const read = await harness.json('GET', `/subjects/${subjectId}`);
				return (read.body.subject as { externalId?: string }).externalId;
			};

			it('refuses an unproved link, and creates no subject', async () => {
				const linked = await harness.json(
					'PATCH',
					'/subjects/sub_strict1',
					{ externalId: 'ext_1' },
					{},
					strict()
				);

				assert.strictEqual(linked.status, 401);
				assert.deepStrictEqual(linked.body.cause, {
					code: 'IDENTITY_TOKEN_REQUIRED',
				});
				assert.deepStrictEqual(await written(), nothing);
			});

			it('links with an API key or an identity token', async () => {
				const app = strict();
				const byKey = await harness.json(
					'PATCH',
					'/subjects/sub_strict2',
					{ externalId: 'ext_2' },
					{ Authorization: `Bearer ${API_KEY}` },
					app
				);
				const byToken = await harness.json(
					'PATCH',
					'/subjects/sub_strict3',
					{ externalId: 'ext_3', identityToken: await tokenFor('ext_3') },
					{},
					app
				);

				assert.strictEqual(byKey.status, 200, JSON.stringify(byKey.body));
				assert.strictEqual(byToken.status, 200, JSON.stringify(byToken.body));
				assert.strictEqual(await externalIdOf('sub_strict2'), 'ext_2');
				assert.strictEqual(await externalIdOf('sub_strict3'), 'ext_3');
			});

			it('still refuses a token that does not verify as invalid', async () => {
				const linked = await harness.json(
					'PATCH',
					'/subjects/sub_strict4',
					{ externalId: 'ext_4', identityToken: await tokenFor('ext_other') },
					{},
					strict()
				);

				assert.strictEqual(linked.status, 401);
				assert.deepStrictEqual(linked.body.cause, {
					code: 'IDENTITY_TOKEN_INVALID',
				});
			});

			it('records a save without its unproved link', async () => {
				const saved = await harness.json(
					'POST',
					'/subjects',
					{ ...save, externalSubjectId: 'ext_5', subjectId: 'sub_strict5' },
					{},
					strict()
				);

				// The consent is a legal record and is kept; the link is not.
				assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
				assert.strictEqual(await harness.count('consent'), 1);
				assert.isUndefined(await externalIdOf('sub_strict5'));
			});

			it('records a save with a link its token proves', async () => {
				const saved = await harness.json(
					'POST',
					'/subjects',
					{
						...save,
						externalSubjectId: 'ext_6',
						identityToken: await tokenFor('ext_6'),
						subjectId: 'sub_strict6',
					},
					{},
					strict()
				);

				assert.strictEqual(saved.status, 200, JSON.stringify(saved.body));
				assert.strictEqual(await externalIdOf('sub_strict6'), 'ext_6');
			});

			it('stores unproved links when unset, as before', async () => {
				const linked = await harness.json('PATCH', '/subjects/sub_strict7', {
					externalId: 'ext_7',
				});

				assert.strictEqual(linked.status, 200, JSON.stringify(linked.body));
				assert.strictEqual(await externalIdOf('sub_strict7'), 'ext_7');
			});

			it('refuses a setting that is not a boolean at startup', () => {
				assert.throws(
					() =>
						harness.appWith({
							identityToken: {
								requireVerifiedLinks: 'true' as unknown as boolean,
							},
						}),
					/requireVerifiedLinks must be a boolean/u
				);
			});
		});
	});
}
