import { afterEach, describe, expect, it, vi } from 'vitest';

import { initiateDeviceFlow, pollForToken } from '../../auth/device-flow';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('device authorization', () => {
	it('rejects malformed successful responses', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: {
						deviceCode: 'abc',
						expiresIn: 'forever',
						userCode: 'def',
						verificationUri: 'https://example.com',
					},
					success: true,
				})
			)
		);
		await expect(initiateDeviceFlow('https://example.com')).rejects.toThrow(
			'Authentication failed'
		);
	});
	it('applies a request deadline', async () => {
		const fetch = vi.fn().mockResolvedValue(
			Response.json({
				device_code: 'abc',
				expires_in: 900,
				user_code: 'def',
				verification_uri: 'https://example.com',
			})
		);
		vi.stubGlobal('fetch', fetch);
		await initiateDeviceFlow('https://example.com');
		expect(fetch.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);
	});
	it('cancels polling when the caller aborts', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			pollForToken('https://example.com', 'code', 5, 900, controller.signal)
		).rejects.toThrow('Operation cancelled');
	});
	it('exchanges a device code for a validated token', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				Response.json({
					data: { accessToken: 'test-token', tokenType: 'Bearer' },
					success: true,
				})
			)
		);
		await expect(
			pollForToken('https://example.com', 'code', 0.001, 1)
		).resolves.toMatchObject({ access_token: 'test-token' });
	});
});
