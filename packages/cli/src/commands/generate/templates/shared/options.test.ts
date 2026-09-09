import { runInNewContext } from 'node:vm';

import { describe, expect, test, vi } from 'vitest';

import { generateOptionsText } from './options';

interface GeneratedTransport {
	init: () => Promise<unknown>;
	save: (payload: Readonly<Record<string, unknown>>) => Promise<unknown>;
}

const customTransport = (fetchMock: ReturnType<typeof vi.fn>) =>
	(
		runInNewContext(`({${generateOptionsText('custom', '/api/consent')}})`, {
			custom: (transport: GeneratedTransport) => transport,
			fetch: fetchMock,
		}) as { mode: GeneratedTransport }
	).mode;

describe('generateOptionsText', () => {
	test('custom transport preserves canonical init and original save records', async () => {
		const init = { policyResolution: { status: 'unconfigured', version: 1 } };
		const result = { ok: true, subjectId: 'literal+subject' };
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify(init)))
			.mockResolvedValueOnce(new Response(JSON.stringify(result)));
		const transport = customTransport(fetchMock);
		expect(await transport.init()).toEqual(init);
		const payload = {
			actionAt: 1_780_000_000_000,
			records: { choice: { categories: { marketing: { value: false } } } },
		};
		expect(await transport.save(payload)).toEqual(result);
		expect(fetchMock.mock.calls[0]?.[1].headers).toEqual({
			'x-c15t-policy-contract': '1',
		});
		expect(JSON.parse(fetchMock.mock.calls[1]?.[1].body)).toEqual(payload);
	});

	test('custom transport rejects failed HTTP initialization and saves', async () => {
		const transport = customTransport(
			vi
				.fn()
				.mockImplementation(() =>
					Promise.resolve(new Response('{}', { status: 503 }))
				)
		);
		await expect(transport.init()).rejects.toThrow(
			'Consent initialization failed'
		);
		await expect(transport.save({})).rejects.toThrow('Consent save failed');
	});

	test('offline starter explicitly requires a choice before optional processing', () => {
		const options = runInNewContext(`({${generateOptionsText('offline')}})`, {
			offline: (value: unknown) => value,
		}) as { mode: { policyRules: object[] } };
		expect(options.mode.policyRules).toEqual([
			expect.objectContaining({
				match: { fallback: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'strict',
			}),
		]);
	});
});
