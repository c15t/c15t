import { afterEach, expect, it, vi } from 'vitest';

import { GET } from '../app/api/integration-fixture/route';

afterEach(() => vi.useRealTimers());

it.each([
	['8000', 8000],
	['999999999999', 15000],
	['-1000', 0],
	['Infinity', 0],
	['NaN', 0],
	['', 0],
])('bounds the iframe fixture delay for %s', async (requested, expected) => {
	vi.useFakeTimers();
	let completed = false;
	const pending = GET(
		new Request(
			`http://localhost/api/integration-fixture?fixture=iframe&delay=${requested}`
		)
	).then((response) => {
		completed = true;
		return response;
	});
	if (expected > 0) {
		await vi.advanceTimersByTimeAsync(expected - 1);
	}
	expect(completed).toBe(false);
	await vi.advanceTimersByTimeAsync(expected > 0 ? 1 : 0);
	expect(completed).toBe(true);
	const response = await pending;
	expect(await response.text()).toContain(
		`Iframe loaded after ${expected / 1000} seconds.`
	);
});
