import { afterEach, expect, it, vi } from 'vitest';

import { measureAsyncLoop, measureLoop } from './utils';

afterEach(() => {
	vi.restoreAllMocks();
});

it('disposes each synchronous sample without charging cleanup to its duration', () => {
	let clock = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => clock);
	const cleanup = vi.fn(() => {
		clock += 100;
	});
	const samples = measureLoop(
		2,
		() => {
			clock += 5;
			return 'resource';
		},
		cleanup
	);
	expect(samples).toEqual([5000, 5000]);
	expect(cleanup).toHaveBeenCalledTimes(2);
	expect(cleanup).toHaveBeenCalledWith('resource');
});

it('disposes each asynchronous sample after timing the completed operation', async () => {
	let clock = 0;
	vi.spyOn(performance, 'now').mockImplementation(() => clock);
	const cleanup = vi.fn(() => {
		clock += 100;
	});
	const samples = await measureAsyncLoop(
		2,
		() => {
			clock += 5;
			return Promise.resolve('resource');
		},
		cleanup
	);
	expect(samples).toEqual([5000, 5000]);
	expect(cleanup).toHaveBeenCalledTimes(2);
});
