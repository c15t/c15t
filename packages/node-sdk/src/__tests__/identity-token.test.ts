import { describe, expect, it } from 'vitest';

import { createIdentityToken } from '../index';

const decodePayload = (token: string): Record<string, unknown> => {
	const [, payload = ''] = token.split('.');
	return JSON.parse(
		Buffer.from(payload, 'base64url').toString('utf8')
	) as Record<string, unknown>;
};

describe('createIdentityToken', () => {
	it('names the user in sub and expires after ttlSeconds', async () => {
		const token = await createIdentityToken(
			{ externalId: 'user_1', identityProvider: 'clerk' },
			{ now: () => 1_700_000_000_000, signingKey: 'key', ttlSeconds: 60 }
		);

		expect(decodePayload(token)).toEqual({
			aud: 'c15t-identity',
			exp: 1_700_000_060,
			iat: 1_700_000_000,
			idp: 'clerk',
			iss: 'c15t',
			sub: 'user_1',
		});
	});

	it('leaves idp out when no provider is given', async () => {
		const token = await createIdentityToken(
			{ externalId: 'user_1' },
			{ signingKey: 'key' }
		);

		expect(decodePayload(token)).not.toHaveProperty('idp');
	});

	it.each([
		[{ externalId: '' }, { signingKey: 'key' }],
		[{ externalId: 'user_1' }, { signingKey: '' }],
		[{ externalId: 'user_1' }, { signingKey: 'key', ttlSeconds: 0 }],
		[{ externalId: 'user_1' }, { signingKey: 'key', ttlSeconds: 1.5 }],
	])('rejects %j with %j', async (user, options) => {
		await expect(createIdentityToken(user, options)).rejects.toThrow(TypeError);
	});
});
